const express = require("express");
const {
  listNotifications,
  markNotificationRead,
  readAllNotifications,
  deleteNotification,
  clearNotifications,
  unreadCount,
} = require("../controllers/notificationController");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);
router.get("/", listNotifications);
router.delete("/clear", clearNotifications);
router.post("/:id/read", markNotificationRead);
router.delete("/:id", deleteNotification);
router.post("/read-all", readAllNotifications);
router.get("/unread-count", unreadCount);

module.exports = router;




