const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Course = require("../models/Course");
const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const Notification = require("../models/Notification");
const PayoutSetting = require("../models/PayoutSetting");
const Session = require("../models/Session");
const { getIO } = require("../services/socket.service");

// ─── GET /api/admin/dashboard-stats ──────────────────────
const getDashboardStats = asyncHandler(async (_req, res) => {
  const [
    totalStudents,
    totalTeachers,
    approvedTeachers,
    pendingTeachers,
    totalCourses,
    pendingCourseApprovals,
    pendingEnrollmentApprovals,
    paymentSummary,
  ] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "teacher" }),
    Teacher.countDocuments({ isApproved: true }),
    Teacher.countDocuments({ isApproved: false }),
    Course.countDocuments(),
    Course.countDocuments({ approvalStatus: "pending" }),
    Enrollment.countDocuments({ status: "pending_admin" }),
    Payment.aggregate([
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          paidPayments: {
            $sum: { $cond: [{ $in: ["$status", ["paid", "approved"]] }, 1, 0] },
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          totalRevenue: {
            $sum: {
              $cond: [{ $in: ["$status", ["paid", "approved"]] }, "$amount", 0],
            },
          },
        },
      },
    ]),
  ]);

  const ps = paymentSummary[0] || {
    totalPayments: 0,
    paidPayments: 0,
    pendingPayments: 0,
    totalRevenue: 0,
  };

  res.json({
    success: true,
    data: {
      totalStudents,
      totalTeachers,
      approvedTeachers,
      pendingTeachers,
      totalCourses,
      pendingCourseApprovals,
      pendingEnrollmentApprovals,
      totalPayments: ps.totalPayments,
      paidPayments: ps.paidPayments,
      pendingPayments: ps.pendingPayments,
      totalRevenue: ps.totalRevenue,
    },
  });
});

// ─── GET /api/admin/students ─────────────────────────────
const getStudents = asyncHandler(async (_req, res) => {
  const users = await User.find({ role: "student" }).sort({ createdAt: -1 });
  const profiles = await Student.find({ user: { $in: users.map((u) => u._id) } });
  const byUser = new Map(profiles.map((p) => [String(p.user), p]));
  const data = users.map((u) => {
    const p = byUser.get(String(u._id));
    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      isBlocked: p?.isBlocked || false,
      createdAt: u.createdAt,
    };
  });
  res.json({ success: true, data });
});

// ─── GET /api/admin/teachers ─────────────────────────────
const getTeachers = asyncHandler(async (_req, res) => {
  const users = await User.find({ role: "teacher" }).sort({ createdAt: -1 });
  const profiles = await Teacher.find({ user: { $in: users.map((u) => u._id) } });
  const byUser = new Map(profiles.map((p) => [String(p.user), p]));
  const data = users.map((u) => {
    const p = byUser.get(String(u._id));
    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      subject: p?.subject || "",
      experience: p?.experience || "",
      isApproved: p?.isApproved || false,
      isBlocked: p?.isBlocked || false,
      createdAt: u.createdAt,
    };
  });
  res.json({ success: true, data });
});

// ─── GET /api/admin/pending-teachers ─────────────────────
const getPendingTeachers = asyncHandler(async (_req, res) => {
  const profiles = await Teacher.find({ isApproved: false }).sort({ createdAt: -1 });
  const users = await User.find({ _id: { $in: profiles.map((p) => p.user) } });
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const data = profiles.map((p) => {
    const u = byId.get(String(p.user));
    return {
      _id: u?._id || p.user,
      name: u?.name || "Teacher",
      email: u?.email || "",
      phone: u?.phone || "",
      subject: p.subject || "",
      experience: p.experience || "",
      isApproved: p.isApproved || false,
      isBlocked: p.isBlocked || false,
      createdAt: u?.createdAt || p.createdAt,
    };
  });
  res.json({ success: true, data });
});

// ─── GET /api/admin/courses ──────────────────────────────
const getCourses = asyncHandler(async (_req, res) => {
  const courses = await Course.find()
    .populate("teacher", "name email")
    .populate("tutor", "name email")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: courses });
});

// GET /api/admin/enrollments
const getEnrollments = asyncHandler(async (_req, res) => {
  const enrollments = await Enrollment.find()
    .populate("student", "name email")
    .populate("course", "title price tutor")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: enrollments });
});

// ─── GET /api/admin/payments ─────────────────────────────
const getPayments = asyncHandler(async (_req, res) => {
  const payments = await Payment.find()
    .populate("student", "name email")
    .populate("course", "title subject")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: payments });
});

