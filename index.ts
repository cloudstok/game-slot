import express, { type NextFunction } from "express";
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { SlotMachine } from "./connection/game";
import { config } from "dotenv";
import { checkAuth, getUserDetail } from "./middleware/socketAuth";
import { createTables } from "./db/index";
import { BetResult } from "./module/betResult";
import cors from "cors";

config({ path: ".env" });

createTables();

const app = express();
app.use(cors({ origin: "*" }));
const httpServer = createServer(app);
const slotMachineIo = new Server(httpServer, { cors: { origin: "*" } }).of(
  "/slot-machine"
);

// @ts-ignore
slotMachineIo.use((socket: Socket, next: NextFunction) =>
  checkAuth(socket, next)
);

new SlotMachine(slotMachineIo);

app.get("/", (req: any, res: any) => {
  return res.status(200).send({ statusCode: 200, message: "slot-machine" });
});

app.get("/bet-history", async (req: any, res: any) => {
  try {
    let { token } = req.query;
    if (!token) throw new Error("token not sent");
    let userDetails = await getUserDetail({ token, socketId: null });
    if (!userDetails.user.user_id) throw new Error("user not found");
    let history = await BetResult.fetchByUserId(userDetails.user.user_id);
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

httpServer.listen(process.env.PORT, () => {
  console.log("server running on port", process.env.PORT);
});
