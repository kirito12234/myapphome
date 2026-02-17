const asyncHandler = require("express-async-handler");
const Notification = require("../models/Notification");

const typeFilterFromQuery = (type) => {
  if (!type || type === "all") return {};
  if (type === "message") return { type: "message" };
  if (type === "notification") {
    return { type: { $in: ["request", "approval", "enrollment", "progress", "system", "payment", "notification"] } };
  }
  return { type };
};

const listNotifications = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const filter = {
    $or: [{ userId }, { user: userId }],
    ...typeFilterFromQuery(req.query.type),
  };

  const notifications = await Notification.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: notifications });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, $or: [{ userId }, { user: userId }] },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  res.json({ success: true, data: notification });
});

const readAllNotifications = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const result = await Notification.updateMany(
    { $or: [{ userId }, { user: userId }], isRead: false },
    { $set: { isRead: true } }
  );

  res.json({
    success: true,
    data: { modifiedCount: result.modifiedCount || 0 },
    message: "All notifications marked as read",
  });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const deleted = await Notification.findOneAndDelete({
    _id: req.params.id,
    $or: [{ userId }, { user: userId }],
  });

  if (!deleted) {
    res.status(404);
    throw new Error("Notification not found");
  }

  res.json({ success: true, data: { deleted: true, id: req.params.id } });
});

const clearNotifications = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const result = await Notification.deleteMany({
    $or: [{ userId }, { user: userId }],
  });

  res.json({
    success: true,
    data: { deletedCount: result.deletedCount || 0 },
    message: "All notifications removed",
  });
});

const unreadCount = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const count = await Notification.countDocuments({
    $or: [{ userId }, { user: userId }],
    isRead: false,
  });
  res.json({ success: true, data: { unreadCount: count } });
});

module.exports = {
  listNotifications,
  markNotificationRead,
  readAllNotifications,
  deleteNotification,
  clearNotifications,
  unreadCount,
};