// GET /api/admin/sessions
const getSessions = asyncHandler(async (_req, res) => {
  const sessions = await Session.find()
    .populate("tutor", "name email")
    .populate("student", "name email")
    .populate("courseRef", "title")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: sessions });
});

// POST /api/admin/sessions
const createSession = asyncHandler(async (req, res) => {
  const {
    studentId,
    tutorId,
    courseId,
    course,
    scheduledAt,
    date,
    time,
    durationMinutes,
    duration,
    mode,
    notes,
  } = req.body || {};

  const courseDoc =
    courseId && mongoose.Types.ObjectId.isValid(courseId)
      ? await Course.findById(courseId).populate("tutor", "name")
      : null;

  const resolvedTutorId =
    tutorId ||
    courseDoc?.tutor?._id ||
    courseDoc?.tutor ||
    courseDoc?.teacher ||
    undefined;
  const resolvedStudentId = studentId || req.body.student || undefined;

  let dateValue = String(date || "").trim();
  let timeValue = String(time || "").trim();
  if (!dateValue && scheduledAt) {
    const dt = new Date(scheduledAt);
    if (!Number.isNaN(dt.getTime())) {
      dateValue = dt.toISOString().slice(0, 10);
      timeValue = dt.toTimeString().slice(0, 5);
    }
  }

  const session = await Session.create({
    tutor: resolvedTutorId,
    student: resolvedStudentId,
    course: courseDoc?.title || course || "",
    courseRef: courseDoc?._id,
    date: dateValue,
    time: timeValue,
    duration: Number(durationMinutes || duration || 60),
    mode: String(mode || "online").toLowerCase(),
    notes: notes || "",
    status: "scheduled",
  });

  const io = getIO();
  if (session.student) {
    const note = await Notification.create({
      userId: session.student,
      user: String(session.student),
      type: "notification",
      title: "Session Scheduled",
      body: `Admin scheduled a session${session.course ? ` for "${session.course}"` : ""}.`,
      message: `Admin scheduled a session${session.course ? ` for "${session.course}"` : ""}.`,
      metadata: { sessionId: String(session._id) },
    });
    if (io) io.to(`user:${session.student}`).emit("notification:new", { notification: note });
  }
  if (session.tutor) {
    const note = await Notification.create({
      userId: session.tutor,
      user: String(session.tutor),
      type: "notification",
      title: "Session Scheduled",
      body: `Admin scheduled a session${session.course ? ` for "${session.course}"` : ""}.`,
      message: `Admin scheduled a session${session.course ? ` for "${session.course}"` : ""}.`,
      metadata: { sessionId: String(session._id) },
    });
    if (io) io.to(`user:${session.tutor}`).emit("notification:new", { notification: note });
  }

  res.status(201).json({ success: true, data: session });
});

// PUT /api/admin/sessions/:id
const updateSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  const nextStatus = String(req.body.status || "").toLowerCase();
  if (nextStatus && ["scheduled", "completed", "cancelled"].includes(nextStatus)) {
    session.status = nextStatus;
  }

  if (req.body.scheduledAt) {
    const dt = new Date(req.body.scheduledAt);
    if (!Number.isNaN(dt.getTime())) {
      session.date = dt.toISOString().slice(0, 10);
      session.time = dt.toTimeString().slice(0, 5);
    }
  }
  if (req.body.date !== undefined) session.date = String(req.body.date || "");
  if (req.body.time !== undefined) session.time = String(req.body.time || "");
  if (req.body.mode !== undefined) session.mode = String(req.body.mode || "online").toLowerCase();
  if (req.body.durationMinutes !== undefined) session.duration = Number(req.body.durationMinutes || 60);
  if (req.body.duration !== undefined) session.duration = Number(req.body.duration || 60);
  if (req.body.notes !== undefined) session.notes = String(req.body.notes || "");

  await session.save();
  res.json({ success: true, data: session });
});

// DELETE /api/admin/sessions/:id
const deleteSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }
  await session.deleteOne();
  res.json({ success: true, message: "Session deleted", data: { deleted: true } });
});

// DELETE /api/admin/sessions/clear-all
const clearSessions = asyncHandler(async (_req, res) => {
  const result = await Session.deleteMany({});
  res.json({ success: true, data: { deletedCount: result.deletedCount || 0 } });
});

// GET /api/admin/payout-settings
const getPayoutSettings = asyncHandler(async (_req, res) => {
  const settings = await PayoutSetting.find()
    .populate("tutor", "name email")
    .sort({ updatedAt: -1, createdAt: -1 });
  res.json({ success: true, data: settings });
});

