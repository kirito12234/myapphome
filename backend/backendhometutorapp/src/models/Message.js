const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
    },
    sender: { type: String }, // backwards compatibility
    senderRole: { type: String, default: "student" },
    senderName: { type: String, default: "" },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  },
  { timestamps: true }
);

messageSchema.pre("validate", function (next) {
  if (!this.thread && this.threadId) this.thread = this.threadId;
  if (!this.threadId && this.thread) this.threadId = this.thread;
  if (!this.sender && this.senderId) this.sender = String(this.senderId);
  if (!this.senderId && this.sender) this.senderId = this.sender;
  next();
});

module.exports = mongoose.model("Message", messageSchema);




