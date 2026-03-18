const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ===============================
// assignment OVERALL STATISTICS
// ===============================
exports.getassignmentStats = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const attempts = await prisma.assignmentAttempt.findMany({
      where: { assignmentId },
      include: { user: true },
    });

    if (attempts.length === 0) {
      return res.json({
        totalAttempts: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
      });
    }

    const scores = attempts.map(a => a.score);

    res.json({
      totalAttempts: attempts.length,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// ===============================
// CLASS assignment STATISTICS
// ===============================
exports.getClassassignmentStats = async (req, res) => {
  try {
    const { assignmentId, classId } = req.params;

    const attempts = await prisma.assignmentAttempt.findMany({
      where: {
        assignmentId,
        user: { classId },
      },
      include: { user: true },
    });

    if (attempts.length === 0) {
      return res.json({
        classId,
        attempts: 0,
        averageScore: 0,
      });
    }

    const avg =
      attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length;

    res.json({
      classId,
      attempts: attempts.length,
      averageScore: Math.round(avg),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// ===============================
// assignment RANKING
// ===============================
exports.getassignmentRanking = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const ranking = await prisma.assignmentAttempt.findMany({
      where: { assignmentId },
      orderBy: { score: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            classId: true,
          },
        },
      },
    });

    res.json({
      ranking: ranking.map((r, index) => ({
        position: index + 1,
        student: r.user.name,
        classId: r.user.classId,
        score: r.score,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
