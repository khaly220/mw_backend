const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();




exports.assignStudent = async (req, res) => {
  res.json({ message: "Student assigned" });
};


exports.createClass = async (req, res) => {
  try {
    const { name, level, group } = req.body;

    if (!name || !level || !group) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const existingClass = await prisma.class.findFirst({
      where: { level, group }
    });

    if (existingClass) {
      return res.status(400).json({ error: `Class ${level} Group ${group} already exists` });
    }

    const newClass = await prisma.class.create({
      data: { name, level, group }
    });

    res.status(201).json({ class: newClass });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAllClasses = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
};


exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, level, group } = req.body;

    const existingClass = await prisma.class.findUnique({
      where: { id }
    });

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Prevent duplicate level + group
    if (level && group) {
      const duplicate = await prisma.class.findFirst({
        where: {
          level,
          group,
          NOT: { id }
        }
      });

      if (duplicate) {
        return res
          .status(400)
          .json({ error: `Class ${level} Group ${group} already exists` });
      }
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: { name, level, group }
    });

    res.json({ message: "Class updated", class: updatedClass });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};


exports.requestAssignStudent = async (req, res) => {
  const { classId } = req.params;
  const { studentId } = req.body;
  const teacherId = req.user.id;

  // Prevent duplicate request
  const existing = await prisma.classAssignmentRequest.findFirst({
    where: { studentId, status: "PENDING" }
  });

  if (existing) {
    return res.status(400).json({ error: "Request already pending" });
  }

  await prisma.classAssignmentRequest.create({
    data: {
      studentId,
      classId: Number(classId),
      teacherId
    }
  });

  res.json({ message: "Assignment request sent to admin" });
};



  

exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const existingClass = await prisma.class.findUnique({
      where: { id }
    });

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    await prisma.class.delete({
      where: { id }
    });



    res.json({ message: "Class deleted successfully" });
  }
  
  

  
  catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

 exports.requestClassAssignment = async (req, res) => {
  try {
    const { studentId, classId } = req.body;
    const teacherId = req.user.id; // teacher making the request

    if (!studentId || !classId)
      return res.status(400).json({ error: "Student ID and Class ID are required" });

     const existing = await prisma.classAssignmentRequest.findFirst({
      where: {
        studentId,
        classId,
        status: "PENDING",
      },
    });

    if (existing)
      return res.status(400).json({ error: "Request already pending" });

     const request = await prisma.classAssignmentRequest.create({
      data: {
        studentId,
        classId,
        teacherId,
      },
    });

    res.status(201).json({ message: "Request submitted", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

 exports.bulkUpdateRequests = async (req, res) => {
  try {
    const { requestIds, action } = req.body; // action = "APPROVED" or "REJECTED"

    if (!requestIds || !Array.isArray(requestIds))
      return res.status(400).json({ error: "Provide an array of request IDs" });

    if (!["APPROVED", "REJECTED"].includes(action))
      return res.status(400).json({ error: "Invalid action" });

     const requests = await prisma.classAssignmentRequest.findMany({
      where: { id: { in: requestIds }, status: "PENDING" },
    });

    if (requests.length === 0)
      return res.status(404).json({ error: "No pending requests found" });

     if (action === "APPROVED") {
      const assignments = requests.map(r => ({
        userId: r.studentId,
        classId: r.classId,
      }));

      await prisma.classMember.createMany({
        data: assignments,
        skipDuplicates: true,
      });
    }

     await prisma.classAssignmentRequest.updateMany({
      where: { id: { in: requestIds } },
      data: { status: action },
    });

    res.json({
      message: `${requests.length} request(s) ${action.toLowerCase()}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};


 exports.updateSingleRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // "APPROVED" or "REJECTED"

    if (!["APPROVED", "REJECTED"].includes(action))
      return res.status(400).json({ error: "Invalid action" });

    const request = await prisma.classAssignmentRequest.findUnique({
      where: { id: parseInt(requestId) },
    });

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "PENDING")
      return res.status(400).json({ error: "Request already processed" });

     if (action === "APPROVED") {
      await prisma.classMember.create({
        data: {
          userId: request.studentId,
          classId: request.classId,
        },
      });
    }

     
    await prisma.classAssignmentRequest.update({
      where: { id: parseInt(requestId) },
      data: { status: action },
    });

    res.json({ message: `Request ${action.toLowerCase()}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
