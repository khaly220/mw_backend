const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// 1. IMPORT ROUTES
const authRoutes = require("./routes/auth.routes");
const schoolRoutes = require("./routes/school.routes");
const classRoutes = require("./routes/class.routes");
const aiRoutes = require("./routes/ai.routes");
const assignmentRoutes = require("./routes/assignment.routes");
const usersRoutes = require("./routes/users.route");
const announcementRoutes = require("./routes/announcement.routes");
const content = require("./routes/courseContent.router");
const courseRoutes = require("./routes/course.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const reportRoutes = require("./routes/report.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const notificationRoutes = require("./routes/notification.routes");
const liveSessionRoutes = require("./routes/liveSession.routes");

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);

// 2. INITIALIZE SOCKET.IO
const io = new Server(server, {
  cors: { 
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 20000,
  transports: ['websocket', 'polling'] 
});

// Attach to global for use in Controllers
global.io = io; 

// Track active streams for late-joining students
const activeStreams = new Map();

// 3. CONSOLIDATED SOCKET LOGIC
io.on("connection", (socket) => {
  console.log("⚡ New Socket Connected:", socket.id);

  // Join Room Logic
  socket.on("join-room", (roomId) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`👤 Socket ${socket.id} joined room: ${roomId}`);

    // Update room count for everyone
    const participants = io.sockets.adapter.rooms.get(roomId);
    const count = participants ? participants.size : 0;
    io.to(roomId).emit("room-count", count);

    if (activeStreams.has(roomId)) {
      socket.emit("live-started-notification", activeStreams.get(roomId));
    }
    
    // Notify the teacher/others that a new user is ready to connect
    socket.to(roomId).emit("user-joined", socket.id);
  });

socket.on("signal", (data) => {
  if (data.to) {
    // Log for debugging: console.log(`Signal from ${socket.id} to ${data.to}`);
    io.to(data.to).emit("signal", {
      from: socket.id,
      signal: data.signal
    });
  }
});
  // Teacher Start Stream
  socket.on("teacher-start-stream", (data) => {
    const { classId, teacherName } = data;
    console.log(`📺 LIVE STARTED: ${teacherName} in ${classId}`);
    
    const streamData = { ...data, type: "LIVE_CLASS", startTime: new Date() };
    activeStreams.set(classId, streamData);

    io.to(classId).emit("live-started-notification", streamData);
    io.emit("live-started-notification", streamData); 
  });

  // Teacher Stop Stream
  socket.on("teacher-stop-stream", (classId) => {
    activeStreams.delete(classId);
    io.to(classId).emit("live-ended", { classId });
    io.emit("live-ended", { classId }); 
  });

  // Chat Message Relay
  socket.on("send-chat", ({ classId, msg }) => {
    // We use io.to(classId) so everyone, including the sender, gets the message sync
    io.to(classId).emit("chat-message", msg);
  });

  /* ================= INTERACTION LOGIC ================= */

  
// Inside your socket handler
socket.on("join-live-session", async ({ sessionId, studentId, classId }) => {
  await prisma.attendance.upsert({
    where: {
      student_class_date: {
        studentId: studentId,
        classId: classId,
        date: new Date(), // Logic to normalize to start of day
      }
    },
    update: { status: 'PRESENT' },
    create: {
      studentId,
      teacherId: currentTeacherId,
      classId,
      date: new Date(),
      status: 'PRESENT'
    }
  });
  console.log(`Attendance saved for student ${studentId}`);
});
  // 1. Listen for Student Raising Hand
  socket.on("raise-hand", ({ classId, name }) => {
    console.log(`✋ Hand raised by ${name} in room ${classId}`);
    io.to(classId).emit("student-raised-hand", { id: socket.id, name });
  });

  // 2. Teacher Lowers a Student's Hand
  socket.on("lower-student-hand", ({ classId, studentId }) => {
    console.log(`🤝 Teacher lowered hand for student ${studentId}`);
    io.to(studentId).emit("hand-lowered");
    io.to(classId).emit("student-hand-lowered", studentId);
  });

  // 3. Student Sends Emoji Reaction
  socket.on("send-emoji", ({ classId, emoji }) => {
    io.to(classId).emit("student-sent-emoji", emoji);
  });

  /* ================= CLEANUP LOGIC ================= */

  socket.on("disconnecting", () => {
    socket.rooms.forEach(roomId => {
      // Notify the teacher/room that this specific user left
      socket.to(roomId).emit("user-left", socket.id);
      
      // Update the room count
      const participants = io.sockets.adapter.rooms.get(roomId);
      const count = participants ? participants.size - 1 : 0;
      io.to(roomId).emit("room-count", Math.max(0, count));
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Disconnected: ${socket.id} (Reason: ${reason})`);
  });
});


// 4. MIDDLEWARE
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. ROUTES
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/schools", schoolRoutes); 
app.use("/api/classes", classRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/course-content", content);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/live-sessions", liveSessionRoutes);
app.use("/api/reports", reportRoutes);

// 6. ERROR HANDLING
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

// 7. START SERVER
server.listen(PORT, () => {
  console.log(`🚀 MwarimuAI Backend running on port ${PORT}`);
});
console.log(`🚀 MwarimuAI Backend running on port ${PORT}`);
module.exports = app;