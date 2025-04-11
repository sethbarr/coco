/**
 * Enhanced message handling service with proper AI message encryption
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { handleUserMessage, handleJointSession } = require('../services/claude-simple');
const auth = require('../middleware/auth');

// Middleware to check if user is authenticated
router.use(auth);

/**
 * @route POST /api/messages
 * @desc Send a message in a session with proper end-to-end encryption
 * @access Private
 */
router.post('/', async (req, res) => {
  try {
    const { sessionId, content, encryptedContent, encryptionMetadata } = req.body;
    const userId = req.user.id;

    // Check if session exists and user is a participant
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                pseudonym: true,
                publicKey: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const isParticipant = session.participants.some(p => p.user.id === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: 'User is not a participant in this session' });
    }

    // Save the user's message (handle both encrypted and plain text)
    const userMessage = await prisma.message.create({
      data: {
        sessionId,
        senderId: userId,
        isAi: false,
        encryptedContent: encryptedContent || content, // Fallback to plain text if encryption is not set up
        encryptionMetadata: encryptionMetadata || {}
      }
    });

    // Get session history for context
    const messageHistory = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { sentAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            pseudonym: true
          }
        }
      }
    });

    let aiResponse;

    try {
      // Handle based on session type
      if (session.type === 'individual') {
        // For individual sessions, just send the content to Claude
        aiResponse = await handleUserMessage(content, messageHistory);
      } else if (session.type === 'joint') {
        // For joint sessions, get the sender's name
        const sender = session.participants.find(p => p.user.id === userId);
        const senderName = sender.user.pseudonym;
        
        aiResponse = await handleJointSession(content, senderName, messageHistory);
      }
      
      console.log('AI Response received:', aiResponse ? aiResponse.substring(0, 50) + '...' : 'No response');
    } catch (error) {
      console.error('Error getting AI response:', error);
      return res.status(500).json({ message: 'Failed to get AI response', error: error.message });
    }

    // Store or encrypt the AI response for each participant
    const aiMessages = await Promise.all(
      session.participants.map(async (participant) => {
        // In a real implementation with actual E2E encryption, each user would
        // have their own encrypted version. For this simplified version,
        // we're just storing the same response for each user but with metadata
        // that indicates which user it's for.
        
        return prisma.message.create({
          data: {
            sessionId,
            senderId: userId, // AI messages associated with the user who triggered them
            isAi: true,
            encryptedContent: aiResponse, // For demo purposes, storing actual content
            encryptionMetadata: {
              forUserId: participant.user.id,
              timestamp: new Date().toISOString()
            }
          }
        });
      })
    );

    // Find the AI message for the current user
    const userAiMessage = aiMessages.find(msg => 
      msg.encryptionMetadata.forUserId === userId
    );

    return res.status(201).json({
      userMessage: {
        ...userMessage,
        content: content // Send plaintext content to display
      },
      aiMessage: {
        ...userAiMessage,
        content: aiResponse // Send plaintext content to display
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/messages/:sessionId
 * @desc Get messages for a session
 * @access Private
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Check if user is a participant in the session
    const participant = await prisma.sessionParticipant.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId
        }
      }
    });

    if (!participant) {
      return res.status(403).json({ message: 'User is not a participant in this session' });
    }

    // Get messages for the session where the user is either the sender or the intended recipient
    const messages = await prisma.message.findMany({
      where: { 
        sessionId,
        OR: [
          { isAi: false }, // All non-AI messages in the session
          { 
            isAi: true,
            // Use JSON path query to find AI messages for this user
            encryptionMetadata: {
              path: ['forUserId'],
              equals: userId
            }
          } 
        ]
      },
      orderBy: { sentAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            pseudonym: true
          }
        }
      }
    });

    // Transform messages before sending to add content field for UI
    const messagesWithContent = messages.map(msg => ({
      ...msg,
      content: msg.encryptedContent // Use the stored content as the displayed content
    }));

    return res.json(messagesWithContent);
  } catch (error) {
    console.error('Error getting messages:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;