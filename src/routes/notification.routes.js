const express = require("express");
const router = express.Router();

// 1. Import using require (CommonJS)
// Note: We removed the .js extension as it is optional in CommonJS
const { 
  getMyNotifications, 
  markAsRead, 
  clearAllNotifications,
  createLiveNotification 
} = require("../controllers/mynotifications.controller"); 

const { authenticate } = require("../middleware/auth.middleware");

// 2. Routes logic
router.get("/", authenticate , getMyNotifications);
router.patch("/mark-read", authenticate, markAsRead);
router.delete("/clear-all", authenticate, clearAllNotifications);

// This handles the new live notification logic
router.post("/start-live", authenticate, createLiveNotification);

// 3. Export using CommonJS
module.exports = router;