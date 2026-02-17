const mongoose = require("mongoose");

const lessonProgressSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }],
    completedCount: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    lastCompletedLesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", default: null },
    lastCompletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

lessonProgressSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model("LessonProgress", lessonProgressSchema);
