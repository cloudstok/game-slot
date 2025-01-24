import type { Namespace, Socket } from "socket.io";
import crypto, { randomUUID } from "crypto";
import type { IMatchData } from "../interfaces/userObj";
import { SlotUtility } from "./utility";
import { BetResult } from "../module/betResult";
import { config } from "dotenv";
import { GS } from "./gsConstants";
import { processTransaction, writeInLogs } from "../utility/transaction";

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
    console.log(GS.GAME_SETTINGS);

    if (socket.data?.info?.bl < GS.GAME_SETTINGS?.join_amt)
      socket.emit("400", "balance low, cannot play the match");

    socket.data["info"] = {
      ...socket.data?.info,
      sid: socket.id,
      rmid: crypto.randomUUID(),
      bl: parseFloat(socket.data?.info?.bl),
      mthId: crypto.randomUUID(),
    } as IMatchData;
    socket.data.matches = 0;

    socket.join(socket.data?.info?.rmid);
    socket.emit("200", socket.data.info);

    socket.on("spin", this.onSpinReels.bind(this, socket));
  }

  async onSpinReels(socket: Socket, data: any) {
    console.log("-----------------spin start--------------");
    this.reels = SlotUtility.generateReels(15, 7);

    if (!data.betAmt) {
      socket.emit("400", "bet amount not sent");
      return;
    }
    data.betAmt = parseFloat(data.betAmt);
    console.log("GAME SETTINGS:", JSON.stringify(GS.GAME_SETTINGS));
    console.log("data------", data);

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

    let debitTxnId = randomUUID();

    let y = await processTransaction({
      matchId: socket.data?.info?.mthId,
      token: socket.data?.token,
      userId: playerState.urId,
      amount: playerState.betAmt,
      roomId: parseInt(playerState.rmId),
      operatorId: process.env.OPERATOR_ID,
      txnId: debitTxnId,
      type: "DEBIT",
    });

    if (!y) {
      socket.emit("400", "unable to process transaction");
      return;
    }

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
      if (!idxArr.some((i) => matchedIndices.has(i))) {
        const data = SlotUtility.checkForFour(this.reels, idxArr);
        if (data?.cmbNm?.length) {
          data.cmbPyt = SlotUtility.calculatePayout(data, playerState.betAmt);
          playerState["winCombos"].push(data);
          idxArr.forEach((i) => matchedIndices.add(i));
        }
      }
    });

    GS.winningCombinations3Match.forEach((idxArr: number[]) => {
      if (!idxArr.some((i) => matchedIndices.has(i))) {
        const data = SlotUtility.checkForThree(this.reels, idxArr);
        if (data?.cmbNm?.length) {
          data.cmbPyt = SlotUtility.calculatePayout(data, playerState.betAmt);
          playerState["winCombos"].push(data);
        }
      }
    });

    playerState.win = playerState.winCombos.length > 0;

    if (playerState.win) {
      playerState.payout = playerState.winCombos.reduce(
        // @ts-ignore
        (acc, winCombo) => acc + winCombo.cmbPyt,
        0
      );
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
    };
    console.log(betResultObj);
    let id = await BetResult.create(betResultObj);
    if (id)
      await writeInLogs(
        "logs/bet_result_logs.jsonl",
        JSON.stringify(betResultObj)
      );

    let transactionObj = {
      matchId: playerState.mthId,
      userId: playerState.urId,
      token: socket.data?.token,
      amount: 0,
      roomId: parseInt(playerState.rmId),
      operatorId: process.env.OPERATOR_ID || "20",
      txnId: txnId,
      type: "",
      txnRefId: "",
      bet_result_id: id,
    };

    if (playerState.win) {
      transactionObj.amount = playerState.payout;
      transactionObj.type = "CREDIT";
      transactionObj.txnRefId = debitTxnId;
      let x = await processTransaction(transactionObj);
      console.log("x", x);
    }

    console.log("socket.data", socket.data);

    // save playerState before transforming the reels to 2d array
    playerState.reels = SlotUtility.transformReels(playerState.reels);
    socket.emit("200", playerState);
  }
}