// ─── GET /api/admin/profile ──────────────────────────────
const getAdminProfile = asyncHandler(async (req, res) => {
  let admin = await User.findById(req.user._id);
  if (!admin || admin.role !== "admin") {
    admin = await Admin.findById(req.user._id);
  }
  if (!admin || admin.role !== "admin") {
    res.status(404);
    throw new Error("Admin not found");
  }
  res.json({ success: true, data: admin });
});

// ─── PUT /api/admin/profile ──────────────────────────────
const updateAdminProfile = asyncHandler(async (req, res) => {
  let admin = await User.findById(req.user._id);
  if (!admin || admin.role !== "admin") {
    admin = await Admin.findById(req.user._id);
  }
  if (!admin || admin.role !== "admin") {
    res.status(404);
    throw new Error("Admin not found");
  }
  if (req.body.name) admin.name = req.body.name.trim();
  await admin.save();
  res.json({ success: true, message: "Admin profile updated", data: admin });
});

// ─── PUT /api/admin/approve-teacher/:id ──────────────────
const approveTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ user: req.params.id });
  if (!teacher) {
    res.status(404);
    throw new Error("Teacher not found");
  }
  teacher.isApproved = true;
  await teacher.save();
  const io = getIO();
  const note = await Notification.create({
    userId: teacher.user,
    user: String(teacher.user),
    type: "approval",
    title: "Tutor Account Approved",
    body: "Your tutor account has been approved by admin. You can now log in.",
    message: "Your tutor account has been approved by admin. You can now log in.",
  });
  if (io) io.to(`user:${teacher.user}`).emit("notification:new", { notification: note });
  res.json({ success: true, message: "Teacher approved successfully" });
});

// PUT /api/admin/courses/:id/approve
const approveCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id).populate("tutor", "name");
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  course.approvalStatus = "approved";
  course.isPublished = true;
  course.approvedByAdminAt = new Date();
  course.approvedByAdmin = req.user._id;
  course.rejectionReason = "";
  await course.save();

  const io = getIO();
  const students = await User.find({ role: "student" }).select("_id");
  for (const student of students) {
    const note = await Notification.create({
      userId: student._id,
      user: String(student._id),
      type: "approval",
      title: "New Course Approved",
      body: `New course "${course.title}" is now available.`,
      message: `New course "${course.title}" is now available.`,
      metadata: { courseId: String(course._id) },
    });
    if (io) {
      io.to(`user:${student._id}`).emit("notification:new", { notification: note });
    }
  }

  if (course.tutor?._id) {
    const tutorNote = await Notification.create({
      userId: course.tutor._id,
      user: String(course.tutor._id),
      type: "approval",
      title: "Course Approved",
      body: `Your course "${course.title}" was approved by admin.`,
      message: `Your course "${course.title}" was approved by admin.`,
      metadata: { courseId: String(course._id) },
    });
    if (io) {
      io.to(`user:${course.tutor._id}`).emit("notification:new", { notification: tutorNote });
    }
  }

  res.json({ success: true, message: "Course approved successfully", data: course });
});

// PUT /api/admin/courses/:id/reject
const rejectCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id).populate("tutor", "name");
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  course.approvalStatus = "rejected";
  course.isPublished = false;
  course.approvedByAdminAt = null;
  course.approvedByAdmin = null;
  course.rejectionReason = String(req.body.reason || "").trim();
  await course.save();

  const io = getIO();
  if (course.tutor?._id) {
    const note = await Notification.create({
      userId: course.tutor._id,
      user: String(course.tutor._id),
      type: "approval",
      title: "Course Rejected",
      body: `Your course "${course.title}" was rejected by admin.${course.rejectionReason ? ` Reason: ${course.rejectionReason}` : ""}`,
      message: `Your course "${course.title}" was rejected by admin.${course.rejectionReason ? ` Reason: ${course.rejectionReason}` : ""}`,
      metadata: { courseId: String(course._id) },
    });
    if (io) {
      io.to(`user:${course.tutor._id}`).emit("notification:new", { notification: note });
    }
  }

  res.json({ success: true, message: "Course rejected successfully", data: course });
});

// DELETE /api/admin/courses/:id
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  await course.deleteOne();
  await Enrollment.deleteMany({ course: course._id });
  await Payment.deleteMany({ course: course._id });
  res.json({ success: true, message: "Course deleted", data: { deleted: true } });
});

