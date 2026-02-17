const express = require("express");
const { listSessions, createSession, updateSessionStatus } = require("../controllers/sessionController");
const { protect } = require("../middlewares/auth.middleware");
const { requireRole, tutorOrStudent } = require("../middlewares/role.middleware");

const router = express.Router();

router.use(protect);

// GET    /api/v1/sessions
router.get("/", listSessions);

// POST   /api/v1/sessions
router.post("/", requireRole("tutor"), createSession);

// PATCH  /api/v1/sessions/:id/status
router.patch("/:id/status", tutorOrStudent, updateSessionStatus);

module.exports = router;




