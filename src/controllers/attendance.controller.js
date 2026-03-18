const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
// Import your notification helper
const { createNotification } = require("../utilits/notification.helper");

/* =====================================================
    MARK ATTENDANCE
===================================================== */
async function markAttendance(req, res) {
  try {
    const { classId, date, records } = req.body;
    const teacherId = req.user?.id;

    if (!classId || !date || !Array.isArray(records)) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!teacherId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Prevent timezone shifting
    const attendanceDate = new Date(date + "T00:00:00");

    // 1. Save all attendance records
    await Promise.all(
      records.map(record =>
        prisma.attendance.upsert({
          where: {
            student_class_date: {
              studentId: record.studentId,
              classId,
              date: attendanceDate
            }
          },
          update: {
            status: record.status,
            teacherId
          },
          create: {
            studentId: record.studentId,
            classId,
            teacherId,
            date: attendanceDate,
            status: record.status
          }
        })
      )
    );

    // 2. TRIGGER REAL-TIME NOTIFICATIONS
    // We only notify students if they are marked anything other than 'PRESENT'
    // This runs in the background so it doesn't slow down the response
    records.forEach(async (record) => {
      if (record.status === "ABSENT" || record.status === "LATE") {
        try {
          await createNotification(
            record.studentId,      // recipient
            teacherId,             // sender
            "ATTENDANCE",          // type
            "Attendance Alert",    // title
            `You were marked ${record.status} for your class on ${date}.`, // message
            "/app/dashboard"       // link
          );
        } catch (notifErr) {
          console.error("Failed to send attendance notification:", notifErr);
        }
      }
    });

    res.json({ message: "Attendance saved successfully and notifications sent" });

  } catch (error) {
    console.error("ATTENDANCE ERROR:", error);
    res.status(500).json({ message: "Failed to save attendance" });
  }
}

async function getAttendanceReport(req, res) {
  try {
    const { classId, date, mode } = req.query;

    if (!classId || !date || !mode)
      return res.status(400).json({ message: "Missing parameters" });

    const selectedDate = new Date(date + "T00:00:00");

    let startDate = new Date(selectedDate);
    let endDate = new Date(selectedDate);

    // ================= DATE RANGE LOGIC =================
    if (mode === "DAY") {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (mode === "WEEK") {
      const day = selectedDate.getDay(); 
      startDate.setDate(selectedDate.getDate() - day);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (mode === "MONTH") {
      startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    const students = await prisma.user.findMany({
      where: { role: "STUDENT", studentClassId: classId },
      select: { id: true, name: true, email: true }
    });

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId,
        date: { gte: startDate, lte: endDate }
      }
    });
 
    const dates = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    const report = students.map(student => {
      const records = dates.map(date => {
        const rec = attendanceRecords.find(
          r => r.studentId === student.id && r.date.toDateString() === date.toDateString()
        );
        return {
          date: date.toISOString().split("T")[0],
          status: rec ? rec.status : "-" 
        };
      });

      return {
        userId: student.id,
        user: { name: student.name, email: student.email },
        records
      };
    });

    res.json(report);
  } catch (error) {
    console.error("REPORT GRID ERROR:", error);
    res.status(500).json({ message: "Failed to generate report grid" });
  }
}

module.exports = {
  markAttendance,
  getAttendanceReport
};