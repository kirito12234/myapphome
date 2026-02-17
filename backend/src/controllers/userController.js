const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");

// ─── GET /api/v1/users/me ────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    data: {
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      role: u.role === "teacher" ? "tutor" : u.role,
      settings: u.settings || {},
      favoriteCourses: Array.isArray(u.favoriteCourses) ? u.favoriteCourses : [],
      favoriteLessons: Array.isArray(u.favoriteLessons) ? u.favoriteLessons : [],
    },
  });
});

// ─── PUT /api/v1/users/me ────────────────────────────────
const updateMe = asyncHandler(async (req, res) => {
  const u = req.user;
  if (req.body.name !== undefined) u.name = req.body.name;
  if (req.body.email !== undefined) u.email = req.body.email;
  if (req.body.phone !== undefined) u.phone = req.body.phone;
  await u.save();
  res.json({
    success: true,
    data: {
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      role: u.role === "teacher" ? "tutor" : u.role,
      settings: u.settings || {},
      favoriteCourses: Array.isArray(u.favoriteCourses) ? u.favoriteCourses : [],
      favoriteLessons: Array.isArray(u.favoriteLessons) ? u.favoriteLessons : [],
    },
  });
});

// ─── PUT /api/v1/users/me/password ───────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error("New password must be at least 6 characters");
  }

  // Fetch user with password
  const Model = req.user.constructor;
  const withPw = await Model.findById(req.user._id).select("+password");

  if (currentPassword) {
    const match = await bcrypt.compare(currentPassword, withPw.password);
    if (!match) {
      res.status(400);
      throw new Error("Current password is incorrect");
    }
  }

  withPw.password = newPassword; // pre-save hook will hash
  await withPw.save();

  res.json({ success: true, data: { message: "Password updated" } });
});

// ─── PUT /api/v1/users/me/settings ───────────────────────
const updateSettings = asyncHandler(async (req, res) => {
  const u = req.user;
  const incoming = req.body.settings || req.body;

  u.settings = {
    twoFactorEnabled: incoming.twoFactorEnabled ?? u.settings?.twoFactorEnabled ?? false,
    showProfile: incoming.showProfile ?? u.settings?.showProfile ?? true,
    emailUpdates: incoming.emailUpdates ?? u.settings?.emailUpdates ?? true,
    learnedDailyGoal: Number(incoming.learnedDailyGoal ?? u.settings?.learnedDailyGoal ?? 60) || 60,
  };

  await u.save();

  res.json({
    success: true,
    data: {
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      role: u.role === "teacher" ? "tutor" : u.role,
      settings: u.settings,
      favoriteCourses: Array.isArray(u.favoriteCourses) ? u.favoriteCourses : [],
      favoriteLessons: Array.isArray(u.favoriteLessons) ? u.favoriteLessons : [],
    },
  });
});

const listFavorites = asyncHandler(async (req, res) => {
  const user = await req.user.populate([
    {
      path: "favoriteCourses",
      populate: { path: "tutor", select: "name email" },
    },
    {
      path: "favoriteLessons",
      populate: { path: "course", select: "title category level price tutor", populate: { path: "tutor", select: "name email" } },
    },
  ]);
  res.json({
    success: true,
    data: {
      courses: user.favoriteCourses || [],
      lessons: user.favoriteLessons || [],
    },
  });
});

const addFavoriteCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await Course.findById(courseId).select("_id");
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  const id = String(course._id);
  const existing = (req.user.favoriteCourses || []).map((item) => String(item));
  if (!existing.includes(id)) {
    req.user.favoriteCourses = [...(req.user.favoriteCourses || []), course._id];
    await req.user.save();
  }
  res.json({ success: true, data: { favoriteCourses: req.user.favoriteCourses || [] } });
});

const removeFavoriteCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  req.user.favoriteCourses = (req.user.favoriteCourses || []).filter(
    (item) => String(item) !== String(courseId)
  );
  await req.user.save();
  res.json({ success: true, data: { favoriteCourses: req.user.favoriteCourses || [] } });
});

const addFavoriteLesson = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const lesson = await Lesson.findById(lessonId).select("_id");
  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }
  const id = String(lesson._id);
  const existing = (req.user.favoriteLessons || []).map((item) => String(item));
  if (!existing.includes(id)) {
    req.user.favoriteLessons = [...(req.user.favoriteLessons || []), lesson._id];
    await req.user.save();
  }
  res.json({ success: true, data: { favoriteLessons: req.user.favoriteLessons || [] } });
});

const removeFavoriteLesson = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  req.user.favoriteLessons = (req.user.favoriteLessons || []).filter(
    (item) => String(item) !== String(lessonId)
  );
  await req.user.save();
  res.json({ success: true, data: { favoriteLessons: req.user.favoriteLessons || [] } });
});

const listTutorCourseFavorites = asyncHandler(async (req, res) => {
  const role = req.user.role === "teacher" ? "tutor" : req.user.role;
  if (role !== "tutor") {
    res.status(403);
    throw new Error("Only tutor can view this data");
  }

  const tutorCourses = await Course.find({
    $or: [{ tutor: req.user._id }, { tutorId: req.user._id }, { teacher: req.user._id }],
  }).select("_id title category level price");

  const courseIds = tutorCourses.map((course) => String(course._id));
  if (courseIds.length === 0) {
    return res.json({
      success: true,
      data: { items: [], summary: { totalFavorites: 0, uniqueStudents: 0, uniqueCourses: 0 } },
    });
  }

  const students = await req.user.constructor
    .find({
      role: "student",
      favoriteCourses: { $in: courseIds },
    })
    .select("_id name email favoriteCourses");

  const courseMap = new Map(tutorCourses.map((course) => [String(course._id), course]));
  const items = [];

  students.forEach((student) => {
    (student.favoriteCourses || []).forEach((courseId) => {
      const key = String(courseId);
      const course = courseMap.get(key);
      if (!course) return;
      items.push({
        student: { _id: student._id, name: student.name, email: student.email },
        course: {
          _id: course._id,
          title: course.title,
          category: course.category,
          level: course.level,
          price: course.price,
        },
      });
    });
  });

  const uniqueStudents = new Set(items.map((item) => String(item.student._id))).size;
  const uniqueCourses = new Set(items.map((item) => String(item.course._id))).size;

  res.json({
    success: true,
    data: {
      items,
      summary: {
        totalFavorites: items.length,
        uniqueStudents,
        uniqueCourses,
      },
    },
  });
});

module.exports = {
  getMe,
  updateMe,
  changePassword,
  updateSettings,
  listFavorites,
  addFavoriteCourse,
  removeFavoriteCourse,
  addFavoriteLesson,
  removeFavoriteLesson,
  listTutorCourseFavorites,
};




