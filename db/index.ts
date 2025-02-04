import { createPool } from "mysql2/promise";
import { config } from "dotenv";
import { betResult, dbQuery, gameSettings, transaction } from "./tables";

config({ path: ".env" });

export const pool = createPool({
  port: parseInt(process.env.MYSQL_PORT ?? "3306"),
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  //   multipleStatements: true,
});

export const createTables = async () => {
  try {
    (await pool.getConnection())
      ? console.log("db connection successful")
      : console.log("db connection unsuccessful");

    await pool.execute(dbQuery);
    await pool.execute(gameSettings);
    await pool.execute(betResult);
    await pool.execute(transaction);

  } catch (error) {
    console.error("Error creating tables", error);
  }
};
