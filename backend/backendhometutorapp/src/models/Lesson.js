const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    fileUrl: { type: String, default: "" },
    fileType: {
      type: String,
      enum: ["pdf", "video", "image", "resource"],
      default: "resource",
    },
    orderIndex: { type: Number, default: 1 },
    durationMinutes: { type: Number, default: 0 },
    order: { type: Number, default: 1 },
    pdfUrl: { type: String, default: "" },
    pdfName: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

lessonSchema.pre("save", function (next) {
  if (this.courseId && !this.course) this.course = this.courseId;
  if (this.course && !this.courseId) this.courseId = this.course;
  if (this.orderIndex && !this.order) this.order = this.orderIndex;
  if (this.order && !this.orderIndex) this.orderIndex = this.order;
  if (this.fileUrl && this.fileType === "pdf") {
    this.pdfUrl = this.fileUrl;
  }
  if (this.pdfUrl && !this.fileUrl) {
    this.fileUrl = this.pdfUrl;
    this.fileType = "pdf";
  }
  next();
});

module.exports = mongoose.model("Lesson", lessonSchema);




