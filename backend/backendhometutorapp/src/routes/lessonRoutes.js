const express = require("express");
const { updateLesson, deleteLesson } = require("../controllers/courseController");
const {
  markLessonComplete,
  getMyCourseProgress,
  getTutorProgressSummary,
} = require("../controllers/lessonProgressController");
const { protect } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");

const router = express.Router();

router.use(protect);
router.get("/progress/summary", requireRole("tutor"), getTutorProgressSummary);
router.get("/progress/me/:courseId", requireRole("student"), getMyCourseProgress);
router.post("/:lessonId/complete", requireRole("student"), markLessonComplete);

router.put("/:lessonId", requireRole("tutor"), upload.lessonUpload.single("lessonFile"), updateLesson);
router.delete("/:lessonId", requireRole("tutor"), deleteLesson);

module.exports = router;
