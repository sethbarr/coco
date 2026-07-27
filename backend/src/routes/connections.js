const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');
const { notify } = require('../services/notify');

// Middleware to check if user is authenticated
router.use(auth);

/**
 * @route POST /api/connections/invite
 * @desc Invite a user to connect
 * @access Private
 */
router.post('/invite', async (req, res) => {
  try {
    const { recipientPseudonym, relationshipType } = req.body;
    const userId = req.user.id;

    // Validate relationship type
    const validTypes = ['partner', 'family', 'friend'];
    if (!validTypes.includes(relationshipType)) {
      return res.status(400).json({ message: 'Invalid relationship type' });
    }

    // Find recipient by pseudonym
    const recipient = await prisma.user.findFirst({
      where: { 
        pseudonym: recipientPseudonym,
        deletedAt: null
      }
    });

    if (!recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent self-connection
    if (recipient.id === userId) {
      return res.status(400).json({ message: 'Cannot connect with yourself' });
    }

    // Check if connection already exists
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          {
            creatorId: userId,
            recipientId: recipient.id
          },
          {
            creatorId: recipient.id,
            recipientId: userId
          }
        ]
      }
    });

    if (existingConnection) {
      return res.status(400).json({ 
        message: 'Connection already exists',
        connection: existingConnection
      });
    }

    // Create connection
    const connection = await prisma.connection.create({
      data: {
        creatorId: userId,
        recipientId: recipient.id,
        relationshipType,
        status: 'pending'
      }
    });

    // Return connection with user details
    const connectionWithDetails = await prisma.connection.findUnique({
      where: { id: connection.id },
      include: {
        creator: {
          select: {
            id: true,
            pseudonym: true
          }
        },
        recipient: {
          select: {
            id: true,
            pseudonym: true
          }
        }
      }
    });

    await notify(
      recipient.id,
      'connection_invite',
      `${connectionWithDetails.creator.pseudonym} invited you to connect`,
      '/connections'
    );

    res.status(201).json(connectionWithDetails);
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/connections
 * @desc Get all connections for a user
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all connections where user is creator or recipient
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { recipientId: userId }
        ]
      },
      include: {
        creator: {
          select: {
            id: true,
            pseudonym: true
          }
        },
        recipient: {
          select: {
            id: true,
            pseudonym: true
          }
        }
      }
    });

    res.json(connections);
  } catch (error) {
    console.error('Error getting connections:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route PUT /api/connections/:id/accept
 * @desc Accept a connection invitation
 * @access Private
 */
router.put('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if connection exists and user is the recipient
    const connection = await prisma.connection.findFirst({
      where: {
        id,
        recipientId: userId,
        status: 'pending'
      }
    });

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found or already processed' });
    }

    // Update connection status
    const updatedConnection = await prisma.connection.update({
      where: { id },
      data: {
        status: 'active',
        updatedAt: new Date()
      },
      include: {
        creator: {
          select: {
            id: true,
            pseudonym: true
          }
        },
        recipient: {
          select: {
            id: true,
            pseudonym: true
          }
        }
      }
    });

    await notify(
      updatedConnection.creator.id,
      'connection_accepted',
      `${updatedConnection.recipient.pseudonym} accepted your connection invitation`,
      '/connections'
    );

    res.json(updatedConnection);
  } catch (error) {
    console.error('Error accepting connection:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route PUT /api/connections/:id/decline
 * @desc Decline a connection invitation
 * @access Private
 */
router.put('/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if connection exists and user is the recipient
    const connection = await prisma.connection.findFirst({
      where: {
        id,
        recipientId: userId,
        status: 'pending'
      }
    });

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found or already processed' });
    }

    // Update connection status
    const updatedConnection = await prisma.connection.update({
      where: { id },
      data: {
        status: 'declined',
        updatedAt: new Date()
      }
    });

    res.json(updatedConnection);
  } catch (error) {
    console.error('Error declining connection:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route DELETE /api/connections/:id
 * @desc Remove a connection
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if connection exists and user is either creator or recipient
    const connection = await prisma.connection.findFirst({
      where: {
        id,
        OR: [
          { creatorId: userId },
          { recipientId: userId }
        ]
      }
    });

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    // Delete connection
    await prisma.connection.delete({
      where: { id }
    });

    res.json({ message: 'Connection removed successfully' });
  } catch (error) {
    console.error('Error removing connection:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;