/**
 * Enhanced message handling service with proper AI message encryption
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { handleUserMessage, handlePrepSession, handleJointSession, handleReflection, handleCheckinSession } = require('../services/claude-simple');
const { assessMessage, buildResourceCard, crisisPauseMessage } = require('../services/safety');
const auth = require('../middleware/auth');
const { getIO } = require('../socket');

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
        },
        topic: {
          include: {
            summaries: {
              include: { user: { select: { id: true, pseudonym: true } } }
            },
            agreements: true,
            recaps: { orderBy: { createdAt: 'desc' }, take: 1 }
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

    // Programmatic safety check — independent of the counseling prompt
    let safety = null;
    try {
      const assessment = await assessMessage(content);
      if (assessment) {
        safety = buildResourceCard(assessment, session.type);
        // Log the flag without message content — flags are queryable, transcripts stay private
        await prisma.securityEvent.create({
          data: {
            userId,
            eventType: 'safety_flag',
            metadata: { sessionId, level: assessment.level, category: assessment.category }
          }
        });
      }
    } catch (error) {
      console.error('Safety assessment error:', error);
    }

    let aiResponse;

    if (safety?.level === 'crisis') {
      // Pause the session: fixed, reviewed wording instead of a sampled reply
      aiResponse = crisisPauseMessage(safety.category, session.type);
    } else {
      try {
        // Handle based on session type
        const nameById = {};
        session.participants.forEach(p => { nameById[p.user.id] = p.user.pseudonym; });
        const liveAgreements = (session.topic?.agreements || [])
          .filter(a => ['active', 'struggling', 'kept'].includes(a.status))
          .map(a => ({ id: a.id, text: a.text, owner: a.ownerId ? nameById[a.ownerId] || null : null, status: a.status }));

        if (session.type === 'individual') {
          if (session.topic && session.kind === 'reflection') {
            // Private reflection on how the agreements are going
            aiResponse = await handleReflection(content, messageHistory, session.topic.title, liveAgreements);
          } else if (session.topic) {
            // Guided private prep for a named topic
            aiResponse = await handlePrepSession(content, messageHistory, session.topic.title);
          } else {
            aiResponse = await handleUserMessage(content, messageHistory);
          }
        } else if (session.type === 'joint') {
          const sender = session.participants.find(p => p.user.id === userId);
          const senderName = sender.user.pseudonym;
          const participantNames = session.participants.map(p => p.user.pseudonym);

          if (session.topic && session.kind === 'checkin') {
            aiResponse = await handleCheckinSession(content, senderName, participantNames, messageHistory, {
              topicTitle: session.topic.title,
              agreements: liveAgreements,
              lastRecapSummary: session.topic.recaps?.[0]?.summary || null
            });
          } else {
            // Topic-based joint sessions brief Coco with both approved summaries
            let briefing = null;
            if (session.topic) {
              briefing = {
                topicTitle: session.topic.title,
                summaries: session.topic.summaries
                  .filter(s => s.approvedAt)
                  .map(s => ({ name: s.user.pseudonym, content: s.content }))
              };
            }
            aiResponse = await handleJointSession(content, senderName, participantNames, messageHistory, briefing);
          }
        }
        
        console.log('AI Response received:', aiResponse ? aiResponse.substring(0, 50) + '...' : 'No response');
      } catch (error) {
        console.error('Error getting AI response:', error);
        return res.status(500).json({ message: 'Failed to get AI response', error: error.message });
      }
    }

    // Store a single AI message visible to all participants
    const aiMessage = await prisma.message.create({
      data: {
        sessionId,
        senderId: userId, // AI messages associated with the user who triggered them
        isAi: true,
        encryptedContent: aiResponse,
        encryptionMetadata: {
          timestamp: new Date().toISOString(),
          // Persisted so the resource card re-renders on reload
          ...(safety ? { safety } : {})
        }
      }
    });

    const sender = session.participants.find(p => p.user.id === userId);
    const userMessagePayload = {
      ...userMessage,
      content,
      sender: { id: userId, pseudonym: sender?.user.pseudonym }
    };
    const aiMessagePayload = { ...aiMessage, content: aiResponse };

    // Broadcast to everyone else viewing this session
    const io = getIO();
    if (io) {
      io.to(sessionId).emit('message:new', userMessagePayload);
      io.to(sessionId).emit('message:new', aiMessagePayload);
    }

    return res.status(201).json({
      userMessage: userMessagePayload,
      aiMessage: aiMessagePayload
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

    // All messages in the session (AI messages are shared by all participants)
    const messages = await prisma.message.findMany({
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