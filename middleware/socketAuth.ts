import type { Info, IUserDetailResponse } from "../interfaces/userObj";
import { Socket } from "socket.io";
import dotenv from "dotenv";

dotenv.config({
  path: "./env",
});

export const checkAuth = async (socket: Socket, next: Function) => {
  try {
    const token: string = socket.handshake.query?.token as string;
    console.log("token", token);
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
      bl: newUser.user.balance,
      crTs: Date.now(),
      operatorId: newUser.user.operatorId
    };
    socket.data.info = info;
    socket.data.token = token;
    console.log(info);
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
