const express = require("express");
const { adminLogin } = require("../controllers/authController");
const {
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
} = require("../controllers/adminController");
const { protect } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/role.middleware");

const router = express.Router();

// POST /api/admin/login
router.post("/login", adminLogin);

// All routes below require admin auth
router.use(protect, adminOnly);

router.get("/dashboard-stats", getDashboardStats);
router.get("/profile", getAdminProfile);
router.put("/profile", updateAdminProfile);
router.get("/students", getStudents);
router.get("/teachers", getTeachers);
router.get("/pending-teachers", getPendingTeachers);
router.get("/courses", getCourses);
router.get("/enrollments", getEnrollments);
router.get("/payments", getPayments);
router.get("/sessions", getSessions);
router.post("/sessions", createSession);
router.delete("/sessions/clear-all", clearSessions);
router.put("/sessions/:id", updateSession);
router.delete("/sessions/:id", deleteSession);
router.get("/payout-settings", getPayoutSettings);
router.put("/approve-teacher/:id", approveTeacher);
router.put("/courses/:id/approve", approveCourse);
router.put("/courses/:id/reject", rejectCourse);
router.delete("/courses/:id", deleteCourse);
router.put("/enrollments/:id/approve", approveEnrollment);
router.put("/enrollments/:id/reject", rejectEnrollment);
router.put("/block-user/:id", blockUser);
router.delete("/delete-user/:id", deleteUser);

module.exports = router;




