const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getassignmentResults = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { user } = req;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { teacher: true },
    });

    if (!assignment) {
      return res.status(404).json({ error: "assignment not found" });
    }

    // Teacher can only view own assignment
    if (user.role === "TEACHER" && assignment.teacherId !== user.id) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const results = await prisma.assignmentAttempt.findMany({
      where: { assignmentId },
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
      assignment: assignment.title,
      totalAttempts: results.length,
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getMyassignmentResult = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { user } = req;

    if (user.role !== "STUDENT") {
      return res.status(403).json({ error: "Only students can view this" });
    }

    const attempt = await prisma.assignmentAttempt.findUnique({
      where: {
        userId_assignmentId: {
          userId: user.id,
          assignmentId,
        },
      },
      include: {
        assignment: {
          include: { questions: true },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: "No attempt found" });
    }

    res.json({
      assignment: attempt.assignment.title,
      score: attempt.score,
      answers: attempt.answers,
      totalQuestions: attempt.assignment.questions.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getClassassignmentResults = async (req, res) => {
  try {
    const { assignmentId, classId } = req.params;
    const { user } = req;

    if (!["ADMIN", "TEACHER"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });

    if (user.role === "TEACHER" && assignment.teacherId !== user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const results = await prisma.assignmentAttempt.findMany({
      where: {
        assignmentId,
        user: { classId },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    res.json({
      classId,
      assignmentId,
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

  const attempt = await prisma.assignmentAttempt.findUnique({
    where: { id: attemptId },
    include: { assignment: true },
  });

  if (!attempt) return res.status(404).json({ error: "Attempt not found" });

  let score = attempt.score;

  marks.forEach(m => {
    score += m.marks;
  });

  const percentage = (score / 100) * 100;
  const passed = percentage >= attempt.assignment.passMark;

  const updated = await prisma.assignmentAttempt.update({
    where: { id: attemptId },
    data: {
      score,
      passed,
      graded: true,
    },
  });

  res.json({ message: "Graded successfully", updated });
};
