const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    tutorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, default: "General", trim: true },
    level: { type: String, default: "Beginner", trim: true },
    subject: { type: String, default: "", trim: true },
    price: { type: Number, default: 0, min: 0 },
    durationHours: { type: Number, default: 0 },
    durationInWeeks: { type: Number, default: 1 },
    lessonCount: { type: Number, default: 0 },
    scheduleDate: { type: String, default: "" },
    scheduleTime: { type: String, default: "" },
    features: [{ type: String }],
    thumbnailUrl: { type: String, default: "" },
    coursePdfUrl: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    isPopular: { type: Boolean, default: false },
    isNewCourse: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: true },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      index: true,
    },
    approvedByAdminAt: { type: Date, default: null },
    approvedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, default: "", trim: true },
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // alias used by admin panel
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.isNew = ret.isNewCourse;
        delete ret.isNewCourse;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        ret.isNew = ret.isNewCourse;
        delete ret.isNewCourse;
        return ret;
      },
    },
  }
);

// Keep tutor and teacher in sync
courseSchema.pre("save", function (next) {
  if (this.tutorId && !this.tutor) this.tutor = this.tutorId;
  if (this.tutor && !this.tutorId) this.tutorId = this.tutor;
  if (this.tutor && !this.teacher) this.teacher = this.tutor;
  if (this.teacher && !this.tutor) this.tutor = this.teacher;
  if (this.thumbnailUrl && !this.imageUrl) this.imageUrl = this.thumbnailUrl;
  if (this.imageUrl && !this.thumbnailUrl) this.thumbnailUrl = this.imageUrl;
  next();
});

module.exports = mongoose.model("Course", courseSchema);
