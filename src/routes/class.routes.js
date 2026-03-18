const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");
const classController = require("../controllers/class.controller");


router.get("/", authenticate, classController.getClassesForUser);

router.post("/", authenticate, checkRole(["ADMIN"]), classController.createClass);


router.put("/:classId", authenticate, checkRole(["ADMIN"]), classController.updateClass);

router.delete("/:classId", authenticate, checkRole(["ADMIN"]), classController.deleteClass);


router.post("/assign-student", authenticate, checkRole(["ADMIN"]), classController.assignStudent);


router.post("/request", authenticate, checkRole(["TEACHER"]), classController.requestClassAssignment);

router.patch("/request/:requestId", authenticate, checkRole(["ADMIN"]), classController.updateSingleRequest);


router.patch("/request/bulk", authenticate, checkRole(["ADMIN"]), classController.bulkUpdateRequests);

router.get("/teacher-classes", authenticate, checkRole(["TEACHER"]), classController.getTeacherClasses);

module.exports = router;
