const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    // profile linked to users collection
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // kept for compatibility with existing DB unique index on teachers.email
    email: { type: String, lowercase: true, trim: true },
    subject: { type: String, default: "", trim: true },
    experience: { type: String, default: "", trim: true },
    isApproved: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", teacherSchema);


