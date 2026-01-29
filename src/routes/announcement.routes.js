const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");
const controller = require("../controllers/announcement.controller");

router.post(
  "/",
  authenticate,
  checkRole(["ADMIN", "TEACHER"]),
  controller.createAnnouncement
);

router.get(
  "/",
  authenticate,
  controller.getAnnouncements
);

router.put(
  "/:id",
  authenticate,
  checkRole(["ADMIN", "TEACHER"]),
  controller.updateAnnouncement
);

router.delete(
  "/:id",
  authenticate,
  checkRole(["ADMIN", "TEACHER"]),
  controller.deleteAnnouncement
);

module.exports = router;
