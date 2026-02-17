const asyncHandler = require("express-async-handler");
const TeacherRequest = require("../models/TeacherRequest");
const Notification = require("../models/Notification");
const { getIO } = require("../services/socket.service");

// ─── GET /api/v1/teacher-requests ────────────────────────
const listRequests = asyncHandler(async (req, res) => {
  const role = req.user.role === "teacher" ? "tutor" : req.user.role;

  let filter = {};
  if (role === "tutor") filter.tutor = req.user._id;
  if (role === "student") filter.student = req.user._id;

  const requests = await TeacherRequest.find(filter)
    .populate("student", "name email")
    .populate("tutor", "name email")
    .populate("course", "title")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: requests });
});

// ─── POST /api/v1/teacher-requests ───────────────────────
const createRequest = asyncHandler(async (req, res) => {
  const { tutor, course, message } = req.body;

  const request = await TeacherRequest.create({
    tutor,
    student: req.user._id,
    course: course || undefined,
    message: message || "",
    status: "pending",
  });

  // Notify tutor
  const note = await Notification.create({
    user: tutor,
    message: `${req.user.name} sent you a tutor request.`,
  });

  const io = getIO();
  if (io) {
    io.to(`user:${tutor}`).emit("notification:new", { notification: note });
  }

  res.status(201).json({ success: true, data: request });
});

// ─── PUT /api/v1/teacher-requests/:id ────────────────────
const updateRequest = asyncHandler(async (req, res) => {
  const request = await TeacherRequest.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error("Request not found");
  }

  request.status = req.body.status || "pending";
  await request.save();

  // Notify student with more details
  const Course = require("../models/Course");
  const course = request.course ? await Course.findById(request.course).select("title") : null;
  const courseTitle = course ? course.title : "course";
  
  const note = await Notification.create({
    user: String(request.student),
    title: request.status === "accepted" ? "Request Approved!" : "Request Updated",
    message: request.status === "accepted" 
      ? `Your request for "${courseTitle}" has been approved! You can now access the course.`
      : `Your request for "${courseTitle}" was ${request.status}.`,
  });

  const io = getIO();
  if (io) {
    io.to(`user:${request.student}`).emit("notification:new", { notification: note });
  }

  res.json({ success: true, data: request });
});

module.exports = { listRequests, createRequest, updateRequest };


