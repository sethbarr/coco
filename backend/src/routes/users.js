const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');

// Middleware to check if user is authenticated
router.use(auth);

/**
 * @route GET /api/users/search
 * @desc Search for users by pseudonym
 * @access Private
 */
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;

    if (!query || query.length < 3) {
      return res.status(400).json({ message: 'Search query must be at least 3 characters' });
    }

    // Search for users with matching pseudonym
    const users = await prisma.user.findMany({
      where: {
        pseudonym: {
          contains: query,
          mode: 'insensitive'
        },
        id: {
          not: userId // Exclude current user
        },
        deletedAt: null
      },
      select: {
        id: true,
        pseudonym: true,
        createdAt: true
      },
      take: 10 // Limit results
    });

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route PUT /api/users/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', async (req, res) => {
  try {
    const { pseudonym } = req.body;
    const userId = req.user.id;

    // Check if pseudonym is already taken
    if (pseudonym) {
      const existingUser = await prisma.user.findFirst({
        where: {
          pseudonym,
          id: {
            not: userId
          }
        }
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Pseudonym already taken' });
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        pseudonym: pseudonym || undefined,
        updatedAt: new Date()
      },
      select: {
        id: true,
        pseudonym: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route PUT /api/users/public-key
 * @desc Update user's public key
 * @access Private
 */
router.put('/public-key', async (req, res) => {
  try {
    const { publicKey } = req.body;
    const userId = req.user.id;

    if (!publicKey) {
      return res.status(400).json({ message: 'Public key is required' });
    }

    // Update user's public key
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        publicKey,
        updatedAt: new Date()
      }
    });

    res.json({ message: 'Public key updated successfully' });
  } catch (error) {
    console.error('Error updating public key:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route DELETE /api/users
 * @desc Delete user account (soft delete)
 * @access Private
 */
router.delete('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Soft delete the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/users/data
 * @desc Get all user data for GDPR compliance
 * @access Private
 */
router.get('/data', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all user data
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        createdConnections: true,
        receivedConnections: true,
        createdSessions: {
          include: {
            participants: true,
            messages: true
          }
        },
        participatedSessions: {
          include: {
            session: {
              include: {
                messages: true
              }
            }
          }
        },
        messages: true
      }
    });

    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(userData);
  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;