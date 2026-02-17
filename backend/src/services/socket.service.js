const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  joinThreadRoomIfAllowed,
  sendThreadMessage,
  markThreadRead,
  createMessageRequest,
  approveRequest,
} = require("./messaging.service");
const { canAccessLiveSession } = require("../controllers/liveSessionController");

let io = null;
const onlineCounts = new Map();
const liveRoomParticipants = new Map();
const socketLiveSessions = new Map();

const normalizeRole = (role) => (role === "teacher" ? "tutor" : role);
const isTutor = (role) => normalizeRole(role) === "tutor";

const emitPresence = (userId, online) => {
  if (!io) return;
  io.emit("user:presence", { userId: String(userId), online });
};

const getLiveParticipantMap = (sessionId) => {
  const key = String(sessionId);
  if (!liveRoomParticipants.has(key)) liveRoomParticipants.set(key, new Map());
  return liveRoomParticipants.get(key);
};

const addLiveParticipant = (sessionId, user) => {
  const participants = getLiveParticipantMap(sessionId);
  const id = String(user._id);
  if (!participants.has(id)) {
    participants.set(id, { count: 0, user: { _id: id, name: user.name, role: user.role } });
  }
  const current = participants.get(id);
  current.count += 1;
  participants.set(id, current);
  return participants;
};

const removeLiveParticipant = (sessionId, userId) => {
  const key = String(sessionId);
  if (!liveRoomParticipants.has(key)) return null;
  const participants = liveRoomParticipants.get(key);
  const id = String(userId);
  if (!participants.has(id)) return participants;
  const current = participants.get(id);
  current.count = Math.max((current.count || 1) - 1, 0);
  if (current.count <= 0) participants.delete(id);
  else participants.set(id, current);
  if (participants.size === 0) liveRoomParticipants.delete(key);
  return participants;
};

const initSocket = (server) => {
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake?.auth?.token ||
        socket.handshake?.headers?.authorization?.replace("Bearer ", "");
      if (!token) return next(new Error("Unauthorized: missing token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("name role avatarUrl");
      if (!user) return next(new Error("Unauthorized: user not found"));

      socket.user = {
        _id: String(user._id),
        name: user.name,
        role: normalizeRole(user.role),
        avatarUrl: user.avatarUrl || "",
      };
      next();
    } catch (_error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);

    const nextCount = (onlineCounts.get(userId) || 0) + 1;
    onlineCounts.set(userId, nextCount);
    if (nextCount === 1) emitPresence(userId, true);

    socket.on("thread:join", async ({ threadId }) => {
      if (!threadId) return;
      await joinThreadRoomIfAllowed({ socket, userId, threadId });
    });

    socket.on("thread:leave", ({ threadId }) => {
      if (!threadId) return;
      socket.leave(`thread:${threadId}`);
    });

    socket.on("message:send", async ({ threadId, text }, ack) => {
      try {
        const message = await sendThreadMessage({
          senderUser: socket.user,
          threadId,
          text,
        });
        if (ack) ack({ success: true, data: message });
      } catch (error) {
        if (ack) ack({ success: false, message: error.message });
      }
    });

    socket.on("thread:markRead", async ({ threadId }, ack) => {
      try {
        const result = await markThreadRead({ userId, threadId });
        if (ack) ack({ success: true, data: result });
      } catch (error) {
        if (ack) ack({ success: false, message: error.message });
      }
    });

    socket.on("request:create", async ({ tutorId }, ack) => {
      try {
        const result = await createMessageRequest({
          studentUser: socket.user,
          tutorId,
        });
        if (ack) ack({ success: true, data: result.thread });
      } catch (error) {
        if (ack) ack({ success: false, message: error.message });
      }
    });

    socket.on("request:approve", async ({ threadId }, ack) => {
      try {
        if (!isTutor(socket.user.role)) throw new Error("Only tutors can approve");
        const thread = await approveRequest({
          tutorUser: socket.user,
          threadId,
          approve: true,
        });
        if (ack) ack({ success: true, data: thread });
      } catch (error) {
        if (ack) ack({ success: false, message: error.message });
      }
    });

    socket.on("request:reject", async ({ threadId }, ack) => {
      try {
        if (!isTutor(socket.user.role)) throw new Error("Only tutors can reject");
        const thread = await approveRequest({
          tutorUser: socket.user,
          threadId,
          approve: false,
        });
        if (ack) ack({ success: true, data: thread });
      } catch (error) {
        if (ack) ack({ success: false, message: error.message });
      }
    });

    socket.on("presence:ping", (ack) => {
      if (ack) ack({ success: true, data: { userId, online: true } });
    });

    socket.on("live:join", async ({ sessionId }, ack) => {
      try {
        if (!sessionId) throw new Error("sessionId is required");
        const allowed = await canAccessLiveSession({ sessionId, user: socket.user });
        if (!allowed) throw new Error("Not allowed to join this live session");

        const room = `live:${String(sessionId)}`;
        socket.join(room);

        if (!socketLiveSessions.has(socket.id)) socketLiveSessions.set(socket.id, new Set());
        socketLiveSessions.get(socket.id).add(String(sessionId));

        const participants = addLiveParticipant(sessionId, socket.user);
        const others = Array.from(participants.values())
          .map((entry) => entry.user)
          .filter((item) => String(item._id) !== userId);

        socket.emit("live:participants", {
          sessionId: String(sessionId),
          participants: others,
        });
        socket.to(room).emit("live:user-joined", {
          sessionId: String(sessionId),
          user: { _id: userId, name: socket.user.name, role: socket.user.role },
        });
        if (ack) ack({ success: true });
      } catch (error) {
        if (ack) ack({ success: false, message: error.message || "Unable to join live session" });
      }
    });

    socket.on("live:leave", ({ sessionId }) => {
      if (!sessionId) return;
      const sid = String(sessionId);
      socket.leave(`live:${sid}`);
      if (socketLiveSessions.has(socket.id)) socketLiveSessions.get(socket.id).delete(sid);
      removeLiveParticipant(sid, userId);
      socket.to(`live:${sid}`).emit("live:user-left", {
        sessionId: sid,
        userId,
      });
    });

    socket.on("live:signal", ({ sessionId, targetUserId, payload }, ack) => {
      try {
        if (!sessionId || !targetUserId || !payload) throw new Error("Invalid live signal payload");
        io.to(`user:${String(targetUserId)}`).emit("live:signal", {
          sessionId: String(sessionId),
          fromUserId: userId,
          fromUserName: socket.user.name,
          fromRole: socket.user.role,
          payload,
        });
        if (ack) ack({ success: true });
      } catch (error) {
        if (ack) ack({ success: false, message: error.message || "Failed to relay signal" });
      }
    });

    socket.on("disconnect", () => {
      const joinedLiveSessions = socketLiveSessions.get(socket.id);
      if (joinedLiveSessions) {
        for (const sid of joinedLiveSessions.values()) {
          removeLiveParticipant(sid, userId);
          socket.to(`live:${sid}`).emit("live:user-left", {
            sessionId: sid,
            userId,
          });
        }
        socketLiveSessions.delete(socket.id);
      }
      const count = Math.max((onlineCounts.get(userId) || 1) - 1, 0);
      if (count <= 0) {
        onlineCounts.delete(userId);
        emitPresence(userId, false);
      } else {
        onlineCounts.set(userId, count);
      }
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
