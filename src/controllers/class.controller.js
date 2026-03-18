const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();



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
        courses: {
          where: {
            teacherId: teacherId
          }
        }
      }
    });

    res.json(classes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
};



exports.getClassesForUser = async (req, res) => {
  const currentUser = req.user;

  try {
    if (currentUser.role === "ADMIN") {
      const classes = await prisma.class.findMany({
        where: { schoolId: currentUser.schoolId },
        include: {
          students: { select: { id: true, name: true } },
          courses: true,
        },
      });
      return res.json(classes);
    }

    if (currentUser.role === "TEACHER") {
      let classes = [];

      // 1️⃣ Main class
      if (currentUser.mainClassId) {
        const mainClass = await prisma.class.findUnique({
          where: { id: currentUser.mainClassId },
          include: { students: { select: { id: true, name: true } } },
        });
        if (mainClass) classes.push(mainClass);
      }

      // 2️⃣ Classes via courses
      const courseClasses = await prisma.class.findMany({
        where: { courses: { some: { teacherId: currentUser.id } } },
        include: { students: { select: { id: true, name: true } } },
      });
      classes.push(...courseClasses);

      // Remove duplicates by class ID
      const uniqueClasses = {};
      classes.forEach((c) => (uniqueClasses[c.id] = c));
      return res.json(Object.values(uniqueClasses));
    }

    if (currentUser.role === "STUDENT") {
      const studentClasses = await prisma.class.findMany({
        where: { members: { some: { userId: currentUser.id } } },
      });
      return res.json(studentClasses);
    }

    res.status(403).json({ message: "Access denied" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   CREATE CLASS (ADMIN ONLY)
========================= */
exports.createClass = async (req, res) => {
  try {
    const { name, level, group } = req.body;
    const { role, schoolId } = req.user;

    if (role !== "ADMIN") return res.status(403).json({ message: "Access denied" });
    if (!name || !level || !group) return res.status(400).json({ message: "All fields are required" });

    const exists = await prisma.class.findFirst({
      where: { level, group, schoolId },
    });

    if (exists) return res.status(400).json({ message: `Class ${level} ${group} already exists` });

    const newClass = await prisma.class.create({
      data: { name, level, group, schoolId },
    });

    res.status(201).json(newClass);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   UPDATE CLASS (ADMIN)
========================= */
exports.updateClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { name, level, group } = req.body;
    const { role, schoolId } = req.user;

    if (role !== "ADMIN") return res.status(403).json({ message: "Access denied" });

    const existing = await prisma.class.findUnique({ where: { id: classId } });
    if (!existing) return res.status(404).json({ message: "Class not found" });

    if (level && group) {
      const duplicate = await prisma.class.findFirst({
        where: { level, group, schoolId, NOT: { id: classId } },
      });
      if (duplicate) return res.status(400).json({ message: `Class ${level} ${group} already exists` });
    }

    const updated = await prisma.class.update({ where: { id: classId }, data: { name, level, group } });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   DELETE CLASS (ADMIN)
========================= */
exports.deleteClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { role } = req.user;

    if (role !== "ADMIN") return res.status(403).json({ message: "Access denied" });

    await prisma.class.delete({ where: { id: classId } });
    res.json({ message: "Class deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   ASSIGN STUDENT TO CLASS (ADMIN)
========================= */
exports.assignStudent = async (req, res) => {
  try {
    const { studentId, classId } = req.body;
    const { role } = req.user;

    if (role !== "ADMIN") return res.status(403).json({ message: "Access denied" });

    await prisma.classMember.create({ data: { userId: studentId, classId } });
    res.json({ message: "Student assigned successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   TEACHER REQUEST CLASS ASSIGNMENT
========================= */
exports.requestClassAssignment = async (req, res) => {
  try {
    const { classId } = req.body;
    const { id } = req.user;

    const exists = await prisma.classAssignmentRequest.findFirst({
      where: { teacherId: id, classId, status: "PENDING" },
    });

    if (exists) return res.status(400).json({ message: "Request already pending" });

    const request = await prisma.classAssignmentRequest.create({ data: { teacherId: id, classId } });
    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   ADMIN HANDLE SINGLE REQUEST
========================= */
exports.updateSingleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;

    if (!["APPROVED", "REJECTED"].includes(action)) return res.status(400).json({ message: "Invalid action" });

    const request = await prisma.classAssignmentRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== "PENDING") return res.status(400).json({ message: "Invalid request" });

    await prisma.classAssignmentRequest.update({ where: { id: requestId }, data: { status: action } });
    res.json({ message: `Request ${action.toLowerCase()}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   ADMIN BULK UPDATE REQUESTS
========================= */
exports.bulkUpdateRequests = async (req, res) => {
  try {
    const { requestIds, action } = req.body;

    if (!Array.isArray(requestIds) || !requestIds.length) return res.status(400).json({ message: "No request IDs provided" });

    await prisma.classAssignmentRequest.updateMany({ where: { id: { in: requestIds } }, data: { status: action } });
    res.json({ message: "Requests updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
