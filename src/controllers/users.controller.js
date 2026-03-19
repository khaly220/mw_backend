const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const generatePassword = require("../utilits/generatePassword");
const sendEmail = require("../utilits/sendEmail");
const { profile } = require("node:console");
const { createNotification } = require("../utilits/notification.helper"); // Ensure the path is correct

/* =========================
   HELPERS
========================= */

const allowedRoles = ["ADMIN", "TEACHER", "STUDENT"];

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

/* =========================
   CREATE USER
========================= */
async function createUser(req, res) {
  try {
    const { name, email, role, classId, studentClassId, isMainTeacher } = req.body;
    const currentUser = req.user;

    // 1️⃣ Validation
    if (!name || !email || !role) {
      return res.status(400).json({ message: "Required fields missing." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2️⃣ Duplicate check
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    // 3️⃣ Generate password
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    // 4️⃣ Prepare data
    let finalClassId = studentClassId || classId;

    if (currentUser.role === "TEACHER" && role === "STUDENT") {
      finalClassId = finalClassId || currentUser.mainClassId;
    }

    const baseData = {
      name,
      email: normalizedEmail,
      role,
      password: hashedPassword,
      schoolId: currentUser.schoolId,
      status: "ACTIVE",
    };

    if (role === "STUDENT") baseData.studentClassId = finalClassId || null;
    if (role === "TEACHER") {
      if (isMainTeacher) baseData.mainClassId = finalClassId || null;
      else if (finalClassId) baseData.teacherClassId = finalClassId;
    }

    // 5️⃣ Save user
    const newUser = await prisma.user.create({
      data: baseData,
      select: { id: true, name: true, email: true, role: true },
    });

    // 6️⃣ Email template
// 7️⃣ Email Template (clean + safer)
const emailTemplate = `
  <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background-color: #ffffff;">
    
    <h2 style="color: #1e293b; font-size: 22px; font-weight: 700;">
      Welcome to MwarimuAi, ${name} 👋
    </h2>

    <p style="color: #475569; font-size: 15px;">
      Your account has been successfully created.
    </p>

    <div style="background-color: #f8fafc; padding: 16px; border-radius: 10px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <p><strong>Email:</strong> ${normalizedEmail}</p>
      <p>
        <strong>Temporary Password:</strong><br/>
        <span style="display:inline-block;background:#e2e8f0;padding:6px 10px;border-radius:6px;font-family:monospace;">
          ${plainPassword}
        </span>
      </p>
    </div>

    <a href="${process.env.FRONTEND_URL}/login"
       style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
       Login to your account
    </a>

    <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
      Please change your password after your first login.
    </p>
  </div>
`;


// 8️⃣ Send Email (SAFE + RELIABLE)
try {
  await sendEmail(
    normalizedEmail,
    "Your MwarimuAi Account Details",
    emailTemplate
  );

  console.log(`✅ Email sent to ${normalizedEmail}`);

} catch (emailError) {
  // ⚠️ DO NOT break user creation if email fails
  console.error("❌ Email failed:", emailError.message);

  // Optional: store failed email for retry later
  // await prisma.failedEmail.create({...})
}
}



/* =========================
   GET USERS
========================= */
async function getUsers(req, res) {
  try {
    const currentUser = req.user;

    if (currentUser.role === "ADMIN") {
      const users = await prisma.user.findMany({
        where: { schoolId: currentUser.schoolId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          studentClassId: true,
          teacherClassId: true,
          mainClassId: true,
          createdAt: true,
          studentRequests: true,
          teacherRequests: true,
          courses: true,
          createdCourses: true,
          assignmentAttempts: true,
        }
      });
      return res.json(users);
    }

    if (currentUser.role === "TEACHER") {
      const students = await prisma.user.findMany({
        where: {
          role: "STUDENT",
          schoolId: currentUser.schoolId,
          OR: [
            { studentClassId: currentUser.mainClassId },
            { courses: { some: { teacherId: currentUser.id } } }
          ]
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          studentClassId: true,
          createdAt: true
        }
      });

      const enhanced = students.map(s => ({
        ...s,
        canEdit: s.studentClassId === currentUser.mainClassId
      }));

      return res.json(enhanced);
    }

    return res.status(403).json({ message: "Access denied" });
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
}

/* =========================
   GET TEACHERS
========================= */
async function getTeachers(req, res) {
  try {
    const currentUser = req.user;

    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER", schoolId: currentUser.schoolId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        mainClassId: true,
        teacherClassId: true,
        createdAt: true
      }
    });

    return res.json(teachers);
  } catch (error) {
    console.error("GET TEACHERS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch teachers" });
  }
}

/* =========================
   UPDATE USER (FIXED)
========================= */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    // Extract classId (from frontend) and studentClassId (as fallback)
    const { name, email, role, classId, studentClassId, isMainTeacher } = req.body;
    const currentUser = req.user;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (targetUser.schoolId !== currentUser.schoolId)
      return res.status(403).json({ message: "Not authorized" });

    // Teacher authorization check
    if (currentUser.role === "TEACHER") {
      if (targetUser.role !== "STUDENT" || targetUser.studentClassId !== currentUser.mainClassId)
        return res.status(403).json({ message: "Not authorized to edit this student" });
    }

    // Determine the new Class ID from the incoming request
    const incomingClassId = classId || studentClassId;

    // Prepare update data object
    const updateData = {
      name: name ?? undefined,
      email: email ? email.toLowerCase().trim() : undefined,
    };

    // LOGIC: Update class based on the target user's role
    if (targetUser.role === "STUDENT") {
      // Use "null" if explicitly cleared, otherwise update if provided
      updateData.studentClassId = incomingClassId !== undefined ? incomingClassId : undefined;
    } 
    else if (targetUser.role === "TEACHER") {
      if (isMainTeacher) {
        updateData.mainClassId = incomingClassId;
        updateData.teacherClassId = null; // Clear secondary if they become Main
      } else {
        updateData.teacherClassId = incomingClassId;
        // Only clear mainClassId if we are explicitly changing their status
        if (isMainTeacher === false) updateData.mainClassId = null;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentClassId: true,
        teacherClassId: true,
        mainClassId: true,
        status: true
      }
    });

    return res.json({ message: "User updated successfully", user: updated });
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);
    return res.status(500).json({ message: "Update failed" });
  }
}

/* =========================
   DELETE USER
========================= */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { createdCourses: true, courses: true }
    });

    if (!targetUser || targetUser.schoolId !== currentUser.schoolId)
      return res.status(404).json({ message: "User not found" });

    if (targetUser.courses.length > 0 || targetUser.createdCourses.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete user because they are assigned to courses" 
      });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    return res.status(500).json({ message: "Failed to delete user" });
  }
}
/* =========================
   GET STUDENTS BY CLASS
========================= */
async function getStudentsByClass(req, res) {
  try {
    const { classId } = req.params;
    const currentUser = req.user;

    const students = await prisma.user.findMany({
      where: { role: "STUDENT", studentClassId: classId, schoolId: currentUser.schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, createdAt: true }
    });

    return res.json(students);
  } catch (error) {
    console.error("GET STUDENTS BY CLASS ERROR:", error);
    return res.status(500).json({ message: "Error fetching class list" });
  }
}

module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser,        // ✅ only delete, no revoke
  getTeachers,
  getStudentsByClass
};
