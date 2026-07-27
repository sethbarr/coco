/**
 * In-app notifications: persist + push over the user's socket room.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getIO } = require('../socket');

/**
 * Create a notification for a user and push it live if they're connected.
 * Never throws — notification failures must not break the main action.
 */
async function notify(userId, type, message, link = null) {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, message, link }
    });
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification);
    }
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
}

module.exports = { notify };
