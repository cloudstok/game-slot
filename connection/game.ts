import type { Namespace, Socket } from "socket.io";
import crypto, { randomUUID } from "crypto";
import type { IBetObject, IMatchData, Info, IPlayerDetails, IWinCombos } from "../interfaces/userObj";
import { BetResult } from "../module/betResult";
import { config } from "dotenv";
import { GAME_SETTINGS } from "./gsConstants";
import { updateBalanceFromAccount } from "../utility/v2Transactions";
import { redisClient } from "../cache/redis"; // Import Redis client

config({ path: ".env" });

const GAME_NAME = process.env.GAME_NAME || "Fruit-Burst"; // Define game name from env

export async function onSpinReels(socket: Socket, data: any) {
  console.log("-----------------spin start--------------");
  const plStKey = `${GAME_NAME}:${socket.data.info.operatorId}:${socket.data.info.urId}:info`;
  const matchKey = `${GAME_NAME}:${socket.data.info.operatorId}:${socket.data.info.urId}:match`;

  const playerInfo: Info = await redisClient.getDataFromRedis(plStKey);
  if (!playerInfo) return socket.emit("ERROR", "Player info not found in cache");

  if (!GAME_SETTINGS) return socket.emit("400", "unable to load game settings");

  if (!data.betAmt) return socket.emit("400", "bet amount not sent");

  data.betAmt = Number(data.betAmt);
  if (data.betAmt > GAME_SETTINGS.max_bet || data.betAmt < GAME_SETTINGS.min_bet) {
    return socket.emit("400", "invalid bet amount");
  }

  if (Number(playerInfo.bl) < data.betAmt) {
    return socket.emit("400", "not enough balance to place this bet");
  }

  let matchData: IMatchData = {
    reels: generateReels(15, 7),
    mthId: crypto.randomUUID(),
    payout: 0,
    betAmt: data.betAmt,
    winCombos: [],
    win: false
  };

  const dbtTxnObj: IBetObject = {
    id: matchData.mthId,
    bet_amount: data.betAmt,
    game_id: socket.data.game_id,
    user_id: playerInfo.urId,
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
    socket.emit("400", "Bet Cancelled By Upstream Server");
    return;
  }

  playerInfo.bl = playerInfo.bl - data.betAmt;
  socket.emit("info", { bl: playerInfo.bl });

  const matchedIndices = new Set<number>();

  GAME_SETTINGS.winningCombinations5Match.forEach((idxArr: number[]) => {
    const data = checkForFive(matchData.reels, idxArr);
    if (data?.cmbNm?.length) {
      data.cmbPyt = calculatePayout(data, matchData.betAmt);
      matchData.winCombos.push(data);
      idxArr.forEach((i) => matchedIndices.add(i));
    }
  });

  GAME_SETTINGS.winningCombinations4Match.forEach((idxArr: number[]) => {
    if (!idxArr.every((i) => matchedIndices.has(i))) {
      const data = checkForFour(matchData.reels, idxArr);
      if (data?.cmbNm?.length) {
        data.cmbPyt = calculatePayout(data, matchData.betAmt);
        matchData.winCombos.push(data);
        idxArr.forEach((i) => matchedIndices.add(i));
      }
    }
  });

  GAME_SETTINGS.winningCombinations3Match.forEach((idxArr: number[]) => {
    if (!idxArr.every((i) => matchedIndices.has(i))) {
      const data = checkForThree(matchData.reels, idxArr);
      if (data?.cmbNm?.length) {
        data.cmbPyt = calculatePayout(data, matchData.betAmt);
        matchData.winCombos.push(data);
      }
    }
  });

  matchData.winCombos = verifyCombinations(matchData.winCombos, matchData.reels);

  if (matchData.winCombos.length > 0) {
    matchData.win = true;
    matchData.payout = matchData.winCombos.reduce(
      (acc, winCombo) => acc + (winCombo.cmbPyt || 0),
      0
    );

    if (matchData.payout > GAME_SETTINGS.max_payout) {
      matchData.payout = GAME_SETTINGS.max_payout;
    }
  } else {
    matchData.payout = 0; // Ensure payout remains 0 if there's no win
  }

  let txnId = randomUUID();
  const betResultObj = {
    player_id: playerInfo.urId,
    token: socket.data?.token ?? "token",
    match_id: matchData.mthId,
    room_id: socket.data?.info.rmid,
    transaction_id: txnId,
    game_settings_id: process.env.GAME_SETTINGS_ID || 2,
    round_no: socket.data?.matches,
    bet_amt: matchData.betAmt,
    won_amt: matchData?.payout ?? 0,
    status: matchData?.win ? "WIN" : "LOSS",
    reels: matchData.reels,
    result: matchData.winCombos,
    operator_id: socket.data.info.operatorId,
  };

  await BetResult.create(betResultObj);

  let cdtObj: IBetObject = {
    id: matchData.mthId,
    user_id: playerInfo.urId,
    game_id: socket.data.game_id,
    bet_amount: matchData.betAmt,
    winning_amount: matchData.payout,
    txn_id: dbtTxnRes.txn_id,
    ip:
      // @ts-ignore
      socket.handshake.headers?.["x-forwarded-for"]?.split(",")[0].trim() ||
      socket.handshake.address,
  };

  if (matchData.win) {
    console.log("Before Credit txn: Player Balance =", playerInfo.bl);

    let cdtTxn: any = await updateBalanceFromAccount(cdtObj, "CREDIT", {
      game_id: socket.data.game_id,
      operatorId: socket.data.info.operatorId,
      token: socket.data.token,
    });

    if (!cdtTxn) console.info("Credit txn failed");
    else playerInfo.bl += matchData.payout
  }

  matchData.reels = transformReels(matchData.reels);

  // ✅ Update Redis with final state only once
  await redisClient.setDataToRedis(matchKey, matchData);
  await redisClient.setDataToRedis(plStKey, playerInfo);

  socket.emit("200", { ...matchData, ...playerInfo });
  setTimeout(() => {
    socket.emit("info", { bl: playerInfo.bl });
  }, 4000);
}

function checkForThree(
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

function checkForFour(
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

function checkForFive(
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
function calculatePayout(winCombo: IWinCombos, betAmt: number): number {
  // @ts-ignore
  const symbolName = GAME_SETTINGS.payNames[winCombo.cmbVal[0]];
  // @ts-ignore
  const payout = GAME_SETTINGS.payouts[symbolName];

  if (!payout || !symbolName) {
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

  winCombo.payline = getPayLineIndex(winCombo);
  return winCombo.cmbPyt;
}

function getPayLineIndex(winCombo: IWinCombos): number {
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

function verifyCombinations(winCombos: IWinCombos[], reels: number[]): IWinCombos[] {
  return winCombos.filter((winComb) =>
    winComb.cmbIdx.every((idx, i) => winComb.cmbVal[i] === reels[idx])
  );
}


function generateReels(len: number, val: number): number[] {
  return Array.from({ length: len }, () => Math.floor(Math.random() * val));
}

function transformReels(reel: number[]): number[] {
  let transformedReel: any = new Array(5);
  let x = [reel.slice(0, 5), reel.slice(5, 10), reel.slice(10, 15)];
  for (let i = 0; i < 5; i++) {
    if ([1, 2, 3].includes(i)) transformedReel[i] = x[i - 1];
    else if (i === 0 || i === 4) {
      let e = generateReels(5, 7);
      transformedReel[i] = e;
    }
  }
  return transformedReel;
}

