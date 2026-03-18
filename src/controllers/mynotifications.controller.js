const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


// Use 'export const' instead of 'exports.'
exports.getMyNotifications = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const notifications = await prisma.notification.findMany({
      where: { 
        recipientId: req.user.id 
      },
      orderBy: { 
        createdAt: 'desc' 
      }
    });

    return res.json(notifications || []);
  } catch (error) {
    console.error("NOTIFICATIONS BACKEND CRASH:", error.message);
    return res.status(500).json({ 
      message: "Database error", 
      error: error.message 
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { 
        recipientId: req.user.id,
        isRead: false 
      },
      data: { isRead: true }
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update notifications" });
  }
};

exports.clearAllNotifications = async (req, res) => {
  try {
    const { id } = req.user;
    await prisma.notification.deleteMany({
      where: {
        recipientId: id,
      },
    });
    return res.json({ success: true, message: "Notifications cleared" });
  } catch (error) {
    console.error("CLEAR NOTIFICATIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to clear notifications" });
  }
};


exports.createLiveNotification = async (req, res) => {
  try {
    const { userId, type, message, metadata } = req.body;

    // 1. Basic Validation
    if (!userId || !message) {
      return res.status(400).json({ 
        success: false, 
        error: "User ID and message are required." 
      });
    }

    // 2. Create the notification in PostgreSQL via Prisma
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type || 'GENERAL',
        message,
        metadata: metadata || {}, // Useful for storing links or IDs
        isRead: false,
      },
    });

    // 3. Optional: Trigger your real-time logic here
    // Example: io.to(userId).emit('new_notification', notification);

    return res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error creating live notification:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};