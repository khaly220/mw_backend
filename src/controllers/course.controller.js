const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* =========================
   HELPER: SEND NOTIFICATION
========================= */
const createNotification = async (recipientId, senderId, type, title, message) => {
  try {
    await prisma.notification.create({
      data: {
        recipientId,
        senderId,
        type,
        title,
        message,
        isRead: false
      }
    });
  } catch (error) {
    console.error("Notification failed to send:", error);
    // We don't throw error here to avoid breaking the main request
  }
};

/* =========================
   CREATE COURSE (ADMIN ONLY)
========================= */
exports.createCourse = async (req, res) => {
  try {
    const { title, description, classId, teacherId } = req.body;
    const adminId = req.user.id;

    if (!title || !classId || !teacherId) {
      return res.status(400).json({ message: "Title, classId, and teacherId are required" });
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, schoolId: true, name: true }
    });

    if (admin.role !== "ADMIN") {
      return res.status(403).json({ message: "Only admins can create courses" });
    }

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true, role: true, schoolId: true }
    });

    if (!teacher || teacher.role !== "TEACHER" || teacher.schoolId !== admin.schoolId) {
      return res.status(400).json({ message: "Invalid teacher selected" });
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        classId,
        teacherId,
        createdById: adminId,
        schoolId: admin.schoolId
      },
      include: { class: true }
    });

    // 🔔 NOTIFY TEACHER
    await createNotification(
      teacherId,
      adminId,
      "COURSE_ASSIGNED",
      "New Course Assigned",
      `Admin ${admin.name} assigned you to the course: ${title} for class ${course.class.name}.`
    );

    // 🔔 NOTIFY ALL STUDENTS IN THE CLASS
    const students = await prisma.user.findMany({
      where: { studentClassId: classId },
      select: { id: true }
    });

    for (const student of students) {
      await createNotification(
        student.id,
        adminId,
        "NEW_COURSE",
        "New Course Available",
        `A new course "${title}" has been added to your curriculum.`
      );
    }

    res.status(201).json(course);
  } catch (error) {
    console.error("Create Course Error:", error);
    res.status(500).json({ message: "Failed to create course" });
  }
};

/* =========================
   UPDATE COURSE (ADMIN ONLY)
========================= */
exports.updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, teacherId } = req.body;
    const adminId = req.user.id;

    const existingCourse = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, schoolId: true, teacherId: true, title: true }
    });

    if (!existingCourse) return res.status(404).json({ message: "Course not found" });

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, schoolId: true, name: true }
    });

    if (admin.role !== "ADMIN" || admin.schoolId !== existingCourse.schoolId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        title: title ?? undefined,
        description: description ?? undefined,
        teacherId: teacherId ?? undefined
      }
    });

    // 🔔 NOTIFY TEACHER IF ASSIGNMENT CHANGED
    if (teacherId && teacherId !== existingCourse.teacherId) {
      // Notify Old Teacher
      await createNotification(
        existingCourse.teacherId,
        adminId,
        "COURSE_REMOVED",
        "Course Assignment Revoked",
        `You are no longer the instructor for "${existingCourse.title}".`
      );
      // Notify New Teacher
      await createNotification(
        teacherId,
        adminId,
        "COURSE_ASSIGNED",
        "New Course Assigned",
        `You have been assigned to instruct "${updated.title}".`
      );
    }

    res.json(updated);
  } catch (error) {
    console.error("Update Course Error:", error);
    res.status(500).json({ message: "Failed to update course" });
  }
};

/* =========================
   DELETE COURSE (ADMIN ONLY)
========================= */
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const adminId = req.user.id;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { class: true }
    });

    if (!course) return res.status(404).json({ message: "Course not found" });

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, schoolId: true }
    });

    if (admin.role !== "ADMIN" || admin.schoolId !== course.schoolId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // 🔔 NOTIFY TEACHER BEFORE DELETION
    await createNotification(
      course.teacherId,
      adminId,
      "COURSE_DELETED",
      "Course Deleted",
      `The course "${course.title}" has been removed by the administrator.`
    );

    await prisma.course.delete({ where: { id: courseId } });
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Delete Course Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   GETTERS (No Notifications Needed)
========================= */

exports.getAllCourses = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, schoolId: true }
    });

    if (user.role !== "ADMIN") return res.status(403).json({ message: "Only admins can view all courses" });

    const courses = await prisma.course.findMany({
      where: { schoolId: user.schoolId },
      include: { class: true, teacher: true, school: true }
    });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTeacherCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { teacherId: req.user.id },
      include: { class: true, lessons: true }
    });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStudentCourses = async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { studentClassId: true }
    });

    if (!student?.studentClassId) return res.json([]);

    const courses = await prisma.course.findMany({
      where: { classId: student.studentClassId },
      include: { teacher: { select: { name: true } } }
    });

    res.json(courses);

  } catch (error) {
    console.error("Get Student Courses Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTeacherClasses = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { courses: { some: { teacherId: req.user.id } } },
      select: { id: true, name: true }
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTeacherCoursesInClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const courses = await prisma.course.findMany({
      where: { teacherId: req.user.id, classId: classId },
      select: { id: true, title: true, description: true }
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};