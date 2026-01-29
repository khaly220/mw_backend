const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

const quizController = require("../controllers/quiz.controllers");
const {
  getQuizResults,
  getMyQuizResult,
  getClassQuizResults,
  gradeEssay
} = require("../controllers/quizResult.controller");

const {
  getQuizStats,
  getClassQuizStats,
  getQuizRanking,
} = require("../controllers/quizStats.controller");

// =====================
// QUIZ CRUD
// =====================

// CREATE quiz
router.post(
  "/",
  authenticate,
  checkRole(["TEACHER", "ADMIN"]),
  quizController.createQuiz
);

// GET quizzes
router.get(
  "/",
  authenticate,
  checkRole(["STUDENT", "TEACHER", "ADMIN"]),
  quizController.getQuizzes
);

// SUBMIT quiz attempt
router.post(
  "/submit",
  authenticate,
  checkRole(["STUDENT"]),
  quizController.submitAttempt
);

// =====================
// QUIZ RESULTS
// =====================

// Results per class (ADMIN / TEACHER)
router.get(
  "/class/:classId/:quizId/results",
  authenticate,
  checkRole(["ADMIN", "TEACHER"]),
  getClassQuizResults
);

// Student own result
router.get(
  "/:quizId/my-result",
  authenticate,
  checkRole(["STUDENT"]),
  getMyQuizResult
);

// All results (ADMIN / TEACHER)
router.get(
  "/:quizId/results",
  authenticate,
  checkRole(["ADMIN", "TEACHER"]),
  getQuizResults
);

router.get(
  "/:quizId/stats",
  authenticate,
  checkRole(["ADMIN", "TEACHER"]),
  getQuizStats
);

// Class stats (Admin / Teacher)
router.get(
  "/:quizId/class/:classId/stats",
  authenticate,
  checkRole(["ADMIN", "TEACHER"]),
  getClassQuizStats
);

// Ranking (Admin / Teacher)
router.get(
  "/:quizId/ranking",
  authenticate,
  checkRole(["ADMIN", "TEACHER"]),
  getQuizRanking
);

router.post(
  "/grade-essay",
  authenticate,
  checkRole(["TEACHER", "ADMIN"]),
  gradeEssay
);


module.exports = router;
