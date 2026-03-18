// routes/assignments.routes.js
const express = require("express");
const router = express.Router();
const assignmentController = require("../controllers/assignment.controllers");
const { authenticate } = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

// ---------------- TEACHER / ADMIN: Manage assignments ----------------
router.post(
  "/",
  authenticate,
  checkRole("TEACHER", "ADMIN"),
  assignmentController.createAssignment
);

router.get(
  "/",
  authenticate,
  checkRole("TEACHER", "ADMIN"),
  assignmentController.getTeacherassignments
);

router.put(
  "/:id",
  authenticate,
  checkRole("TEACHER", "ADMIN"),
  assignmentController.updateAssignment
);

router.delete(
  "/:id",
  authenticate,
  checkRole("TEACHER", "ADMIN"),
  assignmentController.deleteAssignment
);

// ---------------- STUDENT: Assigned assignments ----------------
router.get(
  "/assigned",
  authenticate,
  checkRole("STUDENT"),
  assignmentController.getAssignedassignments
);

// ---------------- STUDENT: Get assignment details ----------------
router.get(
  "/:id",
  authenticate,
  checkRole("STUDENT"),
  assignmentController.getassignmentDetails
);

// ---------------- STUDENT: Submit assignment ----------------
router.post(
  "/submit",
  authenticate,
  checkRole("STUDENT"),
  assignmentController.submitAssignment
);

module.exports = router;