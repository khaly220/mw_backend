const router = require("express").Router();
const courseController = require("../controllers/course.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

/* =========================
   ADMIN ROUTES
========================= */

// Create Course
router.post(
  "/",
  authenticate,
  checkRole(["ADMIN"]),
  courseController.createCourse
);

// Update Course
router.put(
  "/:courseId",
  authenticate,
  checkRole(["ADMIN"]),
  courseController.updateCourse
);

// Delete Course
router.delete(
  "/:courseId",
  authenticate,
  checkRole(["ADMIN"]),
  courseController.deleteCourse
);

// Get All Courses (Admin Own Only)
router.get(
  "/",
  authenticate,
  checkRole(["ADMIN"]),
  courseController.getAllCourses
);

/* =========================
   TEACHER ROUTES
========================= */

// Get all courses assigned to teacher
router.get(
  "/my",
  authenticate,
  checkRole(["TEACHER"]),
  courseController.getTeacherCourses
);

// Get teacher classes
router.get(
  "/teacher-classes",
  authenticate,
  checkRole(["TEACHER"]),
  courseController.getTeacherClasses
);

// Get teacher courses in a specific class
router.get(
  "/teacher/class/:classId",
  authenticate,
  checkRole(["TEACHER"]),
  courseController.getTeacherCoursesInClass
);

/* =========================
   STUDENT ROUTES
========================= */

// Get student's class courses
router.get(
  "/student",
  authenticate,
  checkRole(["STUDENT"]),
  courseController.getStudentCourses
);

module.exports = router;