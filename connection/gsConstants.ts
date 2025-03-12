// import { config } from "dotenv";
// import type { IMatchData } from "../interfaces/userObj";
// import { GameSettings } from "../module/gameSettings";
// config({ path: ".env" });

// export class GS {
//   static GAME_SETTINGS: any;
//   static winningCombinations5Match: any;
//   static winningCombinations3Match: any;
//   static winningCombinations4Match: any;
//   static payNames: any;
//   static payouts: any;
//   static paylinesIndex: any;

//   constructor() {
//     (async () => {
//       await this.init();
//     })();
//   }

//   async init() {
//     GS.GAME_SETTINGS = await GameSettings.loadGameSettings(
//       process.env.GAME_SETTINGS_ID,
//     );
//     GS.winningCombinations5Match =
//       GS.GAME_SETTINGS?.winning_combinations?.winningCombinations5Match;
//     GS.winningCombinations3Match =
//       GS.GAME_SETTINGS?.winning_combinations?.winningCombinations3Match;
//     GS.winningCombinations4Match =
//       GS.GAME_SETTINGS?.winning_combinations?.winningCombinations4Match;
//     GS.payNames = GS.GAME_SETTINGS?.payNames;
//     GS.payouts = GS.GAME_SETTINGS?.payouts;
//     GS.paylinesIndex = GS.GAME_SETTINGS?.payline_index;

//     // console.log("this.GAME_SETTINGS", GS.paylinesIndex);
//   }
// }

// export const players: { [key: string]: IMatchData } = {};
// export const betResult: { [key: string]: IMatchData } = {};

export const GAME_SETTINGS = {
  game_settings_id: 3,
  game_name: "FRUIT-BURST",
  max_bet: 20000,
  min_bet: 10,
  join_amt: 11,
  game_type: "SINGLE_PLAYER",
  min_player: 1,
  max_player: 1,
  winningCombinations3Match: [
    [0, 1, 2],
    [2, 3, 4],
    [5, 6, 7],
    [7, 8, 9],
    [10, 11, 12],
    [12, 13, 14],
    [0, 6, 12],
    [2, 6, 10],
    [2, 8, 14],
    [4, 8, 12],
    [5, 11, 12],
    [12, 13, 9],
    [0, 1, 7],
    [3, 4, 7],
    [7, 10, 11],
    [7, 13, 14],
    [5, 1, 2],
    [2, 3, 9],
    [3, 7, 9],
    [5, 1, 7],
  ],
  winningCombinations4Match: [
    [0, 1, 2, 3],
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [6, 7, 8, 9],
    [10, 11, 12, 13],
    [11, 12, 13, 14],
    [0, 6, 8, 12],
    [1, 3, 7, 9],
    [2, 6, 8, 10],
    [2, 6, 8, 14],
    [4, 6, 8, 12],
    [6, 7, 8, 9],
    [0, 1, 3, 7],
    [1, 3, 4, 7],
    [7, 10, 11, 13],
    [7, 11, 13, 14],
    [9, 11, 12, 13],
    [1, 2, 5, 3],
    [1, 2, 3, 9],
    [1, 3, 5, 7],
  ],
  winningCombinations5Match: [
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [0, 4, 6, 8, 12],
    [10, 6, 2, 8, 14],
    [0, 1, 3, 4, 7],
    [7, 10, 11, 13, 14],
    [5, 9, 11, 12, 13],
    [1, 2, 3, 5, 9],
    [1, 3, 5, 7, 9],
  ],
  payouts: {
    CHERRY: { FIVE: 1, FOUR: 0.75, THREE: 0.2 },
    LEMON: { FIVE: 2, FOUR: 1.5, THREE: 0.5 },
    ORANGE: { FIVE: 3, FOUR: 2, THREE: 0.7 },
    APPLE: { FIVE: 4, FOUR: 2.5, THREE: 1.5 },
    GRAPE: { FIVE: 5, FOUR: 3.5, THREE: 2.5 },
    BLUEBERRY: { FIVE: 7, FOUR: 5.5, THREE: 3.5 },
    STRAWBERRY: { FIVE: 10, FOUR: 7.5, THREE: 5.5 },
  },
  payline_index: {
    "0": [0, 1, 2, 3, 4],
    "1": [5, 6, 7, 8, 9],
    "2": [10, 11, 12, 13, 14],
    "3": [0, 6, 12, 8, 4],
    "4": [10, 6, 2, 8, 14],
    "5": [0, 1, 7, 3, 4],
    "6": [10, 11, 7, 13, 14],
    "7": [5, 11, 12, 13, 9],
    "8": [5, 1, 2, 3, 9],
    "9": [5, 1, 7, 3, 9],
  },
  payNames: {
    "0": "STRAWBERRY",
    "1": "GRAPE",
    "2": "BLUEBERRY",
    "3": "APPLE",
    "4": "LEMON",
    "5": "CHERRY",
    "6": "ORANGE",
  },
  max_payout: 1000000,
};
