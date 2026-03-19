const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");// src/controllers/assignment.controllers.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ROUTES
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

// ✅ SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: ["https://m-frontend-7wyg-seven.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// GLOBAL ACCESS
global.io = io;

// Active streams tracker
const activeStreams = new Map();


// 🔐 SOCKET AUTH MIDDLEWARE
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) return next(new Error("No token provided"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded; // ✅ attach user
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication failed"));
  }
});


// 🔥 SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("⚡ Connected:", socket.id, socket.user);

  const { id, role, schoolId, name } = socket.user;

  // ✅ JOIN ROOMS
  socket.join(role); // ADMIN / TEACHER / STUDENT
  socket.join(`school_${schoolId}`);
  socket.join(`user_${id}`);

  // ================= ROOM JOIN =================
  socket.on("join-room", (roomId) => {
    if (!roomId) return;

    socket.join(roomId);
    console.log(`👤 ${name} joined room ${roomId}`);

    const participants = io.sockets.adapter.rooms.get(roomId);
    const count = participants ? participants.size : 0;

    io.to(roomId).emit("room-count", count);

    // If stream already active
    if (activeStreams.has(roomId)) {
      socket.emit("live-started-notification", activeStreams.get(roomId));
    }

    socket.to(roomId).emit("user-joined", socket.id);
  });


  // ================= WEBRTC SIGNAL =================
  socket.on("signal", ({ to, signal }) => {
    if (!to) return;

    io.to(to).emit("signal", {
      from: socket.id,
      signal,
    });
  });


  // ================= TEACHER START STREAM =================
  socket.on("teacher-start-stream", (data) => {
    if (role !== "TEACHER") {
      return console.log("❌ Unauthorized stream start");
    }

    const { classId } = data;

    const streamData = {
      ...data,
      teacherId: id,
      type: "LIVE_CLASS",
      startTime: new Date(),
    };

    activeStreams.set(classId, streamData);

    io.to(classId).emit("live-started-notification", streamData);
    io.to(`school_${schoolId}`).emit("live-started-notification", streamData);
  });


  // ================= TEACHER STOP STREAM =================
  socket.on("teacher-stop-stream", (classId) => {
    if (role !== "TEACHER") return;

    activeStreams.delete(classId);

    io.to(classId).emit("live-ended", { classId });
    io.to(`school_${schoolId}`).emit("live-ended", { classId });
  });


  // ================= CHAT =================
  socket.on("send-chat", ({ classId, msg }) => {
    io.to(classId).emit("chat-message", {
      message: msg,
      senderId: id,
      name,
      role,
      time: new Date(),
    });
  });


  // ================= ATTENDANCE =================
  socket.on("join-live-session", async ({ classId }) => {
    if (role !== "STUDENT") return;

    try {
      await prisma.attendance.upsert({
        where: {
          student_class_date: {
            studentId: id,
            classId,
            date: new Date(),
          },
        },
        update: { status: "PRESENT" },
        create: {
          studentId: id,
          classId,
          date: new Date(),
          status: "PRESENT",
        },
      });

      console.log(`✅ Attendance saved for ${name}`);
    } catch (err) {
      console.error("Attendance error:", err.message);
    }
  });


  // ================= HAND RAISE =================
  socket.on("raise-hand", ({ classId }) => {
    if (role !== "STUDENT") return;

    io.to(classId).emit("student-raised-hand", {
      id,
      name,
    });
  });


  // ================= LOWER HAND =================
  socket.on("lower-student-hand", ({ studentId }) => {
    if (role !== "TEACHER") return;

    io.to(`user_${studentId}`).emit("hand-lowered");
  });


  // ================= EMOJI =================
  socket.on("send-emoji", ({ classId, emoji }) => {
    io.to(classId).emit("student-sent-emoji", {
      emoji,
      name,
    });
  });


  // ================= DISCONNECT =================
  socket.on("disconnecting", () => {
    socket.rooms.forEach((roomId) => {
      socket.to(roomId).emit("user-left", socket.id);

      const participants = io.sockets.adapter.rooms.get(roomId);
      const count = participants ? participants.size - 1 : 0;

      io.to(roomId).emit("room-count", Math.max(0, count));
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Disconnected: ${socket.id} (${reason})`);
  });
});


// ================= EXPRESS =================
app.use(cors({
  origin: ["https://m-frontend-7wyg-seven.vercel.app"],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ROUTES
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


// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});


// START SERVER
server.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});

module.exports = app;
