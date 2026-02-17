const asyncHandler = require("express-async-handler");
const Session = require("../models/Session");
const Notification = require("../models/Notification");
const { getIO } = require("../services/socket.service");
const mongoose = require("mongoose");

// ─── GET /api/v1/sessions ────────────────────────────────
const listSessions = asyncHandler(async (req, res) => {
  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  const filter =
    role === "tutor"
      ? { tutor: req.user._id }
      : { student: req.user._id };

  const sessions = await Session.find(filter)
    .populate("tutor", "name")
    .populate("student", "name")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: sessions });
});

// ─── POST /api/v1/sessions ──────────────────────────────
const createSession = asyncHandler(async (req, res) => {
  const courseRef =
    req.body.courseRef && mongoose.Types.ObjectId.isValid(req.body.courseRef)
      ? req.body.courseRef
      : undefined;

  const session = await Session.create({
    tutor: req.user._id,
    student: req.body.student || undefined,
    course: req.body.course || "",
    courseRef,
    date: req.body.date || "",
    time: req.body.time || "",
    duration: Number(req.body.duration) || 60,
    mode: req.body.mode || "online",
    notes: req.body.notes || "",
  });

  // ── Notify the student about the new session ──────────
  if (session.student) {
    try {
      const note = await Notification.create({
        user: String(session.student),
        title: "New Session Scheduled",
        message: `Your tutor ${req.user.name} scheduled a session on ${session.date || "TBD"} at ${session.time || "TBD"}.`,
      });
      const io = getIO();
      if (io) {
        io.to(`user:${session.student}`).emit("notification:new", { notification: note });
      }
    } catch (err) {
      console.error("Session notification error:", err.message);
    }
  }

  res.status(201).json({ success: true, data: session });
});

// PATCH /api/v1/sessions/:id/status
const updateSessionStatus = asyncHandler(async (req, res) => {
  const status = String(req.body.status || "").toLowerCase();
  if (!["scheduled", "completed", "cancelled"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  const userId = String(req.user._id);
  const isTutorOwner = String(session.tutor || "") === userId;
  const isStudentOwner = String(session.student || "") === userId;

  if (role === "tutor" && !isTutorOwner) {
    res.status(403);
    throw new Error("Not allowed to update this session");
  }
  if (role === "student" && !isStudentOwner) {
    res.status(403);
    throw new Error("Not allowed to update this session");
  }

  session.status = status;
  await session.save();

  res.json({ success: true, data: session });
});

module.exports = { listSessions, createSession, updateSessionStatus };
