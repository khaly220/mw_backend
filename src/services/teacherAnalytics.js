async function getTeacherInsights(courseId) {
  // 1. Find all assignments for this course
  const assignments = await prisma.assignment.findMany({
    where: { courseId: courseId },
    include: {
      questions: {
        include: {
          submissionAnswers: true // See how students answered
        }
      },
      content: true // Link back to the Topic/Lesson
    }
  });

  const insights = assignments.map(asm => {
    let totalQuestions = 0;
    let totalCorrect = 0;

    asm.questions.forEach(q => {
      q.submissionAnswers.forEach(ans => {
        totalQuestions++;
        if (ans.isCorrect) totalCorrect++;
      });
    });

    const successRate = (totalCorrect / totalQuestions) * 100;

    return {
      topic: asm.content ? asm.content.title : asm.title,
      successRate: successRate.toFixed(1),
      needsEffort: successRate < 60, // Mark as high priority if below 60%
      suggestion: successRate < 60 
        ? "Students are struggling here. AI suggests a live Q&A session." 
        : "Class is performing well."
    };
  });

  return insights.filter(i => i.needsEffort);
}

module.exports = { getTeacherInsights };