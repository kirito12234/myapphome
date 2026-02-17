const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    course: { type: String, default: "" },  // course title or ObjectId string
    courseRef: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    date: { type: String, default: "" },
    time: { type: String, default: "" },
    duration: { type: Number, default: 60 },
    mode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      default: "online",
    },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
