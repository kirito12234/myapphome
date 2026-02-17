const asyncHandler = require("express-async-handler");
const PayoutSetting = require("../models/PayoutSetting");
const { getIO } = require("../services/socket.service");

// ─── GET /api/v1/payout-settings ─────────────────────────
const listMine = asyncHandler(async (req, res) => {
  const settings = await PayoutSetting.find({ tutor: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, data: settings });
});

// ─── GET /api/v1/payout-settings/tutor/:tutorId ──────────
const listByTutor = asyncHandler(async (req, res) => {
  const settings = await PayoutSetting.find({
    tutor: req.params.tutorId,
  }).sort({ createdAt: -1 });
  res.json({ success: true, data: settings });
});

// ─── POST /api/v1/payout-settings/upload-qr ──────────────
const uploadQr = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("QR image is required");
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, data: { url } });
});

// ─── POST /api/v1/payout-settings ────────────────────────
const createSetting = asyncHandler(async (req, res) => {
  const { method, details, isDefault } = req.body;

  // Upsert – one per method per tutor
  const existing = await PayoutSetting.findOne({
    tutor: req.user._id,
    method: method || "khalti",
  });

  if (existing) {
    existing.details = details || existing.details;
    existing.isDefault = isDefault ?? existing.isDefault;
    await existing.save();
    
    // Notify all students who might be viewing payment pages for this tutor's courses
    const io = getIO();
    if (io) {
      // Emit to tutor room and also broadcast to all sockets (students might not have joined room yet)
      const payload = { 
        tutorId: String(req.user._id),
        method: existing.method,
        qrImageUrl: existing.details?.qrImageUrl,
        name: existing.details?.name || ""
      };
      console.log("Broadcasting QR update:", payload);
      io.to(`tutor:${req.user._id}`).emit("qr:updated", payload);
      // Also broadcast to all connected sockets so students get it immediately
      io.emit("qr:updated", payload);
    }
    
    return res.json({ success: true, data: existing });
  }

  const setting = await PayoutSetting.create({
    tutor: req.user._id,
    method: method || "khalti",
    details: details || {},
    isDefault: isDefault ?? true,
  });

  // Notify students about new QR code
  const io = getIO();
  if (io) {
    const payload = { 
      tutorId: String(req.user._id),
      method: setting.method,
      qrImageUrl: setting.details?.qrImageUrl,
      name: setting.details?.name || ""
    };
    console.log("Broadcasting new QR code:", payload);
    io.to(`tutor:${req.user._id}`).emit("qr:updated", payload);
    // Also broadcast to all connected sockets
    io.emit("qr:updated", payload);
  }

  res.status(201).json({ success: true, data: setting });
});

// ─── PUT /api/v1/payout-settings/:id ─────────────────────
const updateSetting = asyncHandler(async (req, res) => {
  const setting = await PayoutSetting.findById(req.params.id);
  if (!setting) {
    res.status(404);
    throw new Error("Payout setting not found");
  }

  if (req.body.method) setting.method = req.body.method;
  if (req.body.details) setting.details = req.body.details;
  if (req.body.isDefault !== undefined) setting.isDefault = req.body.isDefault;
  await setting.save();

  // Notify students about QR code update
  const io = getIO();
  if (io) {
    const payload = { 
      tutorId: String(setting.tutor),
      method: setting.method,
      qrImageUrl: setting.details?.qrImageUrl,
      name: setting.details?.name || ""
    };
    console.log("Broadcasting QR update:", payload);
    io.to(`tutor:${setting.tutor}`).emit("qr:updated", payload);
    // Also broadcast to all connected sockets
    io.emit("qr:updated", payload);
  }

  res.json({ success: true, data: setting });
});

module.exports = { listMine, listByTutor, uploadQr, createSetting, updateSetting };



