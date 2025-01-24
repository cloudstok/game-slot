import { pool } from "../db";

export class GameSettings {
  static async loadGameSettings(
    game_name: string | undefined,
    game_settings_id: string | undefined
  ) {
    let [res]: any = await pool.query(
      `select * from game_settings where game_name = ? and game_settings_id = ?`,
      [game_name, game_settings_id]
    );
    return res[0];
  }
}
