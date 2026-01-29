const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.notifyUser = async (userId, title, message) => {
  return prisma.notification.create({
    data: { userId, title, message },
  });
};

exports.notifyMany = async (userIds, title, message) => {
  return prisma.notification.createMany({
    data: userIds.map(id => ({ userId: id, title, message })),
  });
};
