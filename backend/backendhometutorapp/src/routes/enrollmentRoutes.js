const express = require("express");
const {
  listEnrollments,
  createEnrollment,
  deleteEnrollment,
} = require("../controllers/enrollmentController");
const { protect } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");

const router = express.Router();

// GET /api/v1/enrollments
router.get("/", protect, listEnrollments);
router.post("/", protect, requireRole("student"), createEnrollment);
router.delete("/:id", protect, deleteEnrollment);

module.exports = router;




