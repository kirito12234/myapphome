const asyncHandler = require("express-async-handler");
const {
  createMessageRequest,
  startThreadAsTutor,
  approveRequest,
  listThreadsForUser,
  listMessagesForThread,
  markThreadRead,
  sendThreadMessage,
  searchMessages,
} = require("../services/messaging.service");

const handleServiceError = (res, error) => {
  res.status(error.statusCode || 400);
  throw error;
};

const listThreads = asyncHandler(async (req, res) => {
  const threads = await listThreadsForUser(req.user._id);
  res.json({ success: true, data: threads });
});

const createThread = asyncHandler(async (req, res) => {
  const tutorId =
    req.body.tutorId ||
    req.body?.participants?.find((id) => String(id) !== String(req.user._id));
  if (!tutorId) {
    res.status(400);
    throw new Error("tutorId is required");
  }
  try {
    const { thread, created } = await createMessageRequest({
      studentUser: req.user,
      tutorId,
    });
    res.status(created ? 201 : 200).json({
      success: true,
      data: thread,
      message: created ? "Message request created" : "Existing thread returned",
    });
  } catch (error) {
    handleServiceError(res, error);
  }
});

const requestThread = createThread;

const startTutorThread = asyncHandler(async (req, res) => {
  const studentId = req.body.studentId;
  if (!studentId) {
    res.status(400);
    throw new Error("studentId is required");
  }
  try {
    const { thread, created } = await startThreadAsTutor({
      tutorUser: req.user,
      studentId,
    });
    res.status(created ? 201 : 200).json({
      success: true,
      data: thread,
      message: created ? "Chat started" : "Existing thread returned",
    });
  } catch (error) {
    handleServiceError(res, error);
  }
});

const approveThread = asyncHandler(async (req, res) => {
  try {
    const thread = await approveRequest({
      tutorUser: req.user,
      threadId: req.params.threadId,
      approve: true,
    });
    res.json({ success: true, data: thread, message: "Request approved" });
  } catch (error) {
    handleServiceError(res, error);
  }
});

const rejectThread = asyncHandler(async (req, res) => {
  try {
    const thread = await approveRequest({
      tutorUser: req.user,
      threadId: req.params.threadId,
      approve: false,
    });
    res.json({ success: true, data: thread, message: "Request rejected" });
  } catch (error) {
    handleServiceError(res, error);
  }
});

const listMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await listMessagesForThread({
      userId: req.user._id,
      threadId: req.params.threadId,
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    handleServiceError(res, error);
  }
});

const sendMessage = asyncHandler(async (req, res) => {
  try {
    const message = await sendThreadMessage({
      senderUser: req.user,
      threadId: req.params.threadId,
      text: req.body.text,
    });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    handleServiceError(res, error);
  }
});

const markAsRead = asyncHandler(async (req, res) => {
  try {
    const data = await markThreadRead({
      userId: req.user._id,
      threadId: req.params.threadId,
    });
    res.json({ success: true, data });
  } catch (error) {
    handleServiceError(res, error);
  }
});

const searchThreadMessages = asyncHandler(async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query) {
    res.status(400);
    throw new Error("q query param is required");
  }
  try {
    const results = await searchMessages({ userId: req.user._id, query });
    res.json({ success: true, data: results });
  } catch (error) {
    handleServiceError(res, error);
  }
});

const getThreadRequests = asyncHandler(async (req, res) => {
  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  if (role !== "tutor") {
    res.status(403);
    throw new Error("Only tutors can view message requests");
  }

  const threads = await listThreadsForUser(req.user._id);
  const pending = threads.filter((thread) => thread.status === "pending");
  res.json({ success: true, data: pending });
});

const createRequestFromSocketUser = async ({ user, tutorId }) =>
  createMessageRequest({ studentUser: user, tutorId });

const approveRequestFromSocketUser = async ({ user, threadId, approve }) =>
  approveRequest({ tutorUser: user, threadId, approve });

module.exports = {
  listThreads,
  createThread,
  requestThread,
  startTutorThread,
  approveThread,
  rejectThread,
  listMessages,
  sendMessage,
  markAsRead,
  searchThreadMessages,
  getThreadRequests,
  createRequestFromSocketUser,
  approveRequestFromSocketUser,
};
