const express = require('express');
const router = express.Router();
const contentController = require('../controllers/courseContent.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate); // All content routes require login


router.post("/", authenticate, contentController.createContent);
router.put("/:id", authenticate, contentController.updateContent);
router.delete("/:id", authenticate, contentController.deleteContent);

router.get("/:courseId", authenticate, contentController.getCourseContent);// Both Teacher & Student can view content
module.exports = router;

