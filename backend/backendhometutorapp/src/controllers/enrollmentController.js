const asyncHandler = require("express-async-handler");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

// ─── GET /api/v1/enrollments ─────────────────────────────
const listEnrollments = asyncHandler(async (req, res) => {
  const filter = {};
  const role = req.user.role === "teacher" ? "tutor" : req.user.role;

  if (role === "student") {
    filter.student = req.user._id;
  } else if (role === "tutor") {
    // Find courses owned by this tutor, then find enrollments for those courses
    const tutorCourses = await Course.find({ tutor: req.user._id }).select("_id");
    const courseIds = tutorCourses.map((c) => c._id);
    filter.course = { $in: courseIds };
  }

  const enrollments = await Enrollment.find(filter)
    .populate("student", "name email")
    .populate("course", "title category price")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: enrollments });
});

const createEnrollment = asyncHandler(async (req, res) => {
  const courseId = req.body.courseId;
  if (!courseId) {
    res.status(400);
    throw new Error("courseId is required");
  }

  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  const exists = await Enrollment.findOne({
    student: req.user._id,
    course: courseId,
  });
  if (exists) {
    if (exists.status === "rejected_by_admin") {
      exists.status = "pending_admin";
      exists.rejectionReason = "";
      exists.approvedByAdminAt = null;
      exists.approvedByAdmin = null;
      await exists.save();
      return res.json({
        success: true,
        data: exists,
        message: "Enrollment request re-submitted for admin approval",
      });
    }
    return res.json({ success: true, data: exists, message: "Enrollment request already submitted" });
  }

  const enrollment = await Enrollment.create({
    student: req.user._id,
    course: courseId,
    status: "pending_admin",
  });

  res.status(201).json({
    success: true,
    data: enrollment,
    message: "Enrollment request submitted. Waiting for admin approval.",
  });
});

const deleteEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) {
    res.status(404);
    throw new Error("Enrollment not found");
  }

  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  const isOwnerStudent = String(enrollment.student) === String(req.user._id);

  let isOwnerTutor = false;
  if (role === "tutor") {
    const course = await Course.findById(enrollment.course).select("tutor");
    isOwnerTutor = !!course && String(course.tutor) === String(req.user._id);
  }

  if (role !== "admin" && !isOwnerStudent && !isOwnerTutor) {
    res.status(403);
    throw new Error("Not authorized to delete this enrollment");
  }

  await enrollment.deleteOne();
  res.json({ success: true, message: "Enrollment deleted" });
});

module.exports = { listEnrollments, createEnrollment, deleteEnrollment };
