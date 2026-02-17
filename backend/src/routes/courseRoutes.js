const express = require("express");
const {
  listCourses,
  createCourse,
  updateCourse,
  getCourse,
  deleteCourse,
  createLesson,
  updateLesson,
  deleteLesson,
} = require("../controllers/courseController");
const { protect, optionalAuth } = require("../middlewares/auth.middleware");
const { requireRole, tutorOnly } = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");

const router = express.Router();

// GET    /api/v1/courses
router.get("/", optionalAuth, listCourses);

// POST   /api/v1/courses
router.post(
  "/",
  protect,
  tutorOnly,
  upload.courseUpload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "coursePdf", maxCount: 1 },
  ]),
  createCourse
);

// PUT    /api/v1/courses/:id
router.put(
  "/:id",
  protect,
  tutorOnly,
  upload.courseEditUpload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "coursePdf", maxCount: 1 },
  ]),
  updateCourse
);

// GET    /api/v1/courses/:id
router.get("/:id", optionalAuth, getCourse);

// DELETE /api/v1/courses/:id
router.delete("/:id", protect, tutorOnly, deleteCourse);

// POST   /api/v1/courses/:id/lessons
router.post(
  "/:id/lessons",
  protect,
  tutorOnly,
  upload.lessonUpload.single("lessonFile"),
  createLesson
);

// PUT    /api/v1/lessons/:lessonId
router.put(
  "/lessons/:lessonId",
  protect,
  requireRole("tutor"),
  upload.lessonUpload.single("lessonFile"),
  updateLesson
);

// DELETE /api/v1/lessons/:lessonId
router.delete("/lessons/:lessonId", protect, requireRole("tutor"), deleteLesson);

module.exports = router;




