export interface IUserDetailResponse {
  status: boolean;
  user: {
    user_id: string;
    name: string;
    balance: number;
  };
}

export interface Info {
  urId: string;
  urNm: string;
  bl: number;
  crTs: number;
}

export interface IMatchData {
  urId: string;
  sid: string;
  rmId: string;
  mthId: string;
  bl: number;
  betAmt: number;
  payout: number;
  reels: number[];
  winCombos: IWinCombos[];
  win: boolean;
}

export interface IWinCombos {
  cmbNm: string;
  cmbIdx: number[];
  cmbVal: number[];
  cmbPyt?: number;
  cmbMtp?: number;
  payline?: number;
}

export interface IBetResult {
  player_id: number | string;
  token: string;
  match_id: string;
  room_id: string;
  transaction_id: string;
  game_settings_id: number | string;
  round_no: number;
  bet_amt: number;
  won_amt: number;
  status: string;
  reels: number[];
  result: IWinCombos[];
}
