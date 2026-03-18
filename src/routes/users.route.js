const express = require("express");
const router = express.Router();
const userController = require("../controllers/users.controller");
const {authenticate} = require("../middleware/auth.middleware"); // assumes you have this

router.use(authenticate);
router.post("/", userController.createUser);

router.get("/", userController.getUsers);

router.get("/teachers", userController.getTeachers);

router.put("/:id", userController.updateUser);

router.delete("/:id", userController.deleteUser);

router.get("/students/:classId",  authenticate,   userController.getStudentsByClass);

module.exports = router;
