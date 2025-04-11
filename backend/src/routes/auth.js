/**
 * Enhanced authentication system with proper token lifecycle management
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Set up rate limiting for authentication routes
// 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' }
});

/**
 * Generate a secure random token
 * @returns {string} Random token string
 */
function generateSecureToken() {
  return crypto.randomBytes(40).toString('hex');
}

/**
 * Create a JWT token and refresh token
 * @param {object} payload - JWT payload
 * @returns {Promise<{accessToken: string, refreshToken: string}>} - Token pair
 */
async function createTokenPair(payload) {
  // Create short-lived access token (15 minutes)
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  // Create refresh token with longer lifespan
  const refreshToken = generateSecureToken();
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days
  
  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: payload.user.id,
      expiresAt: refreshTokenExpiry,
      userAgent: payload.userAgent || null,
      ipAddress: payload.ipAddress || null
    }
  });
  
  return { accessToken, refreshToken };
}

/**
 * @route POST /api/auth/register
 * @desc Register a user
 * @access Public
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { pseudonym, password, publicKey } = req.body;
    
    // Validate input
    if (!pseudonym || !password || !publicKey) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Check if pseudonym already exists
    const existingUser = await prisma.user.findFirst({
      where: { pseudonym }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Pseudonym already taken' });
    }

    // Create an auth ID (hashed password)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        pseudonym,
        authId: hashedPassword,
        publicKey
      }
    });

    // Create JWT payload with request metadata
    const payload = {
      user: {
        id: user.id
      },
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    };

    // Generate token pair
    const { accessToken, refreshToken } = await createTokenPair(payload);
    
    // Set HTTP-only cookie with refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });
    
    // Set CSRF token
    const csrfToken = crypto.randomBytes(20).toString('hex');
    res.cookie('csrfToken', csrfToken, {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });

    res.json({ 
      token: accessToken, 
      csrfToken,
      user: { 
        id: user.id, 
        pseudonym: user.pseudonym 
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Authenticate user & get token
 * @access Public
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { pseudonym, password } = req.body;
    
    // Validate input
    if (!pseudonym || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { 
        pseudonym,
        deletedAt: null
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.authId);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT payload with request metadata
    const payload = {
      user: {
        id: user.id
      },
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    };

    // Generate token pair
    const { accessToken, refreshToken } = await createTokenPair(payload);
    
    // Invalidate all previous refresh tokens for this user from this device
    await prisma.refreshToken.updateMany({
      where: { 
        userId: user.id,
        userAgent: req.headers['user-agent']
      },
      data: {
        invalid: true
      }
    });
    
    // Set HTTP-only cookie with refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });
    
    // Set CSRF token
    const csrfToken = crypto.randomBytes(20).toString('hex');
    res.cookie('csrfToken', csrfToken, {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });

    res.json({ 
      token: accessToken, 
      csrfToken,
      user: { 
        id: user.id, 
        pseudonym: user.pseudonym 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/auth/user
 * @desc Get user data
 * @access Private
 */
router.get('/user', auth, async (req, res) => {
  try {
    // Validate CSRF token (skip validation in development)
    if (process.env.NODE_ENV === 'production') {
      const csrfTokenCookie = req.cookies.csrfToken;
      const csrfTokenHeader = req.headers['x-csrf-token'];
      
      if (!csrfTokenCookie || !csrfTokenHeader || csrfTokenCookie !== csrfTokenHeader) {
        return res.status(403).json({ message: 'CSRF token invalid' });
      }
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        pseudonym: true,
        publicKey: true,
        createdAt: true,
        lastActive: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh authentication token
 * @access Public (but requires valid refresh token)
 */
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from HttpOnly cookie
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }
    
    // Validate CSRF token (skip validation in development)
    if (process.env.NODE_ENV === 'production') {
      const csrfTokenCookie = req.cookies.csrfToken;
      const csrfTokenHeader = req.headers['x-csrf-token'];
      
      if (!csrfTokenCookie || !csrfTokenHeader || csrfTokenCookie !== csrfTokenHeader) {
        return res.status(403).json({ message: 'CSRF token invalid' });
      }
    }
    
    // Find refresh token in database
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        invalid: false,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            pseudonym: true
          }
        }
      }
    });
    
    if (!tokenRecord) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    // Create JWT payload
    const payload = {
      user: {
        id: tokenRecord.user.id
      },
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    };
    
    // Generate new token pair with rotation
    const { accessToken, refreshToken: newRefreshToken } = await createTokenPair(payload);
    
    // Invalidate the used refresh token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { invalid: true }
    });
    
    // Set HTTP-only cookie with new refresh token
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });
    
    // Generate new CSRF token
    const newCsrfToken = crypto.randomBytes(20).toString('hex');
    res.cookie('csrfToken', newCsrfToken, {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });
    
    res.json({ 
      token: accessToken, 
      csrfToken: newCsrfToken,
      user: { 
        id: tokenRecord.user.id, 
        pseudonym: tokenRecord.user.pseudonym 
      } 
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout and invalidate tokens
 * @access Private
 */
router.post('/logout', auth, async (req, res) => {
  try {
    // Get refresh token from HttpOnly cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      // Invalidate the refresh token
      await prisma.refreshToken.updateMany({
        where: { 
          token: refreshToken,
          userId: req.user.id
        },
        data: { invalid: true }
      });
    }
    
    // Clear cookies
    res.clearCookie('refreshToken');
    res.clearCookie('csrfToken');
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route DELETE /api/auth/sessions
 * @desc Invalidate all refresh tokens for the user (logout from all devices)
 * @access Private
 */
router.delete('/sessions', auth, async (req, res) => {
  try {
    // Invalidate all refresh tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id },
      data: { invalid: true }
    });
    
    // Clear cookies for current session
    res.clearCookie('refreshToken');
    res.clearCookie('csrfToken');
    
    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Error ending all sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;