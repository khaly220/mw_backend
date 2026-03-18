const router = require("express").Router();
const {
  registerSchool,
  loginSchool,
  getSchools,
} = require("../controllers/school.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

router.post("/register", registerSchool);
router.post("/login", loginSchool);

router.get("/", getSchools);

module.exports = router;
