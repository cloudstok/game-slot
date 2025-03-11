import { config } from "dotenv";
import { redisClient } from "../cache/redis";
import { GAME_SETTINGS } from "../connection/gsConstants";
import type { Info, IUserDetailResponse } from "../interfaces/userObj";
import { Socket } from "socket.io";

config({ path: ".env" });
const GAME_NAME = process.env.GAME_NAME || "Fruit-Burst";

export const checkAuth = async (socket: Socket, next: Function) => {
  try {
    const token: string = socket.handshake.query?.token as string;
    const game_id: string = socket.handshake.query?.game_id as string;
    const userIP = getUserIP(socket);

    console.log("token", token);
    console.log("game_id", game_id);
    console.log("ip", userIP);
    if (!token) {
      return next(new Error("Authentication error: Invalid token"));
    }
    const newUser = await getUserDetail({ token, socketId: socket.id });
    if (!newUser || newUser.status === false) {
      console.log("Authentication failed: User not found or invalid token");
      return next(
        new Error("Authentication error: Failed to authenticate user")
      );
    }
    // Populate the info object with user details
    const info: Info = {
      urId: newUser.user.user_id,
      urNm: newUser.user.name,
      bl: Number(newUser.user.balance),
      operatorId: String(newUser.user.operatorId),
      gmId: game_id,
      sid: socket.id,
    };

    const plStKey = `${GAME_NAME}:${info.operatorId}:${info.urId}:info`;
    await redisClient.setDataToRedis(plStKey, info);

    socket.data.info = info;
    socket.data.token = token;
    socket.data.game_id = game_id;
    socket.data.ip = userIP;

    next();
  } catch (error: any) {
    console.error("Authentication error:", error.message);
    next(new Error("Authentication error: " + error.message));
  }
};

export const getUserDetail = async ({
  token,
  socketId,
}: {
  token: string;
  socketId: string | null;
}): Promise<IUserDetailResponse> => {
  // console.log("Fetching user details for socket ID:", socketId);
  const url = `${process.env.ACCOUNT_BASE_URL}/service/user/detail`;
  try {
    if (!token) throw new Error("Invalid token");
    const resp = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", token },
    });
    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`);
    }
    const respJson = (await resp.json()) as IUserDetailResponse;
    if (respJson.status === false) {
      throw new Error("Invalid token or user not found");
    }
    return respJson;
  } catch (error: any) {
    console.error("Error fetching user details:", error.message);
    throw error;
  }
};

export const getUserIP = (socket: any): string => {
  const forwardedFor = socket.handshake.headers?.["x-forwarded-for"];
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }
  return socket.handshake.address || "";
};
