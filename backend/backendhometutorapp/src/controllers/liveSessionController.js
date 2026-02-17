const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const LiveSession = require("../models/LiveSession");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const TeacherRequest = require("../models/TeacherRequest");
const Notification = require("../models/Notification");

const normalizeRole = (role) => (role === "teacher" ? "tutor" : role);
const toId = (value) => String(value);
const getIO = () => {
  try {
    return require("../services/socket.service").getIO();
  } catch (_error) {
    return null;
  }
};

const getAcceptedStudentIdsForCourse = async (courseId) => {
  const [enrollments, requests] = await Promise.all([
    Enrollment.find({ course: courseId }).select("student"),
    TeacherRequest.find({ course: courseId, status: "accepted" }).select("student"),
  ]);
  const ids = new Set();
  enrollments.forEach((item) => item.student && ids.add(toId(item.student)));
  requests.forEach((item) => item.student && ids.add(toId(item.student)));
  return Array.from(ids);
};

const ensureTutorOwnsCourse = async ({ courseId, userId }) => {
  const course = await Course.findById(courseId);
  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }
  const ownerId = toId(course.tutor || course.tutorId || course.teacher || "");
  if (ownerId !== toId(userId)) {
    const error = new Error("Not authorized to manage live session for this course");
    error.statusCode = 403;
    throw error;
  }
  return course;
};

const ensureCanAccessCourseLive = async ({ courseId, user }) => {
  const role = normalizeRole(user.role);
  if (role === "tutor") {
    await ensureTutorOwnsCourse({ courseId, userId: user._id });
    return true;
  }
  if (role !== "student") {
    const error = new Error("Only tutor or student can access live sessions");
    error.statusCode = 403;
    throw error;
  }
  const acceptedStudentIds = await getAcceptedStudentIdsForCourse(courseId);
  if (!acceptedStudentIds.includes(toId(user._id))) {
    const error = new Error("You are not enrolled in this course");
    error.statusCode = 403;
    throw error;
  }
  return true;
};

const listCourseLiveSessions = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  await ensureCanAccessCourseLive({ courseId, user: req.user });

  const sessions = await LiveSession.find({ course: courseId })
    .populate("tutor", "name role")
    .populate("activeParticipantIds", "name role")
    .sort({ startedAt: -1, createdAt: -1 });

  res.json({ success: true, data: sessions });
});

const startCourseLiveSession = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await ensureTutorOwnsCourse({ courseId, userId: req.user._id });

  let liveSession = await LiveSession.findOne({ course: courseId, status: "active" });
  if (!liveSession) {
    liveSession = await LiveSession.create({
      course: course._id,
      tutor: req.user._id,
      status: "active",
      startedAt: new Date(),
      activeParticipantIds: [req.user._id],
      participants: [{ user: req.user._id, joinedAt: new Date() }],
    });

    const studentIds = await getAcceptedStudentIdsForCourse(course._id);
    const io = getIO();
    if (io) {
      io.to(`user:${toId(req.user._id)}`).emit("live:started", {
        courseId: toId(course._id),
        sessionId: toId(liveSession._id),
        tutorId: toId(req.user._id),
      });
    }
    for (const studentId of studentIds) {
      const notification = await Notification.create({
        userId: studentId,
        user: studentId,
        type: "notification",
        title: "Live session started",
        body: `${req.user.name} is live now in ${course.title}. Join now.`,
        message: `${req.user.name} is live now in ${course.title}. Join now.`,
        metadata: {
          courseId: toId(course._id),
          liveSessionId: toId(liveSession._id),
          tutorId: toId(req.user._id),
        },
      });
      if (io) io.to(`user:${studentId}`).emit("notification:new", { notification });
      if (io) {
        io.to(`user:${studentId}`).emit("live:started", {
          courseId: toId(course._id),
          sessionId: toId(liveSession._id),
          tutorId: toId(req.user._id),
        });
      }
    }
  }

  res.status(201).json({ success: true, data: liveSession });
});

