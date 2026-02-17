const fs = require("fs");
const path = require("path");
const asyncHandler = require("express-async-handler");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const User = require("../models/User");
const Notification = require("../models/Notification");
const TeacherRequest = require("../models/TeacherRequest");
const Enrollment = require("../models/Enrollment");
const { getIO } = require("../services/socket.service");

const normalizeRole = (role) => (role === "teacher" ? "tutor" : role);

const toUploadUrl = (absolutePath) => {
  const normalized = absolutePath.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/uploads/");
  return idx >= 0 ? normalized.slice(idx) : "";
};

const safelyDeleteFile = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== "string" || !fileUrl.startsWith("/uploads/")) return;
  const fullPath = path.join(__dirname, "../../", fileUrl);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch {
      // best effort
    }
  }
};

const getStudentAllowedCourseIds = async (studentId) => {
  const enrolls = await Enrollment.find({
    student: studentId,
    status: "active",
  }).select("course");
  const ids = new Set();
  enrolls.forEach((e) => e.course && ids.add(String(e.course)));
  return Array.from(ids);
};

const notifyStudentsForCourse = async ({ courseId, title, message }) => {
  const io = getIO();
  const [reqs, enrolls] = await Promise.all([
    TeacherRequest.find({ course: courseId, status: "accepted" }).select("student"),
    Enrollment.find({ course: courseId }).select("student"),
  ]);
  const studentIds = new Set();
  reqs.forEach((r) => r.student && studentIds.add(String(r.student)));
  enrolls.forEach((e) => e.student && studentIds.add(String(e.student)));

  for (const sid of studentIds) {
    const note = await Notification.create({
      user: String(sid),
      title: title || "",
      message: message || "",
    });
    if (io) {
      io.to(`user:${sid}`).emit("notification:new", { notification: note });
    }
  }
};

const ensureTutorOwner = async ({ courseId, userId }) => {
  const course = await Course.findById(courseId);
  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }
  if (String(course.tutor || course.teacher || "") !== String(userId)) {
    const error = new Error("Not authorized to modify this course");
    error.statusCode = 403;
    throw error;
  }
  return course;
};

const inferFileType = (mimetype) => {
  if (mimetype === "application/pdf") return "pdf";
  if (mimetype === "video/mp4" || mimetype === "video/webm") return "video";
  if (String(mimetype || "").startsWith("image/")) return "image";
  return "resource";
};

const parseNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const listCourses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.search) {
    const pattern = String(req.query.search).trim();
    filter.$or = [
      { title: { $regex: pattern, $options: "i" } },
      { description: { $regex: pattern, $options: "i" } },
      { category: { $regex: pattern, $options: "i" } },
    ];
  }
  if (req.query.category) filter.category = String(req.query.category);
  if (req.query.level) filter.level = String(req.query.level);
  if (req.query.isPopular === "true") filter.isPopular = true;

  const normalizedRole = req.user ? normalizeRole(req.user.role) : "";

  if (normalizedRole === "tutor") {
    filter.tutor = req.user._id;
  } else if (normalizedRole === "student" || !req.user) {
    filter.isPublished = true;
    filter.approvalStatus = { $in: ["approved", null] };
  }

  const courses = await Course.find(filter).populate("tutor", "name email").sort({ createdAt: -1 });

  if (normalizedRole === "student") {
    const allowedIds = await getStudentAllowedCourseIds(req.user._id);
    return res.json({
      success: true,
      data: courses.map((course) => ({
        ...course.toObject(),
        hasAccess: allowedIds.includes(String(course._id)),
      })),
    });
  }

  res.json({ success: true, data: courses });
});

const createCourse = asyncHandler(async (req, res) => {
  const files = req.files || {};
  const thumbnail = Array.isArray(files.thumbnail) ? files.thumbnail[0] : null;
  const coursePdf = Array.isArray(files.coursePdf) ? files.coursePdf[0] : null;

  if (!req.body.title || !String(req.body.title).trim()) {
    res.status(400);
    throw new Error("title is required");
  }
  if (!coursePdf) {
    res.status(400);
    throw new Error("coursePdf is required");
  }

  const course = await Course.create({
    tutorId: req.user._id,
    tutor: req.user._id,
    teacher: req.user._id,
    title: String(req.body.title).trim(),
    description: String(req.body.description || "").trim(),
    category: String(req.body.category || "General").trim(),
    level: String(req.body.level || "Beginner").trim(),
    subject: String(req.body.subject || "").trim(),
    price: parseNum(req.body.price),
    durationHours: parseNum(req.body.durationHours),
    lessonCount: parseNum(req.body.lessonCount),
    scheduleDate: String(req.body.scheduleDate || "").trim(),
    scheduleTime: String(req.body.scheduleTime || "").trim(),
    thumbnailUrl: thumbnail ? toUploadUrl(thumbnail.path) : "",
    imageUrl: thumbnail ? toUploadUrl(thumbnail.path) : "",
    coursePdfUrl: toUploadUrl(coursePdf.path),
    features: Array.isArray(req.body.features) ? req.body.features : [],
    isNewCourse: true,
    isPublished: false,
    approvalStatus: "pending",
    approvedByAdminAt: null,
    approvedByAdmin: null,
    rejectionReason: "",
  });

  const populated = await Course.findById(course._id).populate("tutor", "name email");

  // Course stays pending until admin approval.

  res.status(201).json({ success: true, data: populated });
});

