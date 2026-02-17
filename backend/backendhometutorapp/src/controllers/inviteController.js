const asyncHandler = require("express-async-handler");
const InviteLink = require("../models/InviteLink");
const Teacher = require("../models/Teacher");
const User = require("../models/User");

const genCode = () => Math.random().toString(36).slice(2, 10).toUpperCase();

const normalizeRole = (role) => (role === "teacher" ? "tutor" : role);

const ensureTutorInvite = async (tutorId) => {
  let invite = await InviteLink.findOne({ tutor: tutorId });
  if (invite) return invite;

  let code = genCode();
  // avoid rare collisions
  while (await InviteLink.findOne({ code })) {
    code = genCode();
  }

  invite = await InviteLink.create({
    tutor: tutorId,
    code,
    isActive: true,
  });
  return invite;
};

// GET /api/v1/invites/my
const getMyInvite = asyncHandler(async (req, res) => {
  const role = normalizeRole(req.user.role);
  if (role !== "tutor") {
    res.status(403);
    throw new Error("Only tutors can use invite links");
  }
  const invite = await ensureTutorInvite(req.user._id);
  res.json({
    success: true,
    data: {
      _id: String(invite._id),
      code: invite.code,
      path: `/invite/${invite.code}`,
      clicks: Number(invite.clicks || 0),
      copies: Number(invite.copies || 0),
      shares: Number(invite.shares || 0),
      opens: Number(invite.opens || 0),
      lastOpenedAt: invite.lastOpenedAt,
      createdAt: invite.createdAt,
      isActive: Boolean(invite.isActive),
    },
  });
});

// POST /api/v1/invites/my/track
const trackMyInvite = asyncHandler(async (req, res) => {
  const role = normalizeRole(req.user.role);
  if (role !== "tutor") {
    res.status(403);
    throw new Error("Only tutors can track invite links");
  }
  const action = String(req.body?.action || "").toLowerCase();
  const invite = await ensureTutorInvite(req.user._id);
  if (action === "copy") invite.copies = Number(invite.copies || 0) + 1;
  if (action === "share") invite.shares = Number(invite.shares || 0) + 1;
  if (action === "click") invite.clicks = Number(invite.clicks || 0) + 1;
  await invite.save();
  res.json({ success: true, data: { tracked: true } });
});

// GET /api/v1/invites/public/:code
const getPublicInvite = asyncHandler(async (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  if (!code) {
    res.status(400);
    throw new Error("Invite code is required");
  }
  const invite = await InviteLink.findOne({ code, isActive: true });
  if (!invite) {
    res.status(404);
    throw new Error("Invite link not found");
  }

  const [user, teacherProfile] = await Promise.all([
    User.findById(invite.tutor).select("name role"),
    Teacher.findOne({ user: invite.tutor }).select("subject experience isApproved isBlocked"),
  ]);
  if (!user || normalizeRole(user.role) !== "tutor" || teacherProfile?.isBlocked) {
    res.status(404);
    throw new Error("Tutor not available");
  }

  invite.opens = Number(invite.opens || 0) + 1;
  invite.clicks = Number(invite.clicks || 0) + 1;
  invite.lastOpenedAt = new Date();
  await invite.save();

  res.json({
    success: true,
    data: {
      code: invite.code,
      tutor: {
        _id: String(user._id),
        name: user.name || "Tutor",
        subject: teacherProfile?.subject || "",
        experience: teacherProfile?.experience || "",
        isApproved: Boolean(teacherProfile?.isApproved),
      },
      joinUrl: `/register?role=student`,
      openedAt: invite.lastOpenedAt,
    },
  });
});

module.exports = {
  getMyInvite,
  trackMyInvite,
  getPublicInvite,
};
