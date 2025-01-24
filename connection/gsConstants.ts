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
      process.env.GAME_NAME,
      process.env.GAME_SETTINGS_ID
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

// export const winningCombinations5Match = [
//   [0, 1, 2, 3, 4], // Top row
//   [5, 6, 7, 8, 9], // Middle row
//   [10, 11, 12, 13, 14], // Bottom row
//   [0, 6, 12, 8, 4], // Diagonal from top-left to bottom-right
//   [10, 6, 2, 8, 14], // Diagonal from bottom-left to top-right
//   [0, 6, 7, 8, 14], // V shape
//   [10, 6, 7, 8, 4], // Inverted V shape
//   [0, 6, 2, 8, 14], // Zigzag from top-left to bottom-right
//   [10, 6, 12, 8, 4], // Zigzag from bottom-left to top-right
//   [0, 4, 7, 10, 14], // Four corners
// ];
// export const winningCombinations3Match = [
//   // Horizontal 3-match
//   [0, 1, 2],
//   [1, 2, 3],
//   [2, 3, 4], // Top row
//   [5, 6, 7],
//   [6, 7, 8],
//   [7, 8, 9], // Middle row
//   [10, 11, 12],
//   [11, 12, 13],
//   [12, 13, 14], // Bottom row
//   // Diagonal 3-match
//   [0, 6, 12],
//   [2, 6, 10],
//   [2, 8, 14],
//   [4, 8, 12],
// ];
// export const winningCombinations4Match = [
//   // Horizontal 4-match
//   [0, 1, 2, 3],
//   [1, 2, 3, 4], // Top row
//   [5, 6, 7, 8],
//   [6, 7, 8, 9], // Middle row
//   [10, 11, 12, 13],
//   [11, 12, 13, 14], // Bottom row
//   // Diagonal 4-match
//   [0, 6, 12, 8],
//   [5, 7, 9, 13],
//   [4, 8, 12, 10],
// ];
// export const payNames = {
//   0: "STRAWBERRY",
//   1: "GRAPE",
//   2: "BLUEBERRY",
//   3: "APPLE",
//   4: "LEMON",
//   5: "ORANGE",
//   6: "CHERRY",
// };
// export const payouts = {
//   STRAWBERRY: {
//     THREE: 5,
//     FOUR: 20,
//     FIVE: 25,
//   },
//   GRAPE: {
//     THREE: 12,
//     FOUR: 6,
//     FIVE: 2.5,
//   },
//   BLUEBERRY: {
//     THREE: 6,
//     FOUR: 2.5,
//     FIVE: 1,
//   },
//   APPLE: {
//     THREE: 2.5,
//     FOUR: 1,
//     FIVE: 0.5,
//   },
//   LEMON: {
//     THREE: 2.5,
//     FOUR: 1,
//     FIVE: 0.5,
//   },
//   ORANGE: {
//     THREE: 1.5,
//     FOUR: 0.8,
//     FIVE: 0.3,
//   },
//   CHERRY: {
//     THREE: 1.5,
//     FOUR: 0.8,
//     FIVE: 0.3,
//   },
// };
// export const paylinesIndex: { [key: number]: number[] } = {
//   0: [5, 6, 7, 8, 9],
//   1: [0, 1, 2, 3, 4],
//   2: [10, 11, 12, 13, 14],
//   3: [0, 6, 12, 8, 4],
//   4: [10, 6, 2, 8, 14],
//   5: [0, 1, 7, 3, 4],
//   6: [10, 11, 7, 13, 14],
//   7: [5, 11, 12, 13, 9],
//   8: [5, 1, 2, 3, 9],
//   9: [5, 1, 7, 3, 9],
// };
