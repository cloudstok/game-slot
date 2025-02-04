import { pool } from "../db";

export class GameSettings {
  static async loadGameSettings(
    game_settings_id: string | undefined
  ) {
    let [res]: any = await pool.query(
      `select * from game_settings where game_settings_id = ?`,
      [game_settings_id]
    );
    return res[0];
  }
}
