const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const { getMyInvite, trackMyInvite, getPublicInvite } = require("../controllers/inviteController");

const router = express.Router();

router.get("/public/:code", getPublicInvite);
router.get("/my", protect, requireRole("tutor"), getMyInvite);
router.post("/my/track", protect, requireRole("tutor"), trackMyInvite);

module.exports = router;
