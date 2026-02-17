const asyncHandler = require("express-async-handler");
const Payment = require("../models/Payment");
const Course = require("../models/Course");
const Notification = require("../models/Notification");
const Enrollment = require("../models/Enrollment");
const { getIO } = require("../services/socket.service");

// ─── POST /api/v1/payments/submit ────────────────────────
const submitPayment = asyncHandler(async (req, res) => {
  const courseId = req.body.courseId;
  const course = await Course.findById(courseId).populate("tutor", "name");
  if (!course || !course.tutor) {
    res.status(400);
    throw new Error("Invalid course");
  }

  const screenshotUrl = req.file ? `/uploads/${req.file.filename}` : "";

  const payment = await Payment.create({
    student: req.user._id,
    course: course._id,
    tutor: course.tutor._id,
    amount: Number(course.price) || 0,
    paymentMethod: req.body.paymentMethod || "khalti",
    provider: req.body.paymentMethod || "manual",
    screenshotUrl,
    status: "pending",
  });

  // Notify tutor
  const note = await Notification.create({
    user: String(course.tutor._id),
    title: "Payment Screenshot Uploaded",
    message: `${req.user.name} uploaded payment screenshot for "${course.title}". Please review and approve.`,
    type: "payment",
    relatedId: String(payment._id),
  });

  const io = getIO();
  if (io) {
    io.to(`user:${course.tutor._id}`).emit("notification:new", { notification: note });
    console.log(`Payment notification sent to tutor ${course.tutor._id}`);
  }

  res.status(201).json({ success: true, data: payment });
});

// ─── GET /api/v1/payments/status/:courseId ────────────────
const paymentStatus = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    course: req.params.courseId,
    student: req.user._id,
  }).sort({ createdAt: -1 });

  // Access only after admin-approved enrollment.
  const enrollment = await Enrollment.findOne({
    student: req.user._id,
    course: req.params.courseId,
    status: "active",
  });

  const hasAccess = !!enrollment;

  res.json({
    success: true,
    data: {
      status: payment ? payment.status : "none",
      hasAccess,
    },
  });
});

// ─── GET /api/v1/payments/pending ────────────────────────
const pendingPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({
    tutor: req.user._id,
    status: "pending",
  })
    .populate("student", "name email")
    .populate("course", "title")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: payments });
});

// ─── PUT /api/v1/payments/:id/status ─────────────────────
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }

  const newStatus = req.body.status === "approved" ? "approved" : "rejected";
  payment.status = newStatus;
  payment.approvedAt = newStatus === "approved" ? new Date() : null;
  if (req.body.rejectionReason) payment.rejectionReason = req.body.rejectionReason;
  await payment.save();
  const io = getIO();

  // If tutor approved payment, create enrollment request (admin must approve).
  if (newStatus === "approved") {
    const exists = await Enrollment.findOne({
      student: payment.student,
      course: payment.course,
    });
    if (!exists) {
      await Enrollment.create({
        student: payment.student,
        course: payment.course,
        status: "pending_admin",
      });
      console.log(`Enrollment pending admin approval for student ${payment.student} in course ${payment.course}`);

      // Notify tutor about new enrollment
      const studentUser = await Course.findById(payment.course).populate("tutor", "name");
      const tutorEnrollmentNote = await Notification.create({
        userId: payment.tutor,
        user: String(payment.tutor),
        type: "enrollment",
        title: "New Enrollment",
        body: `A student enrollment was confirmed for "${studentUser?.title || "your course"}".`,
        message: `A student enrollment was confirmed for "${studentUser?.title || "your course"}".`,
        metadata: { courseId: String(payment.course), studentId: String(payment.student) },
      });
      if (io) {
        io.to(`user:${payment.tutor}`).emit("notification:new", {
          notification: tutorEnrollmentNote,
        });
      }
    } else if (exists.status !== "active") {
      exists.status = "pending_admin";
      exists.rejectionReason = "";
      exists.approvedByAdminAt = null;
      exists.approvedByAdmin = null;
      await exists.save();
    }
  }

  // Notify student
  const course = await Course.findById(payment.course);
  const note = await Notification.create({
    user: String(payment.student),
    title: newStatus === "approved" ? "Payment Approved" : "Payment Rejected",
    message:
      newStatus === "approved"
        ? `Your payment for "${course?.title || "the course"}" has been approved by tutor. Waiting for admin enrollment approval.`
        : `Your payment for "${course?.title || "the course"}" was rejected.${req.body.rejectionReason ? ` Reason: ${req.body.rejectionReason}` : ""}`,
    type: "payment",
    relatedId: String(payment._id),
  });

  if (io) {
    io.to(`user:${payment.student}`).emit("notification:new", { notification: note });
    // Also emit payment status update so course page can refresh
    io.to(`user:${payment.student}`).emit("payment:status-updated", {
      courseId: String(payment.course),
      status: newStatus,
      hasAccess: false,
    });
    console.log(`Payment ${newStatus} notification sent to student ${payment.student}`);
  }

  res.json({ success: true, data: payment });
});

// ─── GET /api/v1/payments/summary ────────────────────────
const paymentSummary = asyncHandler(async (req, res) => {
  const tutorId = req.user._id;
  const now = new Date();
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonthAgg, lastMonthAgg, pendingAgg, totalAgg] = await Promise.all([
    Payment.aggregate([
      {
        $match: {
          tutor: tutorId,
          status: { $in: ["approved", "paid"] },
          $or: [
            { approvedAt: { $gte: startThisMonth } },
            { approvedAt: null, createdAt: { $gte: startThisMonth } },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          tutor: tutorId,
          status: { $in: ["approved", "paid"] },
          $or: [
            { approvedAt: { $gte: startLastMonth, $lt: startThisMonth } },
            { approvedAt: null, createdAt: { $gte: startLastMonth, $lt: startThisMonth } },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: { tutor: tutorId, status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: { tutor: tutorId, status: { $in: ["approved", "paid"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      thisMonth: thisMonthAgg[0]?.total || 0,
      lastMonth: lastMonthAgg[0]?.total || 0,
      total: totalAgg[0]?.total || 0,
      pending: pendingAgg[0]?.total || 0,
      currency: "NPR",
    },
  });
});

// ─── GET /api/v1/payments/approved ───────────────────────
const approvedPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({
    tutor: req.user._id,
    status: { $in: ["approved", "paid"] },
  })
    .populate("student", "name email")
    .populate("course", "title price")
    .sort({ approvedAt: -1, updatedAt: -1 });

  res.json({ success: true, data: payments });
});

module.exports = {
  submitPayment,
  paymentStatus,
  pendingPayments,
  updatePaymentStatus,
  paymentSummary,
  approvedPayments,
};
