const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getQuizResults = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { user } = req;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { teacher: true },
    });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Teacher can only view own quiz
    if (user.role === "TEACHER" && quiz.teacherId !== user.id) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const results = await prisma.quizAttempt.findMany({
      where: { quizId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            classId: true,
          },
        },
      },
    });

    res.json({
      quiz: quiz.title,
      totalAttempts: results.length,
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getMyQuizResult = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { user } = req;

    if (user.role !== "STUDENT") {
      return res.status(403).json({ error: "Only students can view this" });
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: {
        userId_quizId: {
          userId: user.id,
          quizId,
        },
      },
      include: {
        quiz: {
          include: { questions: true },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: "No attempt found" });
    }

    res.json({
      quiz: attempt.quiz.title,
      score: attempt.score,
      answers: attempt.answers,
      totalQuestions: attempt.quiz.questions.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getClassQuizResults = async (req, res) => {
  try {
    const { quizId, classId } = req.params;
    const { user } = req;

    if (!["ADMIN", "TEACHER"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

    if (user.role === "TEACHER" && quiz.teacherId !== user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const results = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        user: { classId },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    res.json({
      classId,
      quizId,
      attempts: results.length,
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.gradeEssay = async (req, res) => {
  const { attemptId, marks } = req.body;

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: true },
  });

  if (!attempt) return res.status(404).json({ error: "Attempt not found" });

  let score = attempt.score;

  marks.forEach(m => {
    score += m.marks;
  });

  const percentage = (score / 100) * 100;
  const passed = percentage >= attempt.quiz.passMark;

  const updated = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      score,
      passed,
      graded: true,
    },
  });

  res.json({ message: "Graded successfully", updated });
};
