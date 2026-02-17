const mongoose = require("mongoose");
const Thread = require("../models/Thread");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const TeacherRequest = require("../models/TeacherRequest");

const getSocketIO = () => {
  try {
    // lazy import avoids circular init issues with socket.service
    return require("./socket.service").getIO();
  } catch (_error) {
    return null;
  }
};

const normalizeRole = (role) => (role === "teacher" ? "tutor" : role);
const isTutor = (role) => normalizeRole(role) === "tutor";

const toIdString = (value) => String(value);

const toUserSummary = (user) => ({
  _id: toIdString(user._id),
  name: user.name,
  role: normalizeRole(user.role),
  avatarUrl: user.avatarUrl || "",
});

const serializeThread = (thread, currentUserId, userById = new Map()) => {
  const participantIds = (thread.participants || []).map((p) => toIdString(p));
  const unreadBy = (thread.unreadBy || []).map((p) => toIdString(p));
  const otherParticipantId = participantIds.find((id) => id !== currentUserId) || null;
  const otherParticipant = otherParticipantId ? userById.get(otherParticipantId) : null;
  const readMap = thread.lastReadAt instanceof Map ? thread.lastReadAt : new Map();

  const lastReadAt = {};
  for (const [key, value] of readMap.entries()) {
    lastReadAt[key] = value;
  }

  return {
    _id: toIdString(thread._id),
    id: toIdString(thread._id),
    participants: participantIds,
    studentId: thread.studentId ? toIdString(thread.studentId) : null,
    tutorId: thread.tutorId ? toIdString(thread.tutorId) : null,
    status: thread.status,
    requestedBy: thread.requestedBy ? toIdString(thread.requestedBy) : null,
    approvedAt: thread.approvedAt,
    rejectedAt: thread.rejectedAt,
    lastMessageAt: thread.lastMessageAt,
    lastMessageText: thread.lastMessageText || "",
    unreadBy,
    isUnread: unreadBy.includes(currentUserId),
    lastReadAt,
    otherParticipantId,
    otherParticipantName: otherParticipant?.name || "",
    otherParticipantRole: otherParticipant ? normalizeRole(otherParticipant.role) : "",
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
  };
};

const serializeMessage = (message, senderUser) => ({
  _id: toIdString(message._id),
  threadId: toIdString(message.threadId),
  text: message.text,
  createdAt: message.createdAt,
  sender: senderUser
    ? toUserSummary(senderUser)
    : { _id: toIdString(message.senderId), name: message.senderName || "User", role: message.senderRole || "student" },
});

const emitThreadUpdated = async (thread) => {
  const io = getSocketIO();
  if (!io) return;

  const participantIds = (thread.participants || []).map((p) => toIdString(p));
  const users = await User.find({ _id: { $in: participantIds } }).select("name role avatarUrl");
  const userById = new Map(users.map((u) => [toIdString(u._id), u]));
  for (const userId of participantIds) {
    io.to(`user:${userId}`).emit("thread:updated", {
      thread: serializeThread(thread, userId, userById),
    });
  }
};

const createAndEmitNotification = async ({
  userId,
  type,
  title,
  body,
  metadata = {},
}) => {
  const notification = await Notification.create({
    userId,
    type,
    title,
    body,
    message: body,
    metadata,
    isRead: false,
  });

  const io = getSocketIO();
  if (io) {
    io.to(`user:${toIdString(userId)}`).emit("notification:new", { notification });
  }

  return notification;
};

const assertThreadAccess = (thread, userId) => {
  const participantIds = (thread.participants || []).map((p) => toIdString(p));
  if (!participantIds.includes(toIdString(userId))) {
    const error = new Error("Not authorized to access this thread");
    error.statusCode = 403;
    throw error;
  }
};

const findUsersByIds = async (ids) => {
  const users = await User.find({ _id: { $in: ids } }).select("name role avatarUrl");
  const byId = new Map(users.map((u) => [toIdString(u._id), u]));
  return byId;
};

