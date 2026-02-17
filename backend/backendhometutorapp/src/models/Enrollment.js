const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending_admin", "active", "completed", "cancelled", "rejected_by_admin"],
      default: "pending_admin",
    },
    approvedByAdminAt: { type: Date, default: null },
    approvedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Enrollment", enrollmentSchema);

