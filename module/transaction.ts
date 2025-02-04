import { pool } from "../db";
import type { ITransaction } from "../interfaces/userObj"; // Assuming you have an ITransaction interface for type checking.

export class Transaction {
    // Find a transaction by its ID
    static async findById(id: string | number): Promise<any> {
        const query = `SELECT * FROM transactions WHERE ttn_id = ?`;
        let [res]: any = await pool.query(query, [id]);
        return res[0]; // Returns the first result from the array
    }

    // Fetch all transactions for a specific user
    static async fetchByUserId(id: string | number, operator_id: string): Promise<any> {
        const query = `SELECT * FROM transactions WHERE player_id = ? AND operator_id = ?`;
        let [res] = await pool.query(query, [id, operator_id]);
        return res; // Returns an array of results
    }

    // Create a new transaction
    static async create({
        player_id,
        token,
        amount,
        match_id,
        txn_id,
        type,
        operator_id,
        txn_ref_id,
    }: ITransaction): Promise<number> {
        const query = `
      INSERT INTO transactions 
      (player_id, token, amount, match_id, txn_id, type, operator_id, txn_ref_id) 
      VALUES ( ?, ?, ?, ?, ?, ?, ?, ?);`;
        try {
            const [res]: any = await pool.query(query, [
                player_id,
                token,
                amount,
                match_id,
                txn_id,
                type,
                operator_id,
                txn_ref_id,
            ]);
            return res.insertId; // Returns the inserted ID of the new transaction
        } catch (e: any) {
            console.error("error occured:", e.message);
            return 0
        }
    }

    // Update an existing transaction
    static async update(fields: any, id: number | string) {
        const query = `UPDATE transactions SET ? WHERE ttn_id = ?`;
        let [res] = await pool.query(query, [fields, id]);
        return res; // Returns the result of the update query
    }

    // Delete a transaction by its ID
    static async delete(id: number | string) {
        const query = `DELETE FROM transactions WHERE ttn_id = ?`;
        let [res] = await pool.query(query, [id]);
        return res; // Returns the result of the delete query
    }
}
