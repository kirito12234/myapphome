const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const {
  listCourseLiveSessions,
  startCourseLiveSession,
  endLiveSession,
  joinLiveSession,
  leaveLiveSession,
} = require("../controllers/liveSessionController");

const router = express.Router();

router.use(protect);

router.get("/course/:courseId", requireRole("tutor", "student"), listCourseLiveSessions);
router.post("/course/:courseId/start", requireRole("tutor"), startCourseLiveSession);
router.patch("/:id/end", requireRole("tutor"), endLiveSession);
router.post("/:id/join", requireRole("tutor", "student"), joinLiveSession);
router.post("/:id/leave", requireRole("tutor", "student"), leaveLiveSession);

module.exports = router;
