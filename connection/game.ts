import type { Namespace, Socket } from "socket.io";
import crypto, { randomUUID } from "crypto";
import type { IBetObject, IMatchData, IPlayerDetails, IWinCombos } from "../interfaces/userObj";
import { BetResult } from "../module/betResult";
import { config } from "dotenv";
import { GAME_SETTINGS } from "./gsConstants";
import { updateBalanceFromAccount } from "../utility/v2Transactions";
import { redisClient } from "../cache/redis"; // Import Redis client

config({ path: ".env" });

const GAME_NAME = process.env.GAME_NAME || "SPINX"; // Define game name from env

export class SlotMachine {
  io: Namespace;
  reels: number[];
  config: any;
  redisKey: any;

  constructor(serverSocket: Namespace) {
    this.io = serverSocket;
    this.reels = new Array(15);
    this.config = GAME_SETTINGS;
    this.io.on("connection", this.onConnect.bind(this));
  }

  async onConnect(socket: Socket) {
    console.log(socket.id, " connected ", socket.data);

    if (socket.data?.info?.bl < GAME_SETTINGS?.join_amt) {
      socket.emit("400", "balance low, cannot play the match");
      return;
    }

    this.redisKey = `GM:${GAME_NAME}:PL:${socket.data.info.urId}`;

    const playerData: IMatchData = {
      ...socket.data?.info,
      sid: socket.id,
      bl: Number(socket.data?.info?.bl),
    };

    socket.data.matches = 0;

    // Store in Redis using the defined key
    await redisClient.setDataToRedis(this.redisKey, playerData);

    socket.emit("200", playerData);
    socket.emit("info", { bl: playerData.bl });

    socket.on("spin", this.onSpinReels.bind(this, socket));
  }