// PUT /api/admin/enrollments/:id/approve
const approveEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id).populate("course", "title tutor");
  if (!enrollment) {
    res.status(404);
    throw new Error("Enrollment not found");
  }
  enrollment.status = "active";
  enrollment.approvedByAdminAt = new Date();
  enrollment.approvedByAdmin = req.user._id;
  enrollment.rejectionReason = "";
  await enrollment.save();

  const io = getIO();
  const studentNote = await Notification.create({
    userId: enrollment.student,
    user: String(enrollment.student),
    type: "enrollment",
    title: "Enrollment Approved",
    body: `Your enrollment for "${enrollment.course?.title || "course"}" was approved by admin.`,
    message: `Your enrollment for "${enrollment.course?.title || "course"}" was approved by admin.`,
    metadata: { enrollmentId: String(enrollment._id), courseId: String(enrollment.course?._id || "") },
  });
  if (io) {
    io.to(`user:${enrollment.student}`).emit("notification:new", { notification: studentNote });
    io.to(`user:${enrollment.student}`).emit("payment:status-updated", {
      courseId: String(enrollment.course?._id || ""),
      status: "approved",
      hasAccess: true,
    });
  }

  const tutorId = enrollment.course?.tutor;
  if (tutorId) {
    const tutorNote = await Notification.create({
      userId: tutorId,
      user: String(tutorId),
      type: "enrollment",
      title: "Student Enrollment Activated",
      body: `Admin approved a student enrollment for "${enrollment.course?.title || "your course"}".`,
      message: `Admin approved a student enrollment for "${enrollment.course?.title || "your course"}".`,
      metadata: { enrollmentId: String(enrollment._id), studentId: String(enrollment.student) },
    });
    if (io) io.to(`user:${tutorId}`).emit("notification:new", { notification: tutorNote });
  }

  res.json({ success: true, message: "Enrollment approved", data: enrollment });
});

// PUT /api/admin/enrollments/:id/reject
const rejectEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id).populate("course", "title tutor");
  if (!enrollment) {
    res.status(404);
    throw new Error("Enrollment not found");
  }
  enrollment.status = "rejected_by_admin";
  enrollment.approvedByAdminAt = null;
  enrollment.approvedByAdmin = null;
  enrollment.rejectionReason = String(req.body.reason || "").trim();
  await enrollment.save();

  const io = getIO();
  const studentNote = await Notification.create({
    userId: enrollment.student,
    user: String(enrollment.student),
    type: "enrollment",
    title: "Enrollment Rejected",
    body: `Your enrollment for "${enrollment.course?.title || "course"}" was rejected by admin.${enrollment.rejectionReason ? ` Reason: ${enrollment.rejectionReason}` : ""}`,
    message: `Your enrollment for "${enrollment.course?.title || "course"}" was rejected by admin.${enrollment.rejectionReason ? ` Reason: ${enrollment.rejectionReason}` : ""}`,
    metadata: { enrollmentId: String(enrollment._id), courseId: String(enrollment.course?._id || "") },
  });
  if (io) io.to(`user:${enrollment.student}`).emit("notification:new", { notification: studentNote });

  res.json({ success: true, message: "Enrollment rejected", data: enrollment });
});

// ─── PUT /api/admin/block-user/:id ───────────────────────
const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid user id");
  }
  const blockValue =
    typeof req.body.isBlocked === "boolean" ? req.body.isBlocked : true;

  const u = await User.findById(id);
  if (!u) {
    res.status(404);
    throw new Error("User not found");
  }

  if (u.role === "student") {
    await Student.findOneAndUpdate(
      { user: u._id },
      { $set: { isBlocked: blockValue } },
      { upsert: true }
    );
    return res.json({ success: true, message: "Student block status updated" });
  }

  if (u.role === "teacher") {
    await Teacher.findOneAndUpdate(
      { user: u._id },
      { $set: { isBlocked: blockValue } },
      { upsert: true }
    );
    return res.json({ success: true, message: "Teacher block status updated" });
  }

  res.status(404);
  throw new Error("User not found");
});

// ─── DELETE /api/admin/delete-user/:id ───────────────────
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid user id");
  }

  const u = await User.findById(id);
  if (!u) {
    res.status(404);
    throw new Error("User not found");
  }

  if (u.role === "student") await Student.findOneAndDelete({ user: u._id });
  if (u.role === "teacher") await Teacher.findOneAndDelete({ user: u._id });
  await User.findByIdAndDelete(u._id);
  return res.json({ success: true, message: "User deleted" });

});

module.exports = {
  getDashboardStats,
  getStudents,
  getTeachers,
  getPendingTeachers,
  getCourses,
  getEnrollments,
  getPayments,
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  clearSessions,
  getPayoutSettings,
  getAdminProfile,
  updateAdminProfile,
  approveTeacher,
  approveCourse,
  rejectCourse,
  deleteCourse,
  approveEnrollment,
  rejectEnrollment,
  blockUser,
  deleteUser,
};
