const express = require("express");
const Joi = require("joi");
const {
  listThreads,
  requestThread,
  startTutorThread,
  approveThread,
  rejectThread,
  listMessages,
  sendMessage,
  markAsRead,
  searchThreadMessages,
} = require("../controllers/threadController");
const { protect } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { messageSendRateLimiter } = require("../middlewares/rateLimit.middleware");

const router = express.Router();

const requestSchema = Joi.object({
  tutorId: Joi.string().required(),
});
const tutorStartSchema = Joi.object({
  studentId: Joi.string().required(),
});

const sendSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required(),
});

router.use(protect);

router.get("/threads", listThreads);
router.post(
  "/threads/request",
  requireRole("student"),
  validate(requestSchema),
  requestThread
);
router.post(
  "/threads/start",
  requireRole("tutor"),
  validate(tutorStartSchema),
  startTutorThread
);
router.post("/threads/:threadId/approve", requireRole("tutor"), approveThread);
router.post("/threads/:threadId/reject", requireRole("tutor"), rejectThread);
router.get("/threads/:threadId/messages", listMessages);
router.post(
  "/threads/:threadId/messages",
  messageSendRateLimiter,
  validate(sendSchema),
  sendMessage
);
router.post("/threads/:threadId/read", markAsRead);
router.get("/search", searchThreadMessages);

module.exports = router;
