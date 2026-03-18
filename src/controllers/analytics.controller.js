const { PrismaClient, AnnouncementTargetType } = require('@prisma/client');
const prisma = new PrismaClient();

exports.teacherPerformance = async (req, res) => {

  try {

    const teacherId = req.user.id;

    /* =========================
       CLASS PERFORMANCE
       ========================= */

    const classes = await prisma.class.findMany({

      where: {
        teachers: {
          some: { id: teacherId }
        }
      },

      include: {
        courses: {
          include: {
            assignments: {
              include: {
                assignmentAttempts: true
              }
            }
          }
        }
      }

    });

    const classPerformance = classes.map(c => {

      let totalScore = 0;
      let attempts = 0;

      c.courses.forEach(course => {

        course.assignments.forEach(a => {

          a.assignmentAttempts.forEach(attempt => {

            totalScore += attempt.score;
            attempts++;

          });

        });

      });

      return {
        className: `${c.level} - ${c.name}`,
        averageScore: attempts ? Math.round(totalScore / attempts) : 0
      };

    });

    /* =========================
       WEAK COURSES
       ========================= */

    const courses = await prisma.course.findMany({

      where: {
        teacherId
      },

      include: {
        assignments: {
          include: {
            assignmentAttempts: true
          }
        }
      }

    });

    const weakCourses = courses.map(course => {

      let totalScore = 0;
      let attempts = 0;

      course.assignments.forEach(a => {

        a.assignmentAttempts.forEach(attempt => {

          totalScore += attempt.score;
          attempts++;

        });

      });

      return {
        courseTitle: course.title,
        averageScore: attempts ? Math.round(totalScore / attempts) : 0
      };

    }).sort((a, b) => a.averageScore - b.averageScore);

    res.json({
      classPerformance,
      weakCourses
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Analytics error" });

  }

};

/* ======================================
   COURSE CLASS PERFORMANCE
   ====================================== */

exports.courseClassPerformance = async (req, res) => {

  try {

    const { courseId, classId } = req.params;

    const attempts = await prisma.assignmentAttempt.findMany({

      where: {
        assignment: {
          courseId
        },
        user: {
          studentClassId: classId
        }
      },

      include: {
        user: true
      }

    });

    const studentMap = {};

    attempts.forEach(a => {

      if (!studentMap[a.userId]) {

        studentMap[a.userId] = {
          student: a.user.name,
          scores: []
        };

      }

      studentMap[a.userId].scores.push(a.score);

    });

    const result = Object.values(studentMap).map(s => {

      const avg =
        s.scores.reduce((a, b) => a + b, 0) / s.scores.length;

      return {
        student: s.student,
        score: Math.round(avg)
      };

    });

    res.json(result);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Course analytics error" });

  }

};

/* ======================================
   STUDENT PERFORMANCE
   ====================================== */

exports.studentPerformance = async (req, res) => {

  try {

    const studentId = req.user.id;

    const attempts = await prisma.assignmentAttempt.findMany({

      where: {
        userId: studentId
      },

      include: {
        assignment: {
          include: {
            course: true
          }
        }
      }

    });

    const courseMap = {};

    attempts.forEach(a => {

      const course = a.assignment.course;

      if (!course) return;

      if (!courseMap[course.id]) {

        courseMap[course.id] = {
          course: course.title,
          scores: []
        };

      }

      courseMap[course.id].scores.push(a.score);

    });

    const result = Object.values(courseMap).map(c => {

      const avg =
        c.scores.reduce((a, b) => a + b, 0) / c.scores.length;

      return {
        course: c.course,
        averageScore: Math.round(avg)
      };

    });

    res.json(result);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Student analytics error" });

  }

};