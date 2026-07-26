/**
 * Socket.IO server: JWT-authenticated, one room per session.
 * Clients join a session room only after we verify they are a participant.
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let io = null;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }
  });

  // Authenticate every socket connection with the same JWT used by the REST API
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.user.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('session:join', async (sessionId, callback) => {
      try {
        const participant = await prisma.sessionParticipant.findUnique({
          where: {
            sessionId_userId: { sessionId, userId: socket.userId }
          }
        });
        if (!participant) {
          return callback?.({ error: 'Not a participant in this session' });
        }
        socket.join(sessionId);
        callback?.({ ok: true });
      } catch (err) {
        console.error('session:join error:', err);
        callback?.({ error: 'Failed to join session' });
      }
    });

    socket.on('session:leave', (sessionId) => {
      socket.leave(sessionId);
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { init, getIO };
