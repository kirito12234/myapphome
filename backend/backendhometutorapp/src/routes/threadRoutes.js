const express = require("express");
const Joi = require("joi");
const {
  listThreads,
  createThread,
  requestThread,
  approveThread,
  rejectThread,
  listMessages,
  sendMessage,
  markAsRead,
  searchThreadMessages,
  getThreadRequests,
} = require("../controllers/threadController");
const { protect } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { messageSendRateLimiter } = require("../middlewares/rateLimit.middleware");

const router = express.Router();

router.use(protect);

const requestSchema = Joi.object({
  tutorId: Joi.string().required(),
});

const messageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required(),
});

// GET    /api/v1/threads
router.get("/", listThreads);

// POST   /api/v1/threads
router.post("/", requireRole("student"), validate(requestSchema), createThread);

// POST   /api/v1/threads/request
router.post(
  "/request",
  requireRole("student"),
  validate(requestSchema),
  requestThread
);

// GET /api/v1/threads/requests
router.get("/requests", requireRole("tutor"), getThreadRequests);

// POST /api/v1/threads/:threadId/approve
router.post("/:threadId/approve", requireRole("tutor"), approveThread);

// POST /api/v1/threads/:threadId/reject
router.post("/:threadId/reject", requireRole("tutor"), rejectThread);

// GET /api/v1/threads/search/messages?q=
router.get("/search/messages", searchThreadMessages);

// GET    /api/v1/threads/:threadId/messages
router.get("/:threadId/messages", listMessages);

// POST   /api/v1/threads/:threadId/messages
router.post(
  "/:threadId/messages",
  messageSendRateLimiter,
  validate(messageSchema),
  sendMessage
);

// POST /api/v1/threads/:threadId/read
router.post("/:threadId/read", markAsRead);

module.exports = router;




