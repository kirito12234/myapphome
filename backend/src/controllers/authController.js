const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const generateToken = require("../services/token.service");

// ─── helpers ─────────────────────────────────────────────
const safeUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone || "",
  role: u.role === "teacher" ? "tutor" : u.role,
  settings: u.settings || {},
  createdAt: u.createdAt,
});

const findByEmail = async (email) => {
  const lower = email.toLowerCase();
  return await User.findOne({ email: lower }).select("+password");
};

const findByPhone = async (phone) => {
  return await User.findOne({ phone }).select("+password");
};

// ─── POST /api/v1/auth/register ──────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, fullName, email, phone, password, role } = req.body;
  const userName = name || fullName || "User";
  const userEmail = email?.toLowerCase().trim();

  if (!userEmail) {
    res.status(400);
    throw new Error("Email is required");
  }
  if (!password || password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const existing = await User.findOne({ email: userEmail });
  if (existing) {
    res.status(400);
    throw new Error("Email already registered");
  }

  if (!role || !["student", "tutor", "teacher"].includes(String(role))) {
    res.status(400);
    throw new Error("role is required (student or tutor)");
  }

  const normalizedRole = role === "tutor" || role === "teacher" ? "teacher" : "student";

  const user = await User.create({
    name: userName,
    email: userEmail,
    phone: phone?.trim() || undefined,
    password,
    role: normalizedRole,
  });

  // Create profile doc
  if (normalizedRole === "teacher") {
    await Teacher.create({
      user: user._id,
      email: user.email,
            isApproved: false,
      isBlocked: false,
      subject: "",
      experience: "",
    });
  } else {
    await Student.create({ user: user._id, email: user.email, isBlocked: false });
  }

  const token = generateToken(user);
  res.status(201).json({
    success: true,
    data: { token, user: safeUser(user) },
    token,
    user: safeUser(user),
  });
});

// ─── POST /api/v1/auth/login ─────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { emailOrPhone, email, password, role } = req.body;
  const identity = (emailOrPhone || email || "").trim();

  if (!identity || !password) {
    res.status(400);
    throw new Error("Email/phone and password are required");
  }

  // Try email first, then phone
  let user = await findByEmail(identity);
  if (!user && identity.startsWith("+")) {
    user = await findByPhone(identity);
  }
  if (!user) {
    // Try phone even without +
    user = await findByPhone(identity);
  }

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  const userRole = user.role === "teacher" ? "tutor" : user.role;
  if (role && role !== userRole) {
    res.status(403);
    throw new Error(
      `This account is registered as ${userRole === "student" ? "Student" : "Tutor"}. Switch role to continue.`
    );
  }

  // profile block checks
  if (user.role === "teacher" || user.role === "tutor") {
    const t = await Teacher.findOne({ user: user._id });
    if (!t?.isApproved) {
      res.status(403);
      throw new Error("Your tutor account is pending admin approval");
    }
    if (t?.isBlocked) {
      res.status(403);
      throw new Error("Your account is blocked");
    }
  }
  if (user.role === "student") {
    const s = await Student.findOne({ user: user._id });
    if (s?.isBlocked) {
      res.status(403);
      throw new Error("Your account is blocked");
    }
  }

  const token = generateToken(user);
  res.status(200).json({
    success: true,
    data: { token, user: safeUser(user) },
    token,
    user: safeUser(user),
  });
});

// ─── GET /api/v1/auth/me ─────────────────────────────────
const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: safeUser(req.user) },
  });
});

// POST /api/v1/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const generateShortResetToken = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let token = "";
    do {
      token = "";
      for (let i = 0; i < 5; i += 1) {
        token += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (!/[0-9]/.test(token));
    return token;
  };

  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email }).select("+resetPasswordTokenHash +resetPasswordExpiresAt");
  if (!user) {
    res.status(404);
    throw new Error("No account found with this email");
  }

  const resetToken = generateShortResetToken();
  const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min

  user.resetPasswordTokenHash = resetTokenHash;
  user.resetPasswordExpiresAt = expiresAt;
  await user.save();

  // TODO: integrate with email provider.
  res.json({
    success: true,
    message: "Password reset token generated.",
    data: {
      resetToken,
      expiresAt,
    },
  });
});

// POST /api/v1/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const token = String(req.body.token || "").trim();
  const newPassword = String(req.body.newPassword || "");

  if (!token || !newPassword) {
    res.status(400);
    throw new Error("token and newPassword are required");
  }
  if (newPassword.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
  }).select("+password +resetPasswordTokenHash +resetPasswordExpiresAt");

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset token");
  }

  user.password = newPassword;
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();

  res.json({ success: true, message: "Password has been reset successfully." });
});

// ─── POST /api/admin/login ───────────────────────────────
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const loginEmail = email?.toLowerCase();
  let admin = await User.findOne({ email: loginEmail, role: "admin" }).select("+password");
  if (!admin) {
    admin = await Admin.findOne({ email: loginEmail, role: "admin" }).select("+password");
  }

  if (!admin || !(await admin.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.status(200).json({
    success: true,
    token: generateToken(admin),
    user: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt,
    },
  });
});

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
  adminLogin,
};

