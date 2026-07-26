/**
 * Enhanced authentication middleware with improved security features
 */
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request object
 */
module.exports = async function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate that token was issued to the same client
    // This helps mitigate token theft
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    
    if (decoded.userAgent && decoded.userAgent !== userAgent) {
      // Potential token theft from different browser/device
      await invalidateRefreshTokens(decoded.user.id, userAgent);
      return res.status(401).json({ message: 'Invalid client, please login again' });
    }
    
    // Check if user exists and is not deleted
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.user.id,
        deletedAt: null
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found or deleted' });
    }
    
    // Check if user is locked out (optional security feature)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(403).json({ 
        message: 'Account temporarily locked', 
        lockedUntil: user.lockedUntil 
      });
    }

    // Add user to request
    req.user = decoded.user;
    
    // Update last active timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() }
    });

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        expired: true
      });
    }
    
    console.error('Token verification error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

/**
 * Helper function to invalidate refresh tokens
 * Used when potential token theft is detected
 */
async function invalidateRefreshTokens(userId, userAgent) {
  try {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        userAgent
      },
      data: {
        invalid: true
      }
    });
    
    // Comment out or remove the security event creation since the model doesn't exist yet
    // If you've added the SecurityEvent model to your schema, you can uncomment this
    /*
    await prisma.securityEvent.create({
      data: {
        userId,
        eventType: 'potential_token_theft',
        metadata: {
          userAgent,
          timestamp: new Date()
        }
      }
    });
    */
    
    // Log the event instead
    console.warn(`Potential token theft detected for user ${userId} with user agent ${userAgent}`);
  } catch (error) {
    console.error('Error invalidating refresh tokens:', error);
  }
}