const createMessageRequest = async ({ studentUser, tutorId }) => {
  if (normalizeRole(studentUser.role) !== "student") {
    const error = new Error("Only students can create message requests");
    error.statusCode = 403;
    throw error;
  }

  const tutor = await User.findById(tutorId);
  if (!tutor || !isTutor(tutor.role)) {
    const error = new Error("Tutor not found");
    error.statusCode = 404;
    throw error;
  }

  const studentId = studentUser._id;
  const now = new Date();
  const within24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const existingOpen = await Thread.findOne({
    studentId,
    tutorId,
    status: { $in: ["pending", "approved"] },
  });

  if (existingOpen) {
    return { thread: existingOpen, created: false, reason: "existing_open_thread" };
  }

  const recentRejected = await Thread.findOne({
    studentId,
    tutorId,
    status: "rejected",
    createdAt: { $gte: within24h },
  });

  if (recentRejected) {
    const error = new Error("A recent request was rejected. Try again after 24 hours.");
    error.statusCode = 429;
    throw error;
  }

  const thread = await Thread.create({
    participants: [studentId, tutorId],
    studentId,
    tutorId,
    status: "pending",
    requestedBy: studentId,
    unreadBy: [tutorId],
    lastReadAt: new Map([[toIdString(studentId), now]]),
    lastMessageAt: null,
    lastMessageText: "",
  });

  await createAndEmitNotification({
    userId: tutorId,
    type: "request",
    title: "New Message Request",
    body: `${studentUser.name} requested to chat.`,
    metadata: { threadId: toIdString(thread._id), fromUserId: toIdString(studentId) },
  });

  await emitThreadUpdated(thread);
  return { thread, created: true };
};

const startThreadAsTutor = async ({ tutorUser, studentId }) => {
  if (!isTutor(tutorUser.role)) {
    const error = new Error("Only tutors can start chats with students");
    error.statusCode = 403;
    throw error;
  }

  const student = await User.findById(studentId).select("name role");
  if (!student || normalizeRole(student.role) !== "student") {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }

  const tutorCourses = await Course.find({ tutor: tutorUser._id }).select("_id");
  const courseIds = tutorCourses.map((c) => c._id);
  const [enrollment, acceptedRequest] = await Promise.all([
    Enrollment.findOne({ student: studentId, course: { $in: courseIds } }).select("_id"),
    TeacherRequest.findOne({
      student: studentId,
      tutor: tutorUser._id,
      status: "accepted",
    }).select("_id"),
  ]);

  if (!enrollment && !acceptedRequest) {
    const error = new Error("Student is not enrolled with this tutor");
    error.statusCode = 403;
    throw error;
  }

  const existingOpen = await Thread.findOne({
    studentId,
    tutorId: tutorUser._id,
    status: { $in: ["pending", "approved"] },
  });

  if (existingOpen) {
    return { thread: existingOpen, created: false, reason: "existing_open_thread" };
  }

  const now = new Date();
  const thread = await Thread.create({
    participants: [studentId, tutorUser._id],
    studentId,
    tutorId: tutorUser._id,
    status: "approved",
    requestedBy: tutorUser._id,
    approvedAt: now,
    unreadBy: [studentId],
    lastReadAt: new Map([[toIdString(tutorUser._id), now]]),
    lastMessageAt: null,
    lastMessageText: "",
  });

  await createAndEmitNotification({
    userId: studentId,
    type: "approval",
    title: "Tutor started a chat",
    body: `${tutorUser.name} started a chat with you.`,
    metadata: { threadId: toIdString(thread._id), fromUserId: toIdString(tutorUser._id) },
  });

  await emitThreadUpdated(thread);
  return { thread, created: true };
};

