const mongoose = require("mongoose");

const threadSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Chat" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    tutorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    lastMessageAt: { type: Date, default: null, index: true },
    lastMessageText: { type: String, default: "" },
    unreadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastReadAt: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  { timestamps: true }
);

threadSchema.index({ participants: 1, updatedAt: -1 });
threadSchema.index({ studentId: 1, tutorId: 1, createdAt: -1 });

module.exports = mongoose.model("Thread", threadSchema);




