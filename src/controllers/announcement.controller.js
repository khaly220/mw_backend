const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// CREATE Announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, targetType, classIds, courseId, userId } = req.body;
    const { user } = req;

    if (!title || !content || !targetType) {
      return res.status(400).json({ error: "Title, content and targetType are required" });
    }

    // TEACHER: can only announce for assigned classes
    if (user.role === "TEACHER") {
      const allowedClassIds = user.assignedClasses.map(c => c.id);
      if (classIds && !classIds.every(id => allowedClassIds.includes(id))) {
        return res.status(403).json({ error: "You can only announce to your assigned classes" });
      }
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        targetType,
        classId: classIds ? classIds.join(",") : null,
        courseId,
        userId
      },
    });

    res.status(201).json({ message: "Announcement created", announcement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// READ all announcements (Admin sees all, Teacher sees assigned)
exports.getAnnouncements = async (req, res) => {
  try {
    const { user } = req;
    let announcements;

    if (user.role === "ADMIN") {
      announcements = await prisma.announcement.findMany();
    } else if (user.role === "TEACHER") {
      const allowedClassIds = user.assignedClasses.map(c => c.id);
      announcements = await prisma.announcement.findMany({
        where: {
          classId: { in: allowedClassIds }
        }
      });
    } else {
      // STUDENT: only see announcements for their class
      announcements = await prisma.announcement.findMany({
        where: {
          classId: req.user.classId
        }
      });
    }

    res.json({ announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// UPDATE Announcement
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const { user } = req;

    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) return res.status(404).json({ error: "Announcement not found" });

    // TEACHER: can only update their own announcement
    if (user.role === "TEACHER" && announcement.userId !== user.id) {
      return res.status(403).json({ error: "You cannot update this announcement" });
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: { title, content },
    });

    res.json({ message: "Announcement updated", updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE Announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) return res.status(404).json({ error: "Announcement not found" });

    // TEACHER: can only delete their own announcement
    if (user.role === "TEACHER" && announcement.userId !== user.id) {
      return res.status(403).json({ error: "You cannot delete this announcement" });
    }

    await prisma.announcement.delete({ where: { id } });

    res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
