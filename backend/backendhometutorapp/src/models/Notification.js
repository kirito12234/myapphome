const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    user: { type: String }, // backwards compatibility
    type: {
      type: String,
      enum: [
        "message",
        "request",
        "approval",
        "enrollment",
        "progress",
        "system",
        "payment",
        "notification",
      ],
      default: "notification",
      index: true,
    },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    message: { type: String, default: "" }, // backwards compatibility
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    relatedId: { type: String, default: "" }, // backwards compatibility
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.pre("validate", function (next) {
  if (!this.user && this.userId) this.user = String(this.userId);
  if (!this.userId && this.user) this.userId = this.user;
  if (!this.message && this.body) this.message = this.body;
  if (!this.body && this.message) this.body = this.message;
  next();
});

module.exports = mongoose.model("Notification", notificationSchema);
