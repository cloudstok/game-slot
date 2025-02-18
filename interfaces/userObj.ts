export interface IUserDetailResponse {
  status: boolean;
  user: {
    user_id: string;
    name: string;
    balance: number;
    operatorId: string
  };
}

export interface Info {
  urId: string;
  urNm: string;
  bl: number;
  crTs: number;
  operatorId: string
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
  operator_id: string
}


export interface IBetObject {
  id: string;
  bet_amount: number;
  winning_amount?: number;
  game_id: string;
  user_id: string;
  txn_id?: string;
  ip?: string;
}

export interface IPlayerDetails {
  game_id: string;
  operatorId: string;
  token: string;
}

export interface IWebhookData {
  txn_id: string;
  ip?: string;
  game_id: string;
  user_id: string;
  amount?: number;
  description?: string;
  bet_id?: string;
  txn_type?: number;
  txn_ref_id?: string;
}
