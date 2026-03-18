const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

/**
 * REGISTER USER
 * - Private teacher/student
 * - School users (schoolId required)
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, schoolId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Admin can ONLY exist with a school
    if (role === "ADMIN" && !schoolId) {
      return res.status(403).json({
        message: "Admin must belong to a school",
      });
    }

    // Students/Teachers can be private OR school-based
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        schoolId: schoolId || null,
      },
    });

    const token = signToken(user);

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
      token,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * LOGIN USER
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * TEACHER DASHBOARD
 * - School teachers → only their assigned courses
 * - Private teachers → only their own courses
 */
exports.teacherDashboard = async (req, res) => {
  try {
    const { id: userId, schoolId, role } = req.user;

    // Extra safety (even if requireTeacher exists)
    if (role !== "TEACHER" && role !== "PRIVATE_TEACHER") {
      return res.status(403).json({ message: "Access denied" });
    }

    const courses = await prisma.course.findMany({
      where: {
        teacherId: userId,
        ...(schoolId ? { schoolId } : {}),
      },
      include: {
        assignments: true,
        students: {
          select: { id: true },
        },
      },
    });

    const stats = {
      totalCourses: courses.length,
      totalassignments: courses.reduce((a, c) => a + c.assignments.length, 0),
      totalStudents: courses.reduce((a, c) => a + c.students.length, 0),
    };

    res.json({
      stats,
      courses,
    });
  } catch (err) {
    console.error("Teacher dashboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

