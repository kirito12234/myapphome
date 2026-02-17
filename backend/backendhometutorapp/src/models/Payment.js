const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NPR", trim: true },
    paymentMethod: { type: String, default: "khalti", trim: true },
    provider: { type: String, default: "manual", trim: true },
    transactionId: { type: String, default: "", trim: true },
    screenshotUrl: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid", "failed", "refunded"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);

