const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    // profile linked to users collection
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // kept for compatibility with existing DB unique index on students.email
    email: { type: String, lowercase: true, trim: true },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);


