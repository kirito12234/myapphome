const mongoose = require("mongoose");

const liveParticipantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
  },
  { _id: false }
);

const liveSessionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
      index: true,
    },
    startedAt: { type: Date, default: Date.now, index: true },
    endedAt: { type: Date, default: null },
    activeParticipantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    participants: [liveParticipantSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("LiveSession", liveSessionSchema);