  async onSpinReels(socket: Socket, data: any) {
    console.log("-----------------spin start--------------");

    if (!GAME_SETTINGS) {
      socket.emit("400", "unable to load game settings");
      return;
    }

    if (!this.redisKey) this.redisKey = `GM:${GAME_NAME}:PL:${socket.data.info.urId}`;
    let playerState: IMatchData = await redisClient.getDataFromRedis(this.redisKey);
    if (!playerState) {
      socket.emit("400", "session expired");
      return;
    }

    this.reels = this.generateReels(15, 7);
    playerState.mthId = crypto.randomUUID();

    if (!data.betAmt) {
      socket.emit("400", "bet amount not sent");
      return;
    }
    data.betAmt = Number(data.betAmt);

    if (data.betAmt > GAME_SETTINGS?.max_bet || data.betAmt < GAME_SETTINGS?.min_bet) {
      socket.emit("400", "invalid bet amount");
      return;
    }

    if (Number(playerState.bl) - Number(data.betAmt) < 0) {
      socket.emit("400", "not enough balance to place this bet");
      return;
    }

    playerState.bl -= data.betAmt;
    playerState.reels = this.reels;
    playerState.betAmt = data.betAmt ?? 10;
    playerState.winCombos = [];

    const dbtTxnObj: IBetObject = {
      id: playerState.mthId,
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

    let dbtTxnRes: any = await updateBalanceFromAccount(dbtTxnObj, "DEBIT", playerDetailsForTxn);
    if (!dbtTxnRes) {
      socket.emit("400", "unable to process transaction");
      return;
    }

    socket.emit("info", { bl: playerState.bl });

    const matchedIndices = new Set<number>();

    GAME_SETTINGS.winningCombinations5Match.forEach((idxArr: number[]) => {
      const data = this.checkForFive(this.reels, idxArr);
      if (data?.cmbNm?.length) {
        data.cmbPyt = this.calculatePayout(data, playerState.betAmt);
        playerState.winCombos.push(data);
        idxArr.forEach((i) => matchedIndices.add(i));
      }
    });

    GAME_SETTINGS.winningCombinations4Match.forEach((idxArr: number[]) => {
      if (!idxArr.every((i) => matchedIndices.has(i))) {
        const data = this.checkForFour(this.reels, idxArr);
        if (data?.cmbNm?.length) {
          data.cmbPyt = this.calculatePayout(data, playerState.betAmt);
          playerState.winCombos.push(data);
          idxArr.forEach((i) => matchedIndices.add(i));
        }
      }
    });

    GAME_SETTINGS.winningCombinations3Match.forEach((idxArr: number[]) => {
      if (!idxArr.every((i) => matchedIndices.has(i))) {
        const data = this.checkForThree(this.reels, idxArr);
        if (data?.cmbNm?.length) {
          data.cmbPyt = this.calculatePayout(data, playerState.betAmt);
          playerState.winCombos.push(data);
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

      if (playerState.payout > GAME_SETTINGS.max_payout)
        playerState.payout = GAME_SETTINGS.max_payout;

      playerState.bl += playerState.payout;
    }

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

    await BetResult.create(betResultObj);

    let cdtObj: IBetObject = {
      id: playerState.mthId,
      user_id: playerState.urId,
      game_id: socket.data.game_id,
      bet_amount: playerState.betAmt,
      winning_amount: playerState.payout,
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
          message: "unable to perform credit transaction, cashout unsuccessful",
          playerState,
        });
    }

    playerState.reels = this.transformReels(playerState.reels);

    // Update Redis with new player state
    await redisClient.setDataToRedis(this.redisKey, playerState);

    socket.emit("200", playerState);
    setTimeout(() => {
      socket.emit("info", { bl: playerState.bl });
    }, 4000);
  }




  checkForThree(
    reels: number[],
    [v0, v1, v2]: number[]
  ): IWinCombos | null {
    if (reels[v0] === reels[v1] && reels[v1] === reels[v2]) {
      let object: IWinCombos = {
        cmbIdx: [v0, v1, v2],
        cmbNm: "Comb3",
        cmbVal: [reels[v0], reels[v1], reels[v2]],
      };

      return object;
    }
    return null;
  }

  checkForFour(
    reels: number[],
    [v0, v1, v2, v3]: number[]
  ): IWinCombos | null {
    if (
      reels[v0] === reels[v1] &&
      reels[v1] === reels[v2] &&
      reels[v2] === reels[v3]
    ) {
      return {
        cmbIdx: [v0, v1, v2, v3],
        cmbNm: "Comb4",
        cmbVal: [reels[v0], reels[v1], reels[v2], reels[v3]],
      };
    }
    return null;
  }

  checkForFive(
    reels: number[],
    [v0, v1, v2, v3, v4]: number[]
  ): IWinCombos | null {
    if (
      reels[v0] === reels[v1] &&
      reels[v1] === reels[v2] &&
      reels[v2] === reels[v3] &&
      reels[v3] === reels[v4]
    ) {
      let data: IWinCombos = {
        cmbIdx: [v0, v1, v2, v3, v4],
        cmbNm: "Comb5",
        cmbVal: [reels[v0], reels[v1], reels[v2], reels[v3], reels[v4]],
      };

      return data;
    }
    return null;
  }

  // ------------------helpers----------------
  calculatePayout(winCombo: IWinCombos, betAmt: number): number {
    // @ts-ignore
    const symbolName = GAME_SETTINGS.payNames[winCombo.cmbVal[0]];
    // @ts-ignore
    const payout = GAME_SETTINGS.payouts[symbolName];

    if (!payout || symbolName) {
      console.error(`Payout not found for symbol: ${symbolName}`);
      return 0; // Return 0 if payout config is missing
    }

    switch (winCombo.cmbIdx.length) {
      case 3:
        winCombo.cmbPyt = betAmt * (payout.THREE || 0);
        winCombo.cmbMtp = payout.THREE || 0;
        break;
      case 4:
        winCombo.cmbPyt = betAmt * (payout.FOUR || 0);
        winCombo.cmbMtp = payout.FOUR || 0;
        break;
      case 5:
        winCombo.cmbPyt = betAmt * (payout.FIVE || 0);
        winCombo.cmbMtp = payout.FIVE || 0;
        break;
      default:
        console.warn(`Unexpected match length: ${winCombo.cmbIdx.length}`);
        return 0;
    }

    winCombo.payline = this.getPayLineIndex(winCombo);
    return winCombo.cmbPyt;
  }


  getPayLineIndex(winCombo: IWinCombos): number {
    let arr = Object.entries(GAME_SETTINGS.payline_index);
    for (let [index, payLine] of arr) {
      let count = 0;

      winCombo.cmbIdx.forEach((idx) => {
        if (payLine.includes(idx)) count++;
      });

      switch (winCombo.cmbIdx.length) {
        case 5:
          if (count > 4) return Number(index);
          break;
        case 4:
          if (count > 3) return Number(index);
          break;
        case 3:
          if (count > 2) return Number(index);
          break;
      }
    }

    return -1;
  }

  generateReels(len: number, val: number): number[] {
    return Array.from({ length: len }, () => Math.floor(Math.random() * val));
  }

  transformReels(reel: number[]): number[] {
    let transformedReel: any = new Array(5);
    let x = [reel.slice(0, 5), reel.slice(5, 10), reel.slice(10, 15)];
    for (let i = 0; i < 5; i++) {
      if ([1, 2, 3].includes(i)) transformedReel[i] = x[i - 1];
      else if (i === 0 || i === 4) {
        let e = this.generateReels(5, 7);
        transformedReel[i] = e;
      }
    }
    return transformedReel;
  }

}
