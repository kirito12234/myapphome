const rateLimit = require("express-rate-limit");

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many auth requests. Try again later." },
});

const messageSendRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many messages sent. Slow down a bit." },
});

module.exports = { authRateLimiter, messageSendRateLimiter };
