const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");

const normalizeRole = (role) => (role === "teacher" ? "tutor" : role);

/**
 * Protect routes – verifies JWT and attaches req.user
 */
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Not authorized, token missing");
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error("Not authorized, token invalid");
  }

  const decodedId = decoded?.id || decoded?._id || decoded?.userId || decoded?.adminId || null;
  let user = decodedId ? await User.findById(decodedId).select("-password") : null;
  if (!user && String(decoded?.role || "") === "admin" && decodedId) {
    user = await Admin.findById(decodedId).select("-password");
  }
  if (!user) {
    res.status(401);
    throw new Error("Not authorized, user not found");
  }

  // Check profile block flags
  const role = normalizeRole(user.role);
  if (role === "tutor") {
    const teacherProfile = await Teacher.findOne({ user: user._id });
    if (teacherProfile?.isBlocked === true) {
      res.status(403);
      throw new Error("Account is blocked");
    }
    req.teacherProfile = teacherProfile || null;
  }
  if (role === "student") {
    const studentProfile = await Student.findOne({ user: user._id });
    if (studentProfile?.isBlocked === true) {
      res.status(403);
      throw new Error("Account is blocked");
    }
    req.studentProfile = studentProfile || null;
  }

  req.user = user;
  next();
});

/**
 * Optional auth – attaches req.user if token present, but does not fail
 */
const optionalAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const decodedId = decoded?.id || decoded?._id || decoded?.userId || decoded?.adminId || null;
      let user = decodedId ? await User.findById(decodedId).select("-password") : null;
      if (!user && String(decoded?.role || "") === "admin" && decodedId) {
        user = await Admin.findById(decodedId).select("-password");
      }
      if (user) req.user = user;
    }
  } catch {
    // ignore – treat as unauthenticated
  }
  next();
};

module.exports = { protect, optionalAuth, normalizeRole };
