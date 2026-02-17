const express = require("express");
const {
  listRequests,
  createRequest,
  updateRequest,
} = require("../controllers/teacherRequestController");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);

// GET    /api/v1/teacher-requests
router.get("/", listRequests);

// POST   /api/v1/teacher-requests
router.post("/", createRequest);

// PUT    /api/v1/teacher-requests/:id
router.put("/:id", updateRequest);

module.exports = router;