const endLiveSession = asyncHandler(async (req, res) => {
  const liveSession = await LiveSession.findById(req.params.id);
  if (!liveSession) {
    res.status(404);
    throw new Error("Live session not found");
  }

  await ensureTutorOwnsCourse({ courseId: liveSession.course, userId: req.user._id });
  if (liveSession.status !== "ended") {
    liveSession.status = "ended";
    liveSession.endedAt = new Date();
    liveSession.activeParticipantIds = [];
    liveSession.participants = (liveSession.participants || []).map((item) => ({
      ...item.toObject?.(),
      user: item.user,
      joinedAt: item.joinedAt,
      leftAt: item.leftAt || new Date(),
    }));
    await liveSession.save();
  }

  const io = getIO();
  if (io) {
    io.to(`live:${toId(liveSession._id)}`).emit("live:ended", {
      sessionId: toId(liveSession._id),
      courseId: toId(liveSession.course),
    });
    io.to(`user:${toId(req.user._id)}`).emit("live:ended", {
      sessionId: toId(liveSession._id),
      courseId: toId(liveSession.course),
    });
    const studentIds = await getAcceptedStudentIdsForCourse(liveSession.course);
    for (const studentId of studentIds) {
      io.to(`user:${studentId}`).emit("live:ended", {
        sessionId: toId(liveSession._id),
        courseId: toId(liveSession.course),
      });
    }
  }

  res.json({ success: true, data: liveSession });
});

const joinLiveSession = asyncHandler(async (req, res) => {
  const liveSession = await LiveSession.findById(req.params.id);
  if (!liveSession) {
    res.status(404);
    throw new Error("Live session not found");
  }
  if (liveSession.status !== "active") {
    res.status(400);
    throw new Error("Live session already ended");
  }

  await ensureCanAccessCourseLive({ courseId: liveSession.course, user: req.user });

  const userId = toId(req.user._id);
  const activeSet = new Set((liveSession.activeParticipantIds || []).map((id) => toId(id)));
  activeSet.add(userId);
  liveSession.activeParticipantIds = Array.from(activeSet);

  const existingOpen = (liveSession.participants || []).find(
    (item) => toId(item.user) === userId && !item.leftAt
  );
  if (!existingOpen) {
    liveSession.participants = [
      ...(liveSession.participants || []),
      { user: req.user._id, joinedAt: new Date() },
    ];
  }

  await liveSession.save();
  res.json({ success: true, data: liveSession });
});

const leaveLiveSession = asyncHandler(async (req, res) => {
  const liveSession = await LiveSession.findById(req.params.id);
  if (!liveSession) {
    res.status(404);
    throw new Error("Live session not found");
  }

  await ensureCanAccessCourseLive({ courseId: liveSession.course, user: req.user });
  const userId = toId(req.user._id);
  liveSession.activeParticipantIds = (liveSession.activeParticipantIds || []).filter(
    (id) => toId(id) !== userId
  );
  const openIdx = (liveSession.participants || []).findIndex(
    (item) => toId(item.user) === userId && !item.leftAt
  );
  if (openIdx >= 0) {
    liveSession.participants[openIdx].leftAt = new Date();
  }
  await liveSession.save();

  res.json({ success: true, data: liveSession });
});

const canAccessLiveSession = async ({ sessionId, user }) => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) return false;
  const session = await LiveSession.findById(sessionId).select("course tutor status");
  if (!session || session.status !== "active") return false;

  const role = normalizeRole(user.role);
  if (role === "tutor") return toId(session.tutor) === toId(user._id);
  if (role !== "student") return false;

  const acceptedStudentIds = await getAcceptedStudentIdsForCourse(session.course);
  return acceptedStudentIds.includes(toId(user._id));
};

module.exports = {
  listCourseLiveSessions,
  startCourseLiveSession,
  endLiveSession,
  joinLiveSession,
  leaveLiveSession,
  canAccessLiveSession,
};
