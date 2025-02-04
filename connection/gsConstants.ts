import { config } from "dotenv";
import type { IMatchData } from "../interfaces/userObj";
import { GameSettings } from "../module/gameSettings";
config({ path: ".env" });

export class GS {
  static GAME_SETTINGS: any;
  static winningCombinations5Match: any;
  static winningCombinations3Match: any;
  static winningCombinations4Match: any;
  static payNames: any;
  static payouts: any;
  static paylinesIndex: any;

  constructor() {
    (async () => {
      await this.init();
    })();
  }

  async init() {
    GS.GAME_SETTINGS = await GameSettings.loadGameSettings(
      process.env.GAME_SETTINGS_ID,
    );
    GS.winningCombinations5Match =
      GS.GAME_SETTINGS?.winning_combinations?.winningCombinations5Match;
    GS.winningCombinations3Match =
      GS.GAME_SETTINGS?.winning_combinations?.winningCombinations3Match;
    GS.winningCombinations4Match =
      GS.GAME_SETTINGS?.winning_combinations?.winningCombinations4Match;
    GS.payNames = GS.GAME_SETTINGS?.payNames;
    GS.payouts = GS.GAME_SETTINGS?.payouts;
    GS.paylinesIndex = GS.GAME_SETTINGS?.payline_index;

    // console.log("this.GAME_SETTINGS", GS.paylinesIndex);
  }
}

export const players: { [key: string]: IMatchData } = {};
export const betResult: { [key: string]: IMatchData } = {};