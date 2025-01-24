export interface IRedisUser {
  token: string;
  socketId: string;
  amount: number;
  userName: string;
  userId: string;
  status: boolean;
  roomId?: string | null;
  matchId?: string;
  updatedAt?: Date;
}

export enum gameStatus {
  ONE = "ROOM_CREATE",
  TWO = "JOIN_ROOM",
  THREE = "START_MATCH",
  FOUR = "SET_BET",
  FIVE = "SPIN_WHEEL",
  SIX = "REPLAY_MATCH",
  SEVEN = "EXIT_MATCH",
}

export interface IBetData {
  // betType: EBetTypes;
  betAmt: number;
  betNum: number | number[];
  resNum?: number;
}

export interface IPlayerState {
  userId: string;
  gameId: string;
  socketId: string;
  roomId: string;
  totalBalance: number;
  userBet?: IBetData[];
  payout?: number;
  //   playerStatus?: playerStatus;
}

export interface IGameSettings {
  gameId: number;
  gameName: string;
  gameType: number;
  winWithToken: number;
  gameLogicSetting: IGameLogicSettings;
  playerMin: number;
  playerMax: number;
  status: boolean;
  event_timeout: number;
}

interface IGameLogicSettings {
  minBetAmount: number;
  maxBetAmount: number;
}
