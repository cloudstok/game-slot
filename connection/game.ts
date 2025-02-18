import type { Namespace, Socket } from "socket.io";
import crypto, { randomUUID } from "crypto";
import type { IBetObject, IMatchData, IPlayerDetails } from "../interfaces/userObj";
import { SlotUtility } from "./utility";
import { BetResult } from "../module/betResult";
import { config } from "dotenv";
import { GS } from "./gsConstants";
import { updateBalanceFromAccount, generateUUIDv7 } from "../utility/v2Transactions";

config({ path: ".env" });

export class SlotMachine {
  io: Namespace;
  reels: number[];
  //   once assigned load this config on redis and access all the properties from there
  config: any;

  constructor(serverSocket: Namespace) {
    this.io = serverSocket;
    this.reels = new Array(15);

    while (!this.config) {
      this.config = new GS();
    }

    this.io.on("connection", this.onConnect.bind(this));
  }

  async onConnect(socket: Socket) {
    console.log(socket.id, " connected ", socket.data);
    // console.log(GS.GAME_SETTINGS);

    if (socket.data?.info?.bl < GS.GAME_SETTINGS?.join_amt)
      socket.emit("400", "balance low, cannot play the match");

    socket.data["info"] = {
      ...socket.data?.info,
      sid: socket.id,
      rmid: crypto.randomUUID(),
      bl: parseFloat(socket.data?.info?.bl),
    } as IMatchData;
    socket.data.matches = 0;

    socket.join(socket.data?.info?.rmid);
    socket.emit("200", socket.data.info);
    socket.emit("info", { bl: socket.data.info.bl });

    socket.on("spin", this.onSpinReels.bind(this, socket));
  }

