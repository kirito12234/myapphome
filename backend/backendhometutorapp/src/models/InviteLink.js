const mongoose = require("mongoose");

const inviteLinkSchema = new mongoose.Schema(
  {
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, index: true, trim: true },
    clicks: { type: Number, default: 0 },
    copies: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    opens: { type: Number, default: 0 },
    lastOpenedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InviteLink", inviteLinkSchema);
