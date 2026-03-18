// src/controllers/announcement.controller.js
const { PrismaClient, AnnouncementTargetType } = require('@prisma/client');
const prisma = new PrismaClient();

const { createNotification } = require("../utilits/notification.helper");

// ======================
// GET ANNOUNCEMENTS
// ======================
const getAnnouncements = async (req, res) => {
  const { user } = req;

  try {
    let announcements = [];

    // ======================
    // ADMIN → see only their school
    // ======================
    if (user.role === "ADMIN") {
      announcements = await prisma.announcement.findMany({
        where: { schoolId: user.schoolId },
        orderBy: { createdAt: "desc" },
      });
    }

    // ======================
    // TEACHER → school + classes they teach
    // ======================
    else if (user.role === "TEACHER") {
      const teacherClasses = await prisma.class.findMany({
        where: {
          schoolId: user.schoolId,
          teachers: { some: { id: user.id } },
        },
        select: { id: true },
      });

      const classIds = teacherClasses.map(c => c.id);

      announcements = await prisma.announcement.findMany({
        where: {
          schoolId: user.schoolId,
          OR: [
            { classId: { in: classIds } },
            { targetType: AnnouncementTargetType.SCHOOL },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // ======================
    // STUDENT → school + their class
    // ======================
    else if (user.role === "STUDENT") {
      announcements = await prisma.announcement.findMany({
        where: {
          schoolId: user.schoolId,
          OR: [
            { classId: user.classId },
            { targetType: AnnouncementTargetType.SCHOOL },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    }

    res.json(announcements);

  } catch (err) {
    console.error("GET ANNOUNCEMENTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch announcements" });
  }
};

// ======================
// CREATE ANNOUNCEMENT
// ======================
const createAnnouncement = async (req, res) => {
  const { user } = req;
  const { title, content, classId } = req.body;

  try {
    // Teachers can only post to classes they teach
    if (user.role === 'TEACHER' && classId && classId !== 'all') {
      const assigned = await prisma.class.findFirst({
        where: {
          id: classId,
          schoolId: user.schoolId,
          teachers: { some: { id: user.id } },
        },
      });
      if (!assigned) return res.status(403).json({ message: 'Cannot post to this class' });
    }

    const targetType = classId && classId !== 'all'
      ? AnnouncementTargetType.CLASS
      : AnnouncementTargetType.SCHOOL;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        targetType,
        classId: classId && classId !== 'all' ? classId : null,
        userId: user.id,
        schoolId: user.schoolId,
      },
    });

    // =====================================================
    // REAL-TIME NOTIFICATION LOGIC
    // =====================================================
    
    // 1. Identify recipients based on Target Type
    let recipients = [];
    
    if (targetType === AnnouncementTargetType.CLASS) {
      // Notify all students in that specific class
      recipients = await prisma.user.findMany({
        where: { 
          studentClassId: classId,
          schoolId: user.schoolId 
        },
        select: { id: true }
      });
    } else {
      // Notify EVERYONE in the school (except the sender)
      recipients = await prisma.user.findMany({
        where: { 
          schoolId: user.schoolId,
          id: { not: user.id } // Don't notify yourself
        },
        select: { id: true }
      });
    }

    // 2. Loop and trigger real-time alerts
    // We use Promise.all to ensure they start processing immediately
    recipients.forEach(async (recipient) => {
      try {
        await createNotification(
          recipient.id,
          user.id,
          "NEW_TEST", // You can use a specific type like 'ANNOUNCEMENT' if added to your Enum
          "New Broadcast",
          `${user.name} posted: ${title}`,
          "/app/stuannouncements" // Link for students to view
        );
      } catch (err) {
        console.error(`Failed to notify user ${recipient.id}:`, err);
      }
    });

    res.status(201).json(announcement);
  } catch (err) {
    console.error('CREATE ANNOUNCEMENT ERROR:', err);
    res.status(500).json({ message: 'Failed to create announcement' });
  }
};

// ======================
// UPDATE ANNOUNCEMENT
// ======================
const updateAnnouncement = async (req, res) => {
  const { user } = req;
  const { id } = req.params;
  const { title, content, classId } = req.body;

  try {
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    // Only Admin or Author can update
    if (user.role !== 'ADMIN' && announcement.userId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Teachers cannot assign announcements to classes they don't teach
    if (user.role === 'TEACHER' && classId && classId !== 'all') {
      const assigned = await prisma.class.findFirst({
        where: {
          id: classId,
          schoolId: user.schoolId,
          teachers: { some: { id: user.id } },
        },
      });
      if (!assigned) return res.status(403).json({ message: 'Cannot assign to this class' });
    }

    const targetType = classId && classId !== 'all'
      ? AnnouncementTargetType.CLASS
      : AnnouncementTargetType.SCHOOL;

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        title,
        content,
        classId: classId && classId !== 'all' ? classId : null,
        targetType,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('UPDATE ANNOUNCEMENT ERROR:', err);
    res.status(500).json({ message: 'Failed to update announcement' });
  }
};

// ======================
// DELETE ANNOUNCEMENT
// ======================
const deleteAnnouncement = async (req, res) => {
  const { user } = req;
  const { id } = req.params;

  try {
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    // Only Admin or Author can delete
    if (user.role !== 'ADMIN' && announcement.userId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.announcement.delete({ where: { id } });
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error('DELETE ANNOUNCEMENT ERROR:', err);
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};