"use client";

import { io, Socket } from "socket.io-client";
import { authStore } from "./auth";

let socket: Socket | null = null;
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export function getSocket() {
  if (socket) {
    return socket;
  }

  socket = io(SOCKET_URL, { transports: ["websocket"] });
  socket.on("connect", () => {
    const user = authStore.getUser();
    if (user?._id) {
      socket?.emit("join", { userId: user._id });
    }
  });

  return socket;
}

export function initSocket(userId?: string) {
  const instance = getSocket();
  const resolvedUserId = userId || authStore.getUser()?._id;
  if (resolvedUserId) {
    instance.emit("join", { userId: resolvedUserId });
  }
  return instance;
}

