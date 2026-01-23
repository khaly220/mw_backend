const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");
const quizController = require("../controllers/quiz.controller");

// CREATE quiz
router.post("/", authenticate, checkRole(["TEACHER", "ADMIN"]), quizController.createQuiz);

// GET quizzes
router.get("/", authenticate, checkRole(["STUDENT", "TEACHER", "ADMIN"]), quizController.getQuizzes);

// SUBMIT quiz attempt
router.post("/submit", authenticate, checkRole(["STUDENT"]), quizController.submitAttempt);

module.exports = router;
