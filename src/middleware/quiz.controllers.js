const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// CREATE Quiz
exports.createQuiz = async (req, res) => {
  try {
    const { title, description, classIds, questions } = req.body;
    const { user } = req;

    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only teachers or admins can create quizzes" });
    }

    if (!title || !classIds || classIds.length === 0) {
      return res.status(400).json({ error: "Title and classIds are required" });
    }

    // Create quiz
    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        teacherId: user.id,
        classes: {
          create: classIds.map(cid => ({ classId: cid })),
        },
        questions: questions ? { create: questions } : undefined,
      },
      include: {
        classes: true,
        questions: true,
      },
    });

    res.status(201).json({ message: "Quiz created", quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET quizzes for user
exports.getQuizzes = async (req, res) => {
  try {
    const { user } = req;
    let quizzes;

    if (user.role === "ADMIN") {
      quizzes = await prisma.quiz.findMany({ include: { classes: true, questions: true } });
    } else if (user.role === "TEACHER") {
      quizzes = await prisma.quiz.findMany({
        where: { teacherId: user.id },
        include: { classes: true, questions: true },
      });
    } else if (user.role === "STUDENT") {
      quizzes = await prisma.quiz.findMany({
        where: { classes: { some: { classId: user.classId } } },
        include: { questions: true },
      });
    }

    res.json({ quizzes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// SUBMIT Quiz Attempt
exports.submitAttempt = async (req, res) => {
  try {
    const { quizId, answers, score } = req.body;
    const { user } = req;

    const attempt = await prisma.quizAttempt.create({
      data: { quizId, userId: user.id, answers, score },
    });

    res.status(201).json({ message: "Quiz submitted", attempt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
