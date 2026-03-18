const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ---------------- REGISTER SCHOOL ----------------
exports.registerSchool = async (req, res) => {
  try {
    const { schoolName, adminName, adminEmail, password, location } = req.body;

    if (!schoolName || !adminName || !adminEmail || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if school already exists
    const existingSchool = await prisma.school.findUnique({ where: { name: schoolName } });
    if (existingSchool) {
      return res.status(400).json({ error: "School already exists" });
    }

    // Hash admin password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create school and first admin in one go
    const school = await prisma.school.create({
      data: {
        name: schoolName,
        location: location || null,
        users: {
          create: {
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: "ADMIN",
            status: "ACTIVE",
          },
        },
      },
      include: { users: true },
    });

    // Get the admin we just created
    const adminUser = school.users[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role, schoolId: school.id },
      process.env.JWT_SECRET || "mwarimuai",
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "School registered successfully",
      school,
      admin: adminUser,
      token,
    });
  } catch (err) {
    console.error("School registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
// ---------------- LOGIN SCHOOL ADMIN ----------------
exports.loginSchool = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const admin = await prisma.user.findFirst({
      where: { email, role: "ADMIN"},
    });
    if (!admin) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || "mwarimuai",
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful", admin, token });
  } catch (err) {
    console.error("School login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ---------------- GET ALL SCHOOLS ----------------
exports.getSchools = async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      include: {
        // Fetch users, but only those who are admins
        users: {
          where: {
            role: "ADMIN"
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        // You can also count how many classes/courses they have without fetching the full list
        _count: {
          select: {
            classes: true,
            courses: true
          }
        }
      }
    });

    // Optional: Map the data so "users" is renamed to "admins" for your frontend
    const formattedSchools = schools.map(school => ({
      ...school,
      admins: school.users,
      users: undefined // remove the original users key
    }));

    res.json(formattedSchools);
  } catch (error) {
    console.error("GET SCHOOLS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch schools" });
  }
};
