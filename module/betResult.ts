import { pool } from "../db";
import type { IBetResult } from "../interfaces/userObj";

export class BetResult {
  static async findById(id: string | number): Promise<any> {
    const query = `select * from bet_results where bet_result_id = ?`;
    let [res]: any = await pool.query(query, [id]);
    return res[0];
  }
  static async fetchByUserId(
    id: string | number,
    operator_id: string,
    limit: number = 25
  ): Promise<any> {
    const query = `SELECT * FROM bet_results 
      WHERE player_id = ? 
      AND operator_id = ? 
      ORDER BY created_at DESC
      LIMIT ?;`;
    let [res] = await pool.query(query, [id, operator_id, limit]);
    return res;
  }
  static async create({
    player_id,
    token,
    match_id,
    room_id,
    transaction_id,
    game_settings_id,
    round_no,
    bet_amt,
    won_amt,
    status,
    reels,
    result,
    operator_id,
  }: IBetResult): Promise<number> {
    const query = `
      INSERT INTO bet_results 
      (player_id, token, match_id, room_id, transaction_id, game_settings_id, status, round_no, bet_amt, won_amt, reels, result, operator_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const serializedReels = JSON.stringify(reels); // Serialize JSON data
    const serializedResult = JSON.stringify(result); // Serialize JSON data

    const connection = await pool.getConnection();
    try {
      const [res]: any = await connection.query(query, [
        player_id,
        token,
        match_id,
        room_id,
        transaction_id,
        game_settings_id,
        status,
        round_no,
        bet_amt,
        won_amt,
        serializedReels,
        serializedResult,
        operator_id,
      ]);
      return res.insertId;
    } finally {
      connection.release();
    }
  }
  static async betDetails(user_id: string, operator_id: string, match_id: any): Promise<any> {
    console.log({ user_id, operator_id, match_id });
    const query = `select * from bet_results where player_id = ? and operator_id = ? and match_id = ?`;
    let [res]: any = await pool.query(query, [user_id, operator_id, match_id]);
    console.log(res);
    return res[0];
  }
  static async update(fields: any, id: number | string) {
    const query = `update table bet_results set ? where bet_result_id = ?`;
    let [res] = await pool.query(query, fields);
    return res;
  }
  static async delete(id: number | string) {
    const query = `delete from bet_results where bet_result_id = ?`;
    let [res] = await pool.query(query, [id]);
    return res;
  }

}
