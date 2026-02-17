const asyncHandler = require("express-async-handler");
const Teacher = require("../models/Teacher");
const User = require("../models/User");

// ─── GET /api/v1/tutors  &  /api/v1/professionals ───────
const listTutors = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = { isBlocked: false };

  if (search) {
    filter.subject = { $regex: search, $options: "i" };
  }

  const teachers = await Teacher.find(filter)
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  const data = teachers.map((t, i) => ({
    _id: t.user?._id || t._id,
    user: { _id: t.user?._id || t._id, name: t.user?.name || "Tutor" },
    subjects: t.subject ? [{ title: t.subject }] : [],
    location: "Kathmandu",
    rating: 4.7 + (i % 2) * 0.1,
    hourlyRate: 800 + i * 100,
  }));

  res.json({ success: true, data });
});

module.exports = { listTutors };


