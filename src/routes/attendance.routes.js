// routes/attendance.routes.js

const express = require("express");
const router = express.Router();
const { authenticate  } = require("../middleware/auth.middleware");


const { markAttendance, getAttendanceReport } = require("../controllers/attendance.controller");

router.post(
  "/",
  authenticate ,
  markAttendance
);



router.get(
  "/report-grid",
  authenticate,
  getAttendanceReport
);
module.exports = router;
