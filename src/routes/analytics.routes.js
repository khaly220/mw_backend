const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth.middleware");
const analyticsController = require("../controllers/analytics.controller");

// Teacher overall analytics
router.get(
  "/teacher-performance",
  authenticate,
  analyticsController.teacherPerformance
);

// Teacher class-course performance
router.get(
  "/course-class-performance/:courseId/:classId",
  authenticate,
  analyticsController.courseClassPerformance
);

// Student personal analytics
router.get(
  "/student-performance",
  authenticate,
  analyticsController.studentPerformance
);

module.exports = router;