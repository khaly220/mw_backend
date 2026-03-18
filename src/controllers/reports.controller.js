
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const XLSX = require("xlsx");

/*
GET CLASSES FOR TEACHER
Teacher selects class first
*/
exports.getTeacherClasses = async (req, res) => {
  try {

    const teacherId = req.user.id;

    const classes = await prisma.class.findMany({
      where: {
        courses: {
          some: {
            teacherId: teacherId
          }
        }
      },
      include: {
        courses: true
      }
    });

    res.json(classes);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



/*
GET ASSIGNMENTS BY CLASS
*/
exports.getAssignmentsByClass = async (req, res) => {
  try {

    const { classId } = req.params;

    const assignments = await prisma.assignment.findMany({
      where: {
        course: {
          classId: classId
        }
      },
      include: {
        course: true
      }
    });

    res.json(assignments);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
};



/*
GET REPORT DATA
Used by your frontend page
*/
exports.getAssignmentReport = async (req, res) => {

  try {

    const { assignmentId } = req.params;

    const attempts = await prisma.assignmentAttempt.findMany({
      where: {
        assignmentId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        assignment: true
      }
    });

    res.json(attempts);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch report" });
  }

};



/*
EXPORT REPORT TO EXCEL
*/
exports.exportAssignmentExcel = async (req, res) => {

  try {

    const { assignmentId } = req.params;

    const attempts = await prisma.assignmentAttempt.findMany({
      where: { assignmentId },
      include: {
        user: true,
        assignment: true
      }
    });

    const rows = attempts.map((a) => {

      const percentage = (
        (a.score / (a.assignment.maxPoints || 100)) * 100
      ).toFixed(1);

      return {
        Student: a.user.name,
        Email: a.user.email,
        Score: a.score,
        MaxPoints: a.assignment.maxPoints,
        Percentage: percentage + "%",
        Status: a.graded ? "Graded" : "Pending",
        Passed: a.passed ? "Yes" : "No"
      };

    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=assignment-report.xlsx`
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(buffer);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to export Excel"
    });

  }

};