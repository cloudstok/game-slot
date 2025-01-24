import fs from "fs/promises";

export const processTransaction = async ({
  matchId,
  userId,
  token,
  amount,
  roomId,
  operatorId,
  txnId,
  type,
  txnRefId,
  bet_result_id,
}: {
  matchId: string | null;
  userId: string;
  token: string;
  amount: number;
  roomId?: number;
  txnId: string;
  type: string;
  operatorId?: string;
  txnRefId?: string;
  bet_result_id?: number | string;
}): Promise<boolean> => {
  const url = String(process.env.TRANSACTION_URL);
  console.log(type, "type");
  let trType;
  if (type === "CREDIT") {
    trType = 1;
  } else {
    trType = 0;
  }
  console.log(trType, "txn_typ", type);
  const creditMsg = `${amount.toFixed(2)} credited for ${
    process.env.GAME_NAME
  } game for MatchID ${matchId}`;
  const debitMsg = `${amount.toFixed(2)} debited for ${
    process.env.GAME_NAME
  } game for MatchID ${matchId}`;

  let data = {
    amount,
    txn_id: txnId,
    user_id: userId,
    description: type === "CREDIT" ? creditMsg : debitMsg,
    game_id: parseInt(process.env.GAME_ID || "19"),
    txn_type: trType, // 0->debit txn_ref_id
  } as { [key: string]: string | number };

  if (txnRefId) {
    data = {
      ...data,
      txn_ref_id: txnRefId,
    };
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json", token },
    });
    const respJson = await resp.json();
    console.log("respJson", respJson);

    let obj = {
      payload: { ...data, createdAt: new Date() },
      response: { ...respJson, createdAt: new Date() },
    };

    if (respJson.status) {
      if (type === "CREDIT")
        await writeInLogs("logs/creditSuccess.jsonl", JSON.stringify(obj));
      else await writeInLogs("logs/debitSuccess.jsonl", JSON.stringify(obj));
    } else {
      if (type === "CREDIT")
        await writeInLogs("logs/creditFail.jsonl", JSON.stringify(obj));
      else await writeInLogs("logs/debitFail.jsonl", JSON.stringify(obj));
    }

    return true;
  } catch (error) {
    console.error("error occured :", error);
    return false;
  }
};

export const writeInLogs = async (filename: string, obj: string) => {
  try {
    await fs.appendFile(filename, obj + "\n");
    return true;
  } catch (error) {
    console.error("error while writing file:", error);
    return true;
  }
};
