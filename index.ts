import express, { type NextFunction } from "express";
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { config } from "dotenv";
import { checkAuth } from "./middleware/socketAuth";
import { createTables } from "./db/index";
import cors from "cors";
import { redisClient } from "./cache/redis";
import { GAME_SETTINGS } from "./connection/gsConstants";
import { onSpinReels } from "./connection/game";
import { router } from "./routes/history";

config({ path: ".env" });

createTables();

const app = express();
app.use(cors({ origin: "*" }));

const httpServer = createServer(app);
const GAME_NAME = process.env.GAME_NAME || "Fruit-Burst";

new Server(httpServer, { cors: { origin: "*" } }).of(
  "/slot-machine"
)
  // @ts-ignore
  .use((socket: Socket, next: NextFunction) => checkAuth(socket, next)).on("connection", async (socket: Socket) => {
    console.log(socket.id, " connected ", socket.data);

    const plStKey = `${GAME_NAME}:${socket.data.info.operatorId}:${socket.data.info.urId}:info`;
    const matchKey = `${GAME_NAME}:${socket.data.info.operatorId}:${socket.data.info.urId}:match`;

    const playerInfo = await redisClient.getDataFromRedis(plStKey);
    if (!playerInfo)
      return socket.emit("ERROR", "Player info not found in cache");

    const matchData = await redisClient.getDataFromRedis(matchKey);
    if (matchData) await redisClient.delDataFromRedis(matchKey);

    if (playerInfo.bl < GAME_SETTINGS?.join_amt) {
      socket.emit("400", "balance low, cannot play the match");
      return;
    }

    // const redisKey = `GM:${GAME_NAME}:PL:${socket.data.info.urId}`;
    // const playerData: IMatchData = {
    //   ...socket.data?.info,
    //   rmId: crypto.randomUUID(),
    //   sid: socket.id,
    //   bl: Number(socket.data?.info?.bl),
    // };

    socket.data.matches = 0;
    socket.data.rmId = crypto.randomUUID();
    socket.join(socket.data.rmId);

    socket.emit("200", { ...playerInfo, ...matchData, rmId: socket.data.rmId });
    socket.emit("info", { bl: playerInfo.bl });

    socket.on("spin", async (data) => await onSpinReels(socket, data));

    socket.on("disconnect", async () => {
      console.log("------------DISCONNECTION--------------");
      await redisClient.delDataFromRedis(plStKey);
      await redisClient.delDataFromRedis(matchKey);
      console.log("user with sid:", socket.id, " disconnected");
    });
  });


app.use("/", router);

httpServer.listen(process.env.PORT, () => {
  console.log("server running on port", process.env.PORT);
});