const approveRequest = async ({ tutorUser, threadId, approve }) => {
  if (!isTutor(tutorUser.role)) {
    const error = new Error("Only tutors can approve or reject requests");
    error.statusCode = 403;
    throw error;
  }

  const thread = await Thread.findById(threadId);
  if (!thread) {
    const error = new Error("Thread not found");
    error.statusCode = 404;
    throw error;
  }

  assertThreadAccess(thread, tutorUser._id);
  if (toIdString(thread.tutorId) !== toIdString(tutorUser._id)) {
    const error = new Error("Only the thread tutor can approve or reject");
    error.statusCode = 403;
    throw error;
  }
  if (thread.status !== "pending") {
    const error = new Error(`Thread is already ${thread.status}`);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  if (approve) {
    thread.status = "approved";
    thread.approvedAt = now;
    thread.rejectedAt = null;
  } else {
    thread.status = "rejected";
    thread.rejectedAt = now;
  }

  const studentId = toIdString(thread.studentId);
  if (studentId) {
    thread.unreadBy = Array.from(
      new Set([...(thread.unreadBy || []).map((v) => toIdString(v)), studentId])
    );
  }

  await thread.save();

  await createAndEmitNotification({
    userId: thread.studentId,
    type: "approval",
    title: approve ? "Message Request Approved" : "Message Request Rejected",
    body: approve ? `${tutorUser.name} approved your chat request.` : `${tutorUser.name} rejected your chat request.`,
    metadata: { threadId: toIdString(thread._id), fromUserId: toIdString(tutorUser._id) },
  });

  await emitThreadUpdated(thread);
  return thread;
};

const listThreadsForUser = async (userId) => {
  const threads = await Thread.find({ participants: userId }).sort({
    lastMessageAt: -1,
    updatedAt: -1,
  });
  const participantIds = Array.from(
    new Set(threads.flatMap((thread) => (thread.participants || []).map((id) => toIdString(id))))
  );
  const users = await User.find({ _id: { $in: participantIds } }).select("name role avatarUrl");
  const userById = new Map(users.map((u) => [toIdString(u._id), u]));
  return threads.map((thread) => serializeThread(thread, toIdString(userId), userById));
};

const listMessagesForThread = async ({ userId, threadId }) => {
  const thread = await Thread.findById(threadId);
  if (!thread) {
    const error = new Error("Thread not found");
    error.statusCode = 404;
    throw error;
  }
  assertThreadAccess(thread, userId);

  const messages = await Message.find({ threadId }).sort({ createdAt: 1 });
  const senderIds = Array.from(new Set(messages.map((m) => toIdString(m.senderId))));
  const userById = await findUsersByIds(senderIds);

  return messages.map((m) => serializeMessage(m, userById.get(toIdString(m.senderId))));
};

const markThreadRead = async ({ userId, threadId }) => {
  const thread = await Thread.findById(threadId);
  if (!thread) {
    const error = new Error("Thread not found");
    error.statusCode = 404;
    throw error;
  }
  assertThreadAccess(thread, userId);

  const now = new Date();
  thread.lastReadAt = thread.lastReadAt || new Map();
  thread.lastReadAt.set(toIdString(userId), now);
  thread.unreadBy = (thread.unreadBy || []).filter((id) => toIdString(id) !== toIdString(userId));
  await thread.save();

  const io = getSocketIO();
  if (io) {
    io.to(`thread:${toIdString(thread._id)}`).emit("thread:read", {
      threadId: toIdString(thread._id),
      userId: toIdString(userId),
      lastReadAt: now,
    });
  }

  await emitThreadUpdated(thread);
  return { threadId: toIdString(thread._id), userId: toIdString(userId), lastReadAt: now };
};

const sendThreadMessage = async ({ senderUser, threadId, text }) => {
  const cleanText = String(text || "").trim();
  if (!cleanText || cleanText.length > 2000) {
    const error = new Error("Message text must be between 1 and 2000 characters");
    error.statusCode = 400;
    throw error;
  }

  const thread = await Thread.findById(threadId);
  if (!thread) {
    const error = new Error("Thread not found");
    error.statusCode = 404;
    throw error;
  }
  assertThreadAccess(thread, senderUser._id);
  if (thread.status !== "approved") {
    const error = new Error("Cannot send message until thread is approved");
    error.statusCode = 403;
    throw error;
  }

  const senderId = toIdString(senderUser._id);
  const otherParticipantIds = (thread.participants || [])
    .map((id) => toIdString(id))
    .filter((id) => id !== senderId);

  const message = await Message.create({
    threadId: thread._id,
    senderId: senderUser._id,
    sender: senderId,
    senderRole: normalizeRole(senderUser.role),
    senderName: senderUser.name,
    text: cleanText,
  });

  const now = new Date();
  thread.lastMessageAt = now;
  thread.lastMessageText = cleanText;
  thread.lastReadAt = thread.lastReadAt || new Map();
  thread.lastReadAt.set(senderId, now);

  const unreadBy = new Set((thread.unreadBy || []).map((id) => toIdString(id)));
  for (const other of otherParticipantIds) unreadBy.add(other);
  unreadBy.delete(senderId);
  thread.unreadBy = Array.from(unreadBy);

  await thread.save();

  const payload = serializeMessage(message, senderUser);
  const io = getSocketIO();
  if (io) {
    const participantIds = (thread.participants || []).map((p) => toIdString(p));
    const users = await User.find({ _id: { $in: participantIds } }).select("name role avatarUrl");
    const userById = new Map(users.map((u) => [toIdString(u._id), u]));
    io.to(`thread:${toIdString(thread._id)}`).emit("message:new", {
      threadId: toIdString(thread._id),
      message: payload,
    });
    for (const participantId of participantIds) {
      io.to(`user:${participantId}`).emit("message:new", {
        threadId: toIdString(thread._id),
        message: payload,
      });
    }
    for (const participantId of participantIds) {
      io.to(`user:${participantId}`).emit("thread:updated", {
        thread: serializeThread(thread, participantId, userById),
      });
    }
  }

  for (const recipientId of otherParticipantIds) {
    await createAndEmitNotification({
      userId: recipientId,
      type: "message",
      title: `New message from ${senderUser.name}`,
      body: cleanText.slice(0, 160),
      metadata: {
        threadId: toIdString(thread._id),
        fromUserId: senderId,
      },
    });
  }

  return payload;
};

const searchMessages = async ({ userId, query }) => {
  const regex = new RegExp(query, "i");
  const threads = await Thread.find({ participants: userId }).select("_id");
  const threadIds = threads.map((t) => t._id);

  if (!threadIds.length) return [];

  const messages = await Message.find({
    threadId: { $in: threadIds },
    text: regex,
  })
    .sort({ createdAt: -1 })
    .limit(100);

  const senderIds = Array.from(new Set(messages.map((m) => toIdString(m.senderId))));
  const userById = await findUsersByIds(senderIds);

  return messages.map((message) => ({
    ...serializeMessage(message, userById.get(toIdString(message.senderId))),
    threadId: toIdString(message.threadId),
  }));
};

const joinThreadRoomIfAllowed = async ({ socket, userId, threadId }) => {
  if (!mongoose.Types.ObjectId.isValid(threadId)) return false;
  const thread = await Thread.findById(threadId).select("_id participants");
  if (!thread) return false;

  const participantIds = (thread.participants || []).map((id) => toIdString(id));
  if (!participantIds.includes(toIdString(userId))) return false;
  socket.join(`thread:${toIdString(thread._id)}`);
  return true;
};

module.exports = {
  createMessageRequest,
  startThreadAsTutor,
  approveRequest,
  listThreadsForUser,
  listMessagesForThread,
  markThreadRead,
  sendThreadMessage,
  searchMessages,
  joinThreadRoomIfAllowed,
  normalizeRole,
  isTutor,
};
