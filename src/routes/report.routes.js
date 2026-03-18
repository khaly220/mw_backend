const express = require("express");
const router = express.Router();

const reportController = require("../controllers/reports.controller");
const  {authenticate} = require("../middleware/auth.middleware");

// Teacher classes
router.get(
  "/classes",
   authenticate,
  reportController.getTeacherClasses
);

// Assignments in class
router.get(
  "/assignments/:classId",
   authenticate,
  reportController.getAssignmentsByClass
);

// Assignment report
router.get(
  "/assignment/:assignmentId",
   authenticate,
  reportController.getAssignmentReport
);

// Export excel
router.get(
  "/assignment/:assignmentId/export",
   authenticate,
  reportController.exportAssignmentExcel
);

module.exports = router;