const mongoose = require("mongoose");

const payoutSettingSchema = new mongoose.Schema(
  {
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    method: {
      type: String,
      enum: ["khalti", "esewa", "imepay", "bank"],
      default: "khalti",
    },
    details: {
      qrImageUrl: { type: String, default: "" },
      name: { type: String, default: "" },
    },
    isDefault: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PayoutSetting", payoutSettingSchema);


