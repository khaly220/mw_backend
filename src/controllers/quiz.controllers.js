exports.createQuiz = async (req, res) => {
  try {
    const { title, description, classIds, questions } = req.body;
    const { user } = req;

    if (!["TEACHER", "ADMIN"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!title || !classIds?.length) {
      return res.status(400).json({ error: "Title and classIds are required" });
    }

    // Teacher: verify assigned classes
    if (user.role === "TEACHER") {
      const teacherClasses = await prisma.course.findMany({
        where: { teacherId: user.id },
        select: { classId: true },
      });

      const allowed = teacherClasses.map(c => c.classId);
      if (!classIds.every(id => allowed.includes(id))) {
        return res.status(403).json({ error: "You can only assign quizzes to your classes" });
      }
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        teacherId: user.id,
        classes: {
          create: classIds.map(classId => ({ classId })),
        },
        questions: {
          create: questions,
        },
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
exports.getQuizzes = async (req, res) => {
  try {
    const { user } = req;

    let where = {};

    if (user.role === "TEACHER") {
      where.teacherId = user.id;
    }

    if (user.role === "STUDENT") {
      where.classes = {
        some: { classId: user.classId },
      };
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        classes: true,
        questions: user.role !== "STUDENT",
      },
    });

    res.json({ quizzes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
exports.submitAttempt = async (req, res) => {
  try {
    const { quizId, answers } = req.body;
    const { user } = req;

    if (user.role !== "STUDENT") {
      return res.status(403).json({ error: "Only students can attempt quizzes" });
    }

    // Check class access
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        classes: { some: { classId: user.classId } },
      },
      include: { questions: true },
    });

    if (!quiz) {
      return res.status(403).json({ error: "Quiz not assigned to your class" });
    }

    // Prevent multiple attempts
    const exists = await prisma.quizAttempt.findUnique({
      where: {
        userId_quizId: { userId: user.id, quizId },
      },
    });

    if (exists) {
      return res.status(400).json({ error: "You already attempted this quiz" });
    }

    // Calculate score
    let score = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id] === q.answer) score++;
    });

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId: user.id,
        answers,
        score,
      },
    });

    res.status(201).json({ message: "Quiz submitted", score, attempt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.submitAttempt = async (req, res) => {
  try {
    const { quizId, answers, startedAt } = req.body;
    const { user } = req;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    // ⏱ TIME LIMIT CHECK
    const timeTaken =
      (new Date() - new Date(startedAt)) / 60000;

    if (timeTaken > quiz.duration) {
      return res.status(400).json({ error: "Time exceeded" });
    }

    let score = 0;
    let requiresManual = false;
    let totalMarks = 0;

    const gradedAnswers = quiz.questions.map(q => {
      totalMarks += q.marks;

      const userAnswer = answers.find(a => a.questionId === q.id);

      if (q.type === "SHORT_ANSWER") {
        requiresManual = true;
        return { ...userAnswer, marks: 0 };
      }

      if (!userAnswer) {
        score -= quiz.negativeMark;
        return { questionId: q.id, correct: false };
      }

      if (userAnswer.answer === q.answer) {
        score += q.marks;
        return { questionId: q.id, correct: true };
      } else {
        score -= quiz.negativeMark;
        return { questionId: q.id, correct: false };
      }
    });

    const percentage = (score / totalMarks) * 100;
    const passed = percentage >= quiz.passMark;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId: user.id,
        score,
        passed,
        graded: !requiresManual,
        answers: gradedAnswers,
      },
    });

    res.status(201).json({
      score,
      percentage,
      passed,
      requiresManual,
      attempt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
