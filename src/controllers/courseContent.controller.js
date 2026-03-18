const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* =========================
   1. CREATE CONTENT
========================= */
exports.createContent = async (req, res) => {
  try {
    const { title, type, parentId, courseId, notes, videoUrl, materialUrl } = req.body;

    const newContent = await prisma.courseContent.create({
      data: {
        title,
        type,
        courseId,
        parentId: parentId || null,
        notes,
        videoUrl,
        materialUrl,
      },
    });

    res.status(201).json(newContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating content" });
  }
};

/* =========================
   2. READ (GET ALL FOR COURSE)
========================= */
exports.getCourseContent = async (req, res) => {
  try {
    const { courseId } = req.params;

    // 1. Check if the course belongs to the teacher or school
    const course = await prisma.course.findFirst({
      where: {
        id: courseId, // OR schoolId: req.user.schoolId
      },
    });

    if (!course) {
      return res.status(403).json({ message: "Access denied" });
    }

    // 2. Fetch content only if authorized
    const contents = await prisma.courseContent.findMany({
      where: { courseId },
      orderBy: { createdAt: "asc" },
    });

    res.json(contents);
  } catch (error) {
    res.status(500).json({ message: "Error fetching content" });
  }
};

exports.updateContent = async (req, res) => {
  try {
    // 1. Get the ID of the specific lesson/material, NOT the courseId
    const { id } = req.params; 
    const { title, type, notes, videoUrl, materialUrl } = req.body;

    // 2. Perform the update on the specific record
    const updated = await prisma.courseContent.update({
      where: { 
        id: id // This must be the UUID of the CourseContent row
      },
      data: {
        title,
        type,
        notes,
        videoUrl,
        materialUrl,
      },
    });

    res.json(updated);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: "The specific lesson/content was not found." });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
/* =========================
   4. DELETE CONTENT (Recursive)
========================= */
exports.deleteContent = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: Fetch children first if you want to prevent deleting a parent 
    // that has topics. Otherwise, use a transaction to delete everything.
    
    await prisma.$transaction(async (tx) => {
      // Find all children (Topics) if this is a Lesson
      const children = await tx.courseContent.findMany({ where: { parentId: id } });
      const childrenIds = children.map(c => c.id);

      // Delete Subtopics (Grandchildren)
      await tx.courseContent.deleteMany({
        where: { parentId: { in: childrenIds } }
      });

      // Delete Topics (Children)
      await tx.courseContent.deleteMany({
        where: { parentId: id }
      });

      // Delete the actual item
      await tx.courseContent.delete({
        where: { id }
      });
    });

    res.json({ message: "Content and its sub-items deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Delete failed" });
  }
};
// GET single course details
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: { select: { name: true } },
        class: true,
        school: true,
      },
    });
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};