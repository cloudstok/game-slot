import { config } from "dotenv";

config({ path: ".env" });

export const dbQuery = `create database if not exists ${process.env.MYSQL_DATABASE};`;

export const betResult = `CREATE TABLE IF NOT EXISTS bet_results (
    bet_result_id INT PRIMARY KEY AUTO_INCREMENT,
    player_id VARCHAR(50) NOT NULL,
    token VARCHAR(50) NOT NULL,
    match_id VARCHAR(50) NOT NULL,
    room_id VARCHAR(50),
    transaction_id VARCHAR(255),
    operator_id varchar(100),
    game_settings_id INT,
    round_no INT NOT NULL,
    bet_amt FLOAT NOT NULL,
    won_amt FLOAT NOT NULL,
    status ENUM('WIN', 'LOSS', 'CASHOUT') DEFAULT 'LOSS',
    reels JSON,
    result JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (game_settings_id) REFERENCES game_settings(game_settings_id)
    );`;

export const transaction = `CREATE TABLE IF NOT EXISTS transactions (
    ttn_id INT PRIMARY KEY AUTO_INCREMENT,
    bet_result_id INT,
    player_id VARCHAR(150) NOT NULL,
    token VARCHAR(150) NOT NULL,
    amount INT NOT NULL,
    match_id VARCHAR(150) NOT NULL,
    txn_id VARCHAR(150) NOT NULL,
    type ENUM('CREDIT', 'DEBIT', 'ROLLBACK') NOT NULL,
    operator_id VARCHAR(50) NOT NULL,
    txn_ref_id VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bet_result_id) REFERENCES bet_results (bet_result_id)
    );`;

export const gameSettings = `create table if not exists game_settings (
    game_settings_id int primary key auto_increment,
    game_name varchar(50),
    max_bet int not null,
    min_bet int not null,
    join_amt int,
    game_type enum('SINGLE_PLAYER','MULTI_PLAYER'),
    min_player int,
    max_player int,
    winning_combinations json not null,
    payouts json not null,
    payline_index json not null,
    payNames json not null,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
    );`;
