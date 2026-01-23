const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");
const announcementController = require("../controllers/announcement.controller");

// CRUD routes
router.post("/", authenticate, checkRole(["ADMIN", "TEACHER"]), announcementController.createAnnouncement);
router.get("/", authenticate, checkRole(["ADMIN", "TEACHER", "STUDENT"]), announcementController.getAnnouncements);
router.put("/:id", authenticate, checkRole(["ADMIN", "TEACHER"]), announcementController.updateAnnouncement);
router.delete("/:id", authenticate, checkRole(["ADMIN", "TEACHER"]), announcementController.deleteAnnouncement);

module.exports = router;
