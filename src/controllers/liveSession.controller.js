const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.liveSessionController = {
  // 1. Schedule a session
  create: async (req, res) => {
    try {
      const { title, classId, scheduledAt } = req.body;
      
      const session = await prisma.liveSession.create({
        data: {
          title,
          classId,
          teacherId: req.user.id, // Assuming req.user is set by your auth middleware
          scheduledAt: new Date(scheduledAt),
          status: 'SCHEDULED',
        },
      });
      
      res.status(201).json(session);
    } catch (error) {
      console.error("Schedule Error:", error);
      res.status(500).json({ error: "Failed to schedule session" });
    }
  },

  // 2. Fetch all scheduled sessions for the logged-in teacher
  getScheduled: async (req, res) => {
    try {
      const sessions = await prisma.liveSession.findMany({
        where: {
          teacherId: req.user.id,
          status: 'SCHEDULED'
        },
        include: {
          class: true // Include class details so the frontend knows the class name
        },
        orderBy: {
          scheduledAt: 'asc'
        }
      });
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  },

  // 3. Start the Live Stream
 start: async (req, res) => {
  try {
    const { classId, title } = req.body;
    
    const session = await prisma.liveSession.create({
      data: {
        title: title || "Live Session",
        classId,
        teacherId: req.user.id,
        status: 'LIVE',
        startedAt: new Date(),
      },
      include: { teacher: { select: { name: true } } }
    });

    if (global.io) {
      // Notify the room
      global.io.to(classId).emit("live-started-notification", {
        sessionId: session.id,
        classId: session.classId,
        teacherName: session.teacher.name
      });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: "Failed to start session" });
  }
},


// Add this to your liveSession.controller.js
// 5. Fetch all sessions for Students (Live + Scheduled)
getDiscovery: async (req, res) => {
  try {
    const sessions = await prisma.liveSession.findMany({
      where: {
        status: { in: ['LIVE', 'SCHEDULED'] }
      },
      include: {
        teacher: { select: { name: true } },
        class: { select: { name: true } }
      },
      orderBy: { status: 'asc' } // Shows LIVE first
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: "Discovery failed" });
  }
},
  // 4. End Stream & Logic for Recording
  end: async (req, res) => {
    try {
      const { id } = req.params;
      const { recordingUrl } = req.body; 

      const session = await prisma.liveSession.update({
        where: { id },
        data: { 
          status: 'ENDED', 
          endedAt: new Date(),
          recordingUrl: recordingUrl || null
        }
      });

      // Notify students the live has ended
      if (global.io) {
        global.io.to(session.classId).emit("live-ended", { 
          sessionId: id 
        });
      }

      res.json(session);
    } catch (error) {
      console.error("End Session Error:", error);
      res.status(500).json({ error: "Failed to end session" });
    }
  }
};

