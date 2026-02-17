/**
 * Role-based access control middleware factory.
 * Usage: authorize("admin") or authorize("tutor", "student")
 */
const normalizeRoleValue = (role) => (role === "teacher" ? "tutor" : role);

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authenticated");
    }

    const normalizedRole = normalizeRoleValue(req.user.role);
    const allowedRoles = roles.map(normalizeRoleValue);

    if (!allowedRoles.includes(normalizedRole)) {
      res.status(403);
      throw new Error("Not authorized for this action");
    }

    next();
  };

const authorize = requireRole;
const adminOnly = requireRole("admin");
const tutorOnly = requireRole("tutor");
const studentOnly = requireRole("student");
const tutorOrStudent = requireRole("tutor", "student");

module.exports = {
  authorize,
  requireRole,
  adminOnly,
  tutorOnly,
  studentOnly,
  tutorOrStudent,
};




