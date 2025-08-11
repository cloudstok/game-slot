import { Router } from "express"
import { getUserDetail } from "../middleware/socketAuth";
import { BetResult } from "../module/betResult";

export const router = Router();

router.get("/", (req: any, res: any) => {
    return res.status(200).send({ statusCode: 200, message: "Fruit-Burst Backend is up and running" });
});

router.get("/bet-history", async (req: any, res: any) => {
    try {
        let { token, limit } = req.query;
        if (!token) throw new Error("token not sent");
        if (!limit) limit = 50
        let userDetails = await getUserDetail({ token, socketId: null });
        if (!userDetails.user.user_id) throw new Error("user not found");
        let history = await BetResult.fetchByUserId(userDetails.user.user_id, userDetails.user.operatorId, Number(limit));
        return res.status(200).send({
            statusCode: 200,
            history,
            message: "bet history fetched successfully",
        });
    } catch (error: any) {
        return res.status(500).send({
            statusCode: 500,
            error: error?.message,
            message: "failed to fetch bet history",
        });
    }
});

router.get("/match-history", async (req: any, res: any) => {
    try {
        console.log("ehehe match-history");
        const { user_id, operator_id, lobby_id } = req.query;
        if (!user_id || !operator_id || !lobby_id) return res.status(400).send({
            status: false,
            data: null,
        });
        let result = await BetResult.betDetails(user_id, operator_id, lobby_id);
        console.log(result);
        let transformedResult: any = {
            lobby_id: result.match_id,
            user_id: result.player_id,
            operator_id: result.operator_id,
            total_bet_amount: result.bet_amt,
            bet_time: result.created_at,
            status: result.status
        }
        if (result?.result?.length) {
            result.result.forEach((bet: any, idx: number) => {
                transformedResult[`Bet${idx + 1}`] = {
                    mult: bet.cmbMtp,
                    win_amount: bet.cmbPyt
                }
            });
        }
        return res.status(200).send({
            status: true,
            data: transformedResult,
        });
    } catch (error: any) {
        return res.status(500).send({
            statusCode: 500,
            error: error?.message,
            message: "failed to fetch history",
        });
    }
})