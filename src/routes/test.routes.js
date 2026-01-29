const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

router.get("/protected", authenticate, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user,
  });
});

router.get(
  "/admin",
  authenticate,
  checkRole(["ADMIN"]),
  (req, res) => {
    res.json({ message: "Welcome Admin" });
  }
);

router.get(
  "/teacher",
  authenticate,
  checkRole(["TEACHER", "ADMIN"]),
  (req, res) => {
    res.json({ message: "Welcome Teacher" });
  }
);

router.get(
  "/student",
  authenticate,
  checkRole(["STUDENT"]),
  (req, res) => {
    res.json({ message: "Welcome Student" });
  }
);

module.exports = router; 
