const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Create announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, classIds } = req.body;
    const { user } = req;

    if (!title || !content || !classIds || !Array.isArray(classIds)) {
      return res.status(400).json({ error: "Title, content, and classIds are required" });
    }

    // Teacher can only announce to assigned classes
    if (user.role === "TEACHER") {
      const allowedClassIds = (user.assignedClasses || []).map(c => c.id);
      if (!classIds.every(id => allowedClassIds.includes(id))) {
        return res.status(403).json({ error: "You can only announce to your assigned classes" });
      }
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        creatorId: user.id,
        targets: {
          create: classIds.map(id => ({ classId: id })),
        },
      },
      include: { targets: true }
    });

    res.status(201).json({ message: "Announcement created", announcement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const { user } = req;
    let where = {};

    if (user.role === "TEACHER") {
      const allowedClassIds = (user.assignedClasses || []).map(c => c.id);
      where = { targets: { some: { classId: { in: allowedClassIds } } } };
    } else if (user.role === "STUDENT") {
      where = { targets: { some: { classId: user.classId } } };
    }

    const announcements = await prisma.announcement.findMany({
      where,
      include: { targets: true, creator: true },
      orderBy: { createdAt: "desc" }
    });

    res.json({ announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Update announcement
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const { user } = req;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: { targets: true }
    });

    if (!announcement) return res.status(404).json({ error: "Announcement not found" });

    if (user.role === "TEACHER" && announcement.creatorId !== user.id) {
      return res.status(403).json({ error: "You cannot update this announcement" });
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: { title, content },
      include: { targets: true }
    });

    res.json({ message: "Announcement updated", updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) return res.status(404).json({ error: "Announcement not found" });

    if (user.role === "TEACHER" && announcement.creatorId !== user.id) {
      return res.status(403).json({ error: "You cannot delete this announcement" });
    }

    await prisma.announcement.delete({ where: { id } });

    res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
