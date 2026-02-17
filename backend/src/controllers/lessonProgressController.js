const asyncHandler = require("express-async-handler");
const Lesson = require("../models/Lesson");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const TeacherRequest = require("../models/TeacherRequest");
const LessonProgress = require("../models/LessonProgress");
const Notification = require("../models/Notification");
const { getIO } = require("../services/socket.service");

const hasStudentAccess = async ({ studentId, courseId }) => {
  const [enrollment, acceptedRequest] = await Promise.all([
    Enrollment.findOne({ student: studentId, course: courseId }).select("_id"),
    TeacherRequest.findOne({ student: studentId, course: courseId, status: "accepted" }).select("_id"),
  ]);
  return !!enrollment || !!acceptedRequest;
};

const toPercent = (completed, total) => {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
};

// POST /api/v1/lessons/:lessonId/complete
const markLessonComplete = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId).select("_id course title");
  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }

  const course = await Course.findById(lesson.course).select("_id title tutor teacher");
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  const access = await hasStudentAccess({ studentId: req.user._id, courseId: course._id });
  if (!access) {
    res.status(403);
    throw new Error("You do not have access to this course");
  }

  const totalLessons = await Lesson.countDocuments({ course: course._id });
  let progress = await LessonProgress.findOne({ student: req.user._id, course: course._id });
  if (!progress) {
    progress = await LessonProgress.create({
      student: req.user._id,
      tutor: course.tutor || course.teacher,
      course: course._id,
      completedLessons: [],
    });
  }

  const alreadyCompleted = progress.completedLessons.some(
    (id) => String(id) === String(lesson._id)
  );
  if (!alreadyCompleted) {
    progress.completedLessons.push(lesson._id);
    progress.lastCompletedLesson = lesson._id;
    progress.lastCompletedAt = new Date();
  }

  progress.totalLessons = totalLessons;
  progress.completedCount = progress.completedLessons.length;
  progress.percentage = toPercent(progress.completedCount, totalLessons);
  await progress.save();

  if (!alreadyCompleted && (course.tutor || course.teacher)) {
    const io = getIO();
    const note = await Notification.create({
      user: String(course.tutor || course.teacher),
      type: "progress",
      title: "Lesson Completed",
      message: `${req.user.name} completed "${lesson.title}" in "${course.title}" (${progress.percentage}%).`,
    });
    if (io) {
      io.to(`user:${course.tutor || course.teacher}`).emit("notification:new", { notification: note });
      io.to(`user:${course.tutor || course.teacher}`).emit("lesson:progress-updated", {
        courseId: String(course._id),
        studentId: String(req.user._id),
        percentage: progress.percentage,
      });
    }
  }

  res.json({
    success: true,
    data: {
      courseId: String(course._id),
      completedCount: progress.completedCount,
      totalLessons,
      percentage: progress.percentage,
      completedLessonIds: progress.completedLessons.map((id) => String(id)),
    },
  });
});

// GET /api/v1/lessons/progress/me/:courseId
const getMyCourseProgress = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId).select("_id tutor teacher");
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  const access = await hasStudentAccess({ studentId: req.user._id, courseId: course._id });
  if (!access) {
    res.status(403);
    throw new Error("You do not have access to this course");
  }

  const totalLessons = await Lesson.countDocuments({ course: course._id });
  const progress = await LessonProgress.findOne({ student: req.user._id, course: course._id });
  const completedLessonIds = progress?.completedLessons?.map((id) => String(id)) || [];
  const completedCount = completedLessonIds.length;
  const percentage = toPercent(completedCount, totalLessons);

  res.json({
    success: true,
    data: {
      courseId: String(course._id),
      completedCount,
      totalLessons,
      percentage,
      completedLessonIds,
    },
  });
});

// GET /api/v1/lessons/progress/summary
const getTutorProgressSummary = asyncHandler(async (req, res) => {
  const tutorId = req.user._id;
  const courses = await Course.find({ tutor: tutorId }).select("_id title");
  const courseIds = courses.map((course) => course._id);
  if (!courseIds.length) {
    return res.json({
      success: true,
      data: {
        overallPercentage: 0,
        totalEnrolled: 0,
        completedStudents: 0,
        byCourse: [],
      },
    });
  }

  const [lessonCounts, enrollments, progressRows] = await Promise.all([
    Lesson.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: "$course", total: { $sum: 1 } } },
    ]),
    Enrollment.find({ course: { $in: courseIds } }).select("student course"),
    LessonProgress.find({ course: { $in: courseIds } }).select("student course completedLessons"),
  ]);

  const lessonCountByCourse = new Map(
    lessonCounts.map((row) => [String(row._id), Number(row.total || 0)])
  );
  const progressByKey = new Map();
  progressRows.forEach((row) => {
    progressByKey.set(`${row.student}:${row.course}`, row);
  });

  let totalPercent = 0;
  let totalEnrolled = 0;
  let completedStudents = 0;
  const byCourseAccumulator = new Map();

  enrollments.forEach((enroll) => {
    const courseId = String(enroll.course);
    const studentId = String(enroll.student);
    const totalLessons = lessonCountByCourse.get(courseId) || 0;
    const progress = progressByKey.get(`${studentId}:${courseId}`);
    const completedCount = progress?.completedLessons?.length || 0;
    const percent = toPercent(completedCount, totalLessons);

    totalEnrolled += 1;
    totalPercent += percent;
    if (percent >= 100 && totalLessons > 0) completedStudents += 1;

    const current = byCourseAccumulator.get(courseId) || {
      courseId,
      totalPercent: 0,
      totalStudents: 0,
    };
    current.totalPercent += percent;
    current.totalStudents += 1;
    byCourseAccumulator.set(courseId, current);
  });

  const titleByCourse = new Map(courses.map((course) => [String(course._id), course.title || "Course"]));
  const byCourse = Array.from(byCourseAccumulator.values()).map((item) => ({
    courseId: item.courseId,
    title: titleByCourse.get(item.courseId) || "Course",
    studentCount: item.totalStudents,
    averagePercentage: item.totalStudents > 0 ? Math.round(item.totalPercent / item.totalStudents) : 0,
  }));

  res.json({
    success: true,
    data: {
      overallPercentage: totalEnrolled > 0 ? Math.round(totalPercent / totalEnrolled) : 0,
      totalEnrolled,
      completedStudents,
      byCourse,
    },
  });
});

module.exports = {
  markLessonComplete,
  getMyCourseProgress,
  getTutorProgressSummary,
};
