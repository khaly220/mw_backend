// services/advisor.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function handleStudentDistraction(studentId, topicId) {
  // 1. Log the distraction in your AIInteraction or a new 'Engagement' table
  // 2. If it happens 3 times, prepare a helpful nudge
  const nudgeMessage = {
    role: "assistant",
    content: "I noticed you've stepped away a few times. Is the topic 'Cell Division' a bit confusing? I can show you a 2-minute animation to make it easier before we continue!"
  };

  await prisma.notification.create({
    data: {
      recipientId: studentId,
      type: 'AI_ADVICE',
      title: 'A Quick Break?',
      message: nudgeMessage.content
    }
  });
}

module.exports = { handleStudentDistraction };