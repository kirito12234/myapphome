"use client";

import { io, Socket } from "socket.io-client";
import { authStorage } from "./api";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function connectSocket() {
  const sock = getSocket();
  const token = authStorage.getToken();
  if (!token) return sock;
  sock.auth = { token };
  if (!sock.connected) {
    sock.connect();
  }
  return sock;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
}

export function joinThread(threadId?: string) {
  if (!threadId) return;
  connectSocket().emit("thread:join", { threadId });
}

export function leaveThread(threadId?: string) {
  if (!threadId) return;
  getSocket().emit("thread:leave", { threadId });
}

export function sendMessage(threadId: string, text: string) {
  getSocket().emit("message:send", { threadId, text });
}

export function markThreadRead(threadId: string) {
  getSocket().emit("thread:markRead", { threadId });
}

export function createMessageRequest(tutorId: string) {
  getSocket().emit("request:create", { tutorId });
}

export function approveMessageRequest(threadId: string) {
  getSocket().emit("request:approve", { threadId });
}

export function rejectMessageRequest(threadId: string) {
  getSocket().emit("request:reject", { threadId });
}

// Legacy compatibility for existing pages using old tutor room events.
export function joinTutorRoom(_tutorId?: string) {}
export function leaveTutorRoom(_tutorId?: string) {}
