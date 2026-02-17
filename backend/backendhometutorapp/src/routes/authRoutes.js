const express = require("express");
const {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middlewares/auth.middleware");
const { authRateLimiter } = require("../middlewares/rateLimit.middleware");

const router = express.Router();

// POST /api/v1/auth/register
router.post("/register", authRateLimiter, register);
router.post("/signup", authRateLimiter, register);

// POST /api/v1/auth/login
router.post("/login", authRateLimiter, login);

// POST /api/v1/auth/forgot-password
router.post("/forgot-password", authRateLimiter, forgotPassword);

// POST /api/v1/auth/reset-password
router.post("/reset-password", authRateLimiter, resetPassword);

// GET  /api/v1/auth/me
router.get("/me", protect, me);

module.exports = router;




