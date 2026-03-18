const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * @param {string} recipientId - Who receives it
 * @param {string} senderId - Who triggered it
 * @param {string} type - 'NEW_TEST', 'MARKS', 'ATTENDANCE', 'COURSE_ASSIGNED'
 * @param {string} title - Short heading
 * @param {string} message - Detail text
 * @param {string} link - (Optional) Frontend route to click
 */
// notification.helper.js

const createNotification = async (recipientId, senderId, type, title, message, link = null) => {
  const notification = await prisma.notification.create({
    data: { recipientId, senderId, type, title, message, link }
  });

  // EMIT REAL-TIME EVENT
  if (global.io) {
    // CHANGE THIS: from "new_notification" to "new-notification"
    global.io.to(recipientId).emit("new-notification", notification);
    console.log(`📡 Socket emitted to user ${recipientId}`);
  }
  
  return notification;
};
module.exports = { createNotification };