const updateCourse = asyncHandler(async (req, res) => {
  const course = await ensureTutorOwner({ courseId: req.params.id, userId: req.user._id });
  const files = req.files || {};
  const thumbnail = Array.isArray(files.thumbnail) ? files.thumbnail[0] : null;
  const coursePdf = Array.isArray(files.coursePdf) ? files.coursePdf[0] : null;

  if (req.body.title !== undefined) course.title = String(req.body.title || "").trim();
  if (req.body.description !== undefined) course.description = String(req.body.description || "").trim();
  if (req.body.category !== undefined) course.category = String(req.body.category || "General").trim();
  if (req.body.level !== undefined) course.level = String(req.body.level || "Beginner").trim();
  if (req.body.price !== undefined) course.price = parseNum(req.body.price);

  if (thumbnail) {
    safelyDeleteFile(course.thumbnailUrl || course.imageUrl);
    const url = toUploadUrl(thumbnail.path);
    course.thumbnailUrl = url;
    course.imageUrl = url;
  }
  if (coursePdf) {
    safelyDeleteFile(course.coursePdfUrl);
    course.coursePdfUrl = toUploadUrl(coursePdf.path);
  }

  // Any tutor change requires admin re-approval before students see it.
  course.approvalStatus = "pending";
  course.isPublished = false;
  course.approvedByAdminAt = null;
  course.approvedByAdmin = null;

  await course.save();
  const populated = await Course.findById(course._id).populate("tutor", "name email");
  res.json({ success: true, data: populated });
});

const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id).populate("tutor", "name email");
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  if ((course.approvalStatus && course.approvalStatus !== "approved") || !course.isPublished) {
    const role = req.user ? normalizeRole(req.user.role) : "";
    if (role !== "tutor" && role !== "admin") {
      res.status(403);
      throw new Error("Course is pending admin approval");
    }
  }

  if (req.user && normalizeRole(req.user.role) === "student") {
    const allowedIds = await getStudentAllowedCourseIds(req.user._id);
    const hasAccess = allowedIds.includes(String(course._id));
    if (!hasAccess) {
      return res.json({
        success: true,
        data: {
          ...course.toObject(),
          lessons: [],
          hasAccess: false,
          accessRequired: true,
        },
      });
    }
  }

  const lessons = await Lesson.find({ course: course._id }).sort({ orderIndex: 1, createdAt: 1 });
  res.json({ success: true, data: { ...course.toObject(), lessons, hasAccess: true } });
});

const deleteCourse = asyncHandler(async (req, res) => {
  const course = await ensureTutorOwner({ courseId: req.params.id, userId: req.user._id });
  const lessons = await Lesson.find({ course: course._id });
  lessons.forEach((l) => {
    safelyDeleteFile(l.fileUrl);
    safelyDeleteFile(l.pdfUrl);
    safelyDeleteFile(l.imageUrl);
  });
  await Lesson.deleteMany({ course: course._id });
  safelyDeleteFile(course.thumbnailUrl || course.imageUrl);
  safelyDeleteFile(course.coursePdfUrl);
  await course.deleteOne();
  res.json({ success: true, data: { deleted: true } });
});

const createLesson = asyncHandler(async (req, res) => {
  const course = await ensureTutorOwner({ courseId: req.params.id, userId: req.user._id });
  if (!req.file) {
    res.status(400);
    throw new Error("lessonFile is required");
  }

  const fileType = req.body.fileType || inferFileType(req.file.mimetype);
  const fileUrl = toUploadUrl(req.file.path);
  const orderIndex = parseNum(req.body.orderIndex, 1);

  const lesson = await Lesson.create({
    courseId: course._id,
    course: course._id,
    title: String(req.body.title || "Lesson").trim(),
    description: String(req.body.description || "").trim(),
    fileUrl,
    fileType,
    orderIndex,
    order: orderIndex,
    pdfUrl: fileType === "pdf" ? fileUrl : "",
    pdfName: fileType === "pdf" ? req.file.originalname : "",
  });

  await notifyStudentsForCourse({
    courseId: course._id,
    title: "New Lesson Added",
    message: `New lesson added in "${course.title}": ${lesson.title}`,
  });

  res.status(201).json({ success: true, data: lesson });
});

const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }
  await ensureTutorOwner({ courseId: lesson.course, userId: req.user._id });

  if (req.body.title !== undefined) lesson.title = String(req.body.title || "").trim();
  if (req.body.description !== undefined) lesson.description = String(req.body.description || "").trim();
  if (req.body.orderIndex !== undefined) {
    lesson.orderIndex = parseNum(req.body.orderIndex, lesson.orderIndex || 1);
    lesson.order = lesson.orderIndex;
  }

  if (req.file) {
    safelyDeleteFile(lesson.fileUrl || lesson.pdfUrl || lesson.imageUrl);
    const nextUrl = toUploadUrl(req.file.path);
    const nextType = req.body.fileType || inferFileType(req.file.mimetype);
    lesson.fileUrl = nextUrl;
    lesson.fileType = nextType;
    lesson.pdfUrl = nextType === "pdf" ? nextUrl : "";
    lesson.pdfName = nextType === "pdf" ? req.file.originalname : "";
    lesson.imageUrl = nextType === "image" || nextType === "resource" ? nextUrl : "";
  }

  await lesson.save();
  res.json({ success: true, data: lesson });
});

const deleteLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }
  await ensureTutorOwner({ courseId: lesson.course, userId: req.user._id });
  safelyDeleteFile(lesson.fileUrl || lesson.pdfUrl || lesson.imageUrl);
  await lesson.deleteOne();
  res.json({ success: true, data: { deleted: true } });
});

module.exports = {
  listCourses,
  createCourse,
  updateCourse,
  getCourse,
  deleteCourse,
  createLesson,
  updateLesson,
  deleteLesson,
};
