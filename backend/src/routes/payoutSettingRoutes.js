const express = require("express");
const {
  listMine,
  listByTutor,
  uploadQr,
  createSetting,
  updateSetting,
} = require("../controllers/payoutSettingController");
const { protect, optionalAuth } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

const router = express.Router();

// GET    /api/v1/payout-settings                 (auth required)
router.get("/", protect, listMine);

// GET    /api/v1/payout-settings/tutor/:tutorId  (public)
router.get("/tutor/:tutorId", optionalAuth, listByTutor);

// POST   /api/v1/payout-settings/upload-qr       (auth required)
router.post("/upload-qr", protect, upload.single("qrCode"), uploadQr);

// POST   /api/v1/payout-settings                 (auth required)
router.post("/", protect, createSetting);

// PUT    /api/v1/payout-settings/:id             (auth required)
router.put("/:id", protect, updateSetting);

module.exports = router;




