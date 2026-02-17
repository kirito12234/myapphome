const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const { notFound, errorHandler } = require("./middlewares/error.middleware");

// Route imports
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const payoutSettingRoutes = require("./routes/payoutSettingRoutes");
const threadRoutes = require("./routes/threadRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const teacherRequestRoutes = require("./routes/teacherRequestRoutes");
const tutorRoutes = require("./routes/tutorRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const messageRoutes = require("./routes/messageRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const inviteRoutes = require("./routes/inviteRoutes");
const liveSessionRoutes = require("./routes/liveSessionRoutes");

const app = express();

// ─── Global middleware ───────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow image serving
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        process.env.CLIENT_ORIGIN,
        process.env.CLIENT_URL,
        process.env.ADMIN_URL,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:4000",
      ].filter(Boolean);
      if (!origin || allowed.includes(origin)) return callback(null, true);
      return callback(new Error("CORS not allowed"), false);
    },
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static uploads ──────────────────────────────────────
const uploadRoot = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadRoot));

// ─── Health check ────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "API is healthy" });
});

// ─── Admin panel routes (baseURL: /api/admin) ────────────
app.use("/api/admin", adminRoutes);

// ─── Frontend API v1 routes (baseURL: /api/v1) ──────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/payout-settings", payoutSettingRoutes);
app.use("/api/v1/threads", threadRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/teacher-requests", teacherRequestRoutes);
app.use("/api/v1/tutors", tutorRoutes);
app.use("/api/v1/professionals", tutorRoutes); // alias
app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/v1/enrollments", enrollmentRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/lessons", lessonRoutes);
app.use("/api/v1/invites", inviteRoutes);
app.use("/api/v1/live-sessions", liveSessionRoutes);

// Alias routes required by clients expecting /api/*
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/live-sessions", liveSessionRoutes);

// ─── Error handling ──────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;




