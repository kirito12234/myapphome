const express = require("express");
const { listTutors } = require("../controllers/tutorController");
const { optionalAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

// GET /api/v1/tutors
// GET /api/v1/professionals  (alias mounted separately in app.js)
router.get("/", optionalAuth, listTutors);

module.exports = router;