  async onSpinReels(socket: Socket, data: any) {
    console.log("-----------------spin start--------------");

    if (!GS.GAME_SETTINGS) {
      socket.emit("400", "unable to load game settings");
      return;
    }

    this.reels = SlotUtility.generateReels(15, 7);
    socket.data.info.mthId = crypto.randomUUID();

    if (!data.betAmt) {
      socket.emit("400", "bet amount not sent");
      return;
    }
    data.betAmt = parseFloat(data.betAmt);

    if (
      data.betAmt > GS.GAME_SETTINGS?.max_bet ||
      data.betAmt < GS.GAME_SETTINGS?.min_bet
    ) {
      socket.emit("400", "invalid bet amount");
      return;
    }

    if (Number(socket.data?.info?.bl) - Number(data.betAmt) < 0) {
      socket.emit("400", "not enough balance to place this bet");
      return;
    }

    let playerState: IMatchData = {
      ...socket.data.info,
      bl: socket.data?.info?.bl - data?.betAmt,
      reels: this.reels,
      betAmt: data.betAmt ?? 10,
      winCombos: [],
    };

    const dbtTxnObj: IBetObject = {
      id: playerState.mthId, // Unique bet or round ID
      bet_amount: data.betAmt,
      game_id: socket.data.game_id,
      user_id: playerState.urId,
      ip: socket.data.ip,
    };

    console.log("------------------debit obj----------", dbtTxnObj);

    const playerDetailsForTxn: IPlayerDetails = {
      game_id: socket.data.game_id,
      operatorId: socket.data.info.operatorId,
      token: socket.data.token,
    };

    let dbtTxnRes = await updateBalanceFromAccount(dbtTxnObj,"DEBIT",playerDetailsForTxn);
console.log("-------------",dbtTxnRes);
    if (!dbtTxnRes) {
      socket.emit("400", "unable to process transaction");
      return;
    }

    socket.emit("info", { bl: playerState.bl });

    // must create a transaction insertion db call

    const matchedIndices = new Set<number>();

    GS.winningCombinations5Match.forEach((idxArr: number[]) => {
      const data = SlotUtility.checkForFive(this.reels, idxArr);
      if (data?.cmbNm?.length) {
        data.cmbPyt = SlotUtility.calculatePayout(data, playerState.betAmt);
        playerState["winCombos"].push(data);
        idxArr.forEach((i) => matchedIndices.add(i));
      }
    });

    GS.winningCombinations4Match.forEach((idxArr: number[]) => {
      if (!idxArr.every((i) => matchedIndices.has(i))) {
        const data = SlotUtility.checkForFour(this.reels, idxArr);
        if (data?.cmbNm?.length) {
          data.cmbPyt = SlotUtility.calculatePayout(data, playerState.betAmt);
          playerState["winCombos"].push(data);
          idxArr.forEach((i) => matchedIndices.add(i));
        }
      }
    });

    GS.winningCombinations3Match.forEach((idxArr: number[]) => {
      if (!idxArr.every((i) => matchedIndices.has(i))) {
        const data = SlotUtility.checkForThree(this.reels, idxArr);
        if (data?.cmbNm?.length) {
          data.cmbPyt = SlotUtility.calculatePayout(data, playerState.betAmt);
          playerState["winCombos"].push(data);
        }
      }
    });

    const specificCombo = [7, 3, 9];
    let specificComboCount = 0;
    playerState.winCombos.forEach((comb) =>
      comb.cmbIdx.includes(7) &&
      comb.cmbIdx.includes(3) &&
      comb.cmbIdx.includes(9)
        ? specificComboCount++
        : specificComboCount
    );

    if (
      !specificCombo.every((i) => matchedIndices.has(i)) &&
      !specificComboCount
    ) {
      const data = SlotUtility.checkForThree(this.reels, specificCombo);
      if (data?.cmbNm?.length) {
        data.cmbPyt = SlotUtility.calculatePayout(data, playerState.betAmt);
        playerState["winCombos"].push(data);
      }
    }

    playerState.win = playerState.winCombos.length > 0;

    if (playerState.win) {
      playerState.payout = playerState.winCombos.reduce(
        // @ts-ignore
        (acc, winCombo) => acc + winCombo.cmbPyt,
        0
      );

      if (playerState.payout > GS.GAME_SETTINGS.max_payout)
        playerState.payout = GS.GAME_SETTINGS.max_payout;

      playerState.bl = playerState.bl + playerState.payout;
    }

    socket.data.info.bl = playerState.bl;
    socket.data.matches++;

    let txnId = randomUUID();
    const betResultObj = {
      player_id: playerState.urId,
      token: socket.data?.token ?? "token",
      match_id: playerState.mthId,
      room_id: playerState.rmId || socket.data?.info.rmid,
      transaction_id: txnId,
      game_settings_id: process.env.GAME_SETTINGS_ID || 2,
      round_no: socket.data?.matches,
      bet_amt: playerState.betAmt,
      won_amt: playerState?.payout ?? 0,
      status: playerState?.win ? "WIN" : "LOSS",
      reels: playerState.reels,
      result: playerState.winCombos,
      operator_id: socket.data.info.operatorId,
    };
    let id = await BetResult.create(betResultObj);
    

    let cdtObj: IBetObject = {
      id: playerState.mthId,
      user_id: playerState.urId,
      game_id: socket.data.game_id,
      bet_amount: playerState.betAmt,
      winning_amount: playerState.payout,
      // @ts-ignore
      txn_id: dbtTxnRes.txn_id,
      ip:
        // @ts-ignore
        socket.handshake.headers?.["x-forwarded-for"]?.split(",")[0].trim() ||
        socket.handshake.address,
    };

    if (playerState.win) {
      let cdtTxn: any = await updateBalanceFromAccount(cdtObj, "CREDIT", {
        game_id: socket.data.game_id,
        operatorId: socket.data.info.operatorId,
        token: socket.data.token,
      });

      if (!cdtTxn)
        return socket.emit("error", {
          message: "unble to perform credit transaction, cashout unsuccessful",
          playerState,
        });
    }

    // save playerState before transforming the reels to 2d array
    playerState.reels = SlotUtility.transformReels(playerState.reels);
    socket.emit("200", playerState);
    setTimeout(() => {
      socket.emit("info", { bl: playerState.bl });
    }, 4000);
  }
}
