const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");
const classController = require("../controllers/class.controller");



router.post(
  "/:classId/assign-student",
  authenticate,
  checkRole(["ADMIN"]),
  classController.assignStudent
);

// class.routes.js

// Approve/reject a single request
router.post(
  "/request/:requestId",
  authenticate,
  checkRole(["ADMIN"]),
  classController.updateSingleRequest
);


router.post(
  "/:classId/request-assign",
  authenticate,
  checkRole(["TEACHER"]),
  classController.requestAssignStudent
);


// Create class (ADMIN)
router.post(
  "/",
  authenticate,
  checkRole(["ADMIN"]),
  classController.createClass
);

// Update class (ADMIN)
router.put(
  "/:id",
  authenticate,
  checkRole(["ADMIN"]),
  classController.updateClass
);

// Delete class (ADMIN)
router.delete(
  "/:id",
  authenticate,
  checkRole(["ADMIN"]),
  classController.deleteClass
);


router.post(
  "/request",
  authenticate,
  checkRole(["TEACHER"]),
  classController.requestClassAssignment
);

// Admin bulk approve/reject
router.post(
  "/request/bulk",
  authenticate,
  checkRole(["ADMIN"]),
  classController.bulkUpdateRequests
);

module.exports = router;
