// src/controllers/assignment.controllers.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { createNotification } = require("../utilits/notification.helper"); 

/* ================= CREATE ASSIGNMENT ================= */
exports.createAssignment = async (req, res) => {
  try {
    const { title, instruction, duration, passMark, classId, courseId, questions } = req.body;

    if (!title || !classId || !courseId)
      return res.status(400).json({ message: "Title, class, and course are required." });
    
    const teacherId = req.user.id;

    const assignment = await prisma.assignment.create({
      data: {
        title,
        instruction,
        duration: Number(duration),
        passMark: Number(passMark),
        teacherId,
        courseId,
        assignmentClasses: { create: { classId } },
        questions: {
          create: questions.map((q) => ({
            prompt: q.prompt,
            type: q.type,
            weight: Number(q.weight),
            options: q.options,
            answer: q.answer ?? null
          }))
        }
      },
      include: { questions: true, assignmentClasses: true }
    });

    // --- REAL-TIME NOTIFICATION TO STUDENTS ---
    // 1. Find all students in this class
    const students = await prisma.user.findMany({
      where: { studentClassId: classId, role: "STUDENT" },
      select: { id: true }
    });

    // 2. Notify each student
    students.forEach(async (student) => {
      await createNotification(
        student.id,
        teacherId,
        "COURSE_ASSIGNED",
        "New Assignment",
        `New assignment "${title}" has been posted.`,
        `/app/assignments`
      );
    });

    res.status(201).json({ message: "Assignment created successfully", assignment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create assignment" });
  }
};

/* ================= SUBMIT ASSIGNMENT ================= */
exports.submitAssignment = async (req, res) => {
  try {
    const userId = req.user.id;
    const userName = req.user.name; // Ensure name is in your req.user object
    const { assignmentId, answers } = req.body;

    if (!assignmentId || !answers)
      return res.status(400).json({ message: "Assignment ID and answers are required." });

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { questions: true }
    });

    if (!assignment) return res.status(404).json({ message: "Assignment not found." });

    // Scoring Logic
    let totalScore = 0;
    const submissionDetails = [];
    for (const question of assignment.questions) {
      const studentAnswer = answers[question.id];
      const correctAnswer = question.answer;
      let isCorrect = (question.type === "TEXT") 
        ? studentAnswer?.trim().toLowerCase() === correctAnswer?.trim().toLowerCase()
        : studentAnswer === correctAnswer;

      if (isCorrect) totalScore += question.weight;
      submissionDetails.push({
        questionId: question.id,
        selectedAnswer: studentAnswer ?? null,
        correctAnswer: correctAnswer ?? null,
        isCorrect
      });
    }

    const passed = totalScore >= assignment.passMark;

    const attempt = await prisma.assignmentAttempt.create({
      data: {
        userId,
        assignmentId,
        score: totalScore,
        passed,
        graded: true,
        answers,
        submissionAnswers: { create: submissionDetails }
      }
    });

    // --- REAL-TIME NOTIFICATION TO TEACHER ---
    await createNotification(
      assignment.teacherId, // recipient
      userId,               // sender (student)
      "MARKS",              // type
      "New Submission",     // title
      `${userName || 'A student'} submitted: ${assignment.title}. Score: ${totalScore}`,
      `/app/grading`        // link for teacher to review
    );

    res.status(201).json({
      message: "Assignment submitted successfully.",
      results: { score: totalScore, passed }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit assignment" });
  }
};



/* ================= UPDATE ASSIGNMENT ================= */
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, instruction, duration, passMark, negativeMarking, questions } = req.body;

    const updatedAssignment = await prisma.$transaction(async (tx) => {
      // Update basic assignment fields
      await tx.assignment.update({
        where: { id },
        data: { title, instruction, duration: Number(duration), passMark: Number(passMark), negativeMarking }
      });

      // Remove old questions
      await tx.question.deleteMany({ where: { assignmentId: id } });

      // Create new questions with correct answers
      return tx.assignment.update({
        where: { id },
        data: {
          questions: {
            create: questions.map((q) => ({
              prompt: q.prompt,
              type: q.type,
              weight: Number(q.weight),
              options: q.options,
              answer: q.answer ?? null
            }))
          }
        },
        include: { questions: true }
      });
    });

    console.log("Updated Assignment Questions:", updatedAssignment.questions);
    res.json(updatedAssignment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


/* ================= DELETE ASSIGNMENT ================= */
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.assignment.delete({ where: { id } });
    res.json({ message: "Assignment deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete assignment. Ensure no submissions exist." });
  }
};

/* ================= TEACHER assignments ================= */
exports.getTeacherassignments = async (req, res) => {
  try {
    const { id: teacherId, role } = req.user;
    if (!["TEACHER", "ADMIN"].includes(role)) return res.status(403).json({ error: "Unauthorized" });

    const assignments = await prisma.assignment.findMany({
      where: { teacherId },
      include: { questions: true, assignmentClasses: true }
    });

    res.json(assignments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
};

/* ================= STUDENT assigned assignments ================= */
exports.getAssignedassignments = async (req, res) => {
  try {
    const userId = req.user.id;

    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: { studentClassId: true }
    });

    if (!student?.studentClassId) return res.json([]);

    const assignments = await prisma.assignment.findMany({
      where: {
        assignmentClasses: { some: { classId: student.studentClassId } }
      },
      include: { questions: true }
    });

    res.json(assignments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
};

/* ================= STUDENT assignment details ================= */
exports.getassignmentDetails = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const userId = req.user.id;

    // 1. Fetch assignment and check if this specific user has an attempt
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { 
        questions: true,
        // Check if the current user has already submitted
        assignmentAttempts: {
          where: { userId: userId },
          take: 1
        }
      }
    });

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const userAttempt = assignment.assignmentAttempts[0];

    // 2. If an attempt exists, attach the student's answers to each question
    const questionsWithData = assignment.questions.map((q) => {
      return {
        ...q,
        // If they already submitted, include what they chose
        studentAnswer: userAttempt ? userAttempt.answers[q.id] : null,
        // Optional: you can also include if it was correct or not
      };
    });

    // 3. Return the response
    res.json({
      ...assignment,
      questions: questionsWithData,
      alreadySubmitted: !!userAttempt, // Boolean flag for frontend
      score: userAttempt ? userAttempt.score : null,
      passed: userAttempt ? userAttempt.passed : null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch assignment" });
  }
};


