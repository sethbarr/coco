const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');
const { generateSessionRecap } = require('../services/claude-simple');

// Middleware to check if user is authenticated
router.use(auth);

/**
 * @route GET /api/sessions/current
 * @desc Get or create current session for the user
 * @access Private
 */
router.get('/current', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // First, try to find an existing individual session
    let session = await prisma.session.findFirst({
      where: {
        type: 'individual',
        participants: {
          some: {
            userId
          }
        },
        endedAt: null
      },
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
        messages: {
          orderBy: {
            sentAt: 'asc'
          },
          include: {
            sender: {
              select: {
                id: true,
                pseudonym: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // If no active session exists, create a new individual session
    if (!session) {
      console.log('No active session found, creating a new one');
      
      // Create new session
      const newSession = await prisma.session.create({
        data: {
          type: 'individual',
          createdById: userId
        }
      });
      
      // Add user as participant
      await prisma.sessionParticipant.create({
        data: {
          sessionId: newSession.id,
          userId
        }
      });
      
      // Fetch complete session with participants
      session = await prisma.session.findUnique({
        where: { id: newSession.id },
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
          messages: {
            orderBy: {
              sentAt: 'asc'
            },
            include: {
              sender: {
                select: {
                  id: true,
                  pseudonym: true
                }
              }
            }
          }
        }
      });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error getting/creating current session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route POST /api/sessions
 * @desc Create a new session
 * @access Private
 */
router.post('/', async (req, res) => {
  try {
    const { type, participantIds = [] } = req.body;
    const userId = req.user.id;

    // Validate session type
    if (!['individual', 'joint'].includes(type)) {
      return res.status(400).json({ message: 'Invalid session type' });
    }

    // For joint sessions, validate participants
    if (type === 'joint' && participantIds.length === 0) {
      return res.status(400).json({ message: 'Joint sessions require at least one other participant' });
    }

    // Verify all participants exist
    if (participantIds.length > 0) {
      const allParticipants = await prisma.user.findMany({
        where: {
          id: { in: [...participantIds, userId] },
          deletedAt: null
        }
      });

      if (allParticipants.length !== participantIds.length + 1) {
        return res.status(400).json({ message: 'One or more participants not found' });
      }

      // Check if connections exist between creator and all participants
      const connections = await prisma.connection.findMany({
        where: {
          OR: [
            {
              creatorId: userId,
              recipientId: { in: participantIds },
              status: 'active'
            },
            {
              creatorId: { in: participantIds },
              recipientId: userId,
              status: 'active'
            }
          ]
        }
      });

      // Create a set of participant IDs who have connections with the creator
      const connectedParticipants = new Set();
      connections.forEach(conn => {
        if (conn.creatorId === userId) {
          connectedParticipants.add(conn.recipientId);
        } else if (conn.recipientId === userId) {
          connectedParticipants.add(conn.creatorId);
        }
      });

      // Verify all participants have a connection with the creator
      const missingConnections = participantIds.filter(id => !connectedParticipants.has(id));
      if (missingConnections.length > 0) {
        return res.status(400).json({ 
          message: 'You must have an active connection with all participants',
          missingConnections
        });
      }
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        type,
        createdById: userId
      }
    });

    // Add creator as a participant
    await prisma.sessionParticipant.create({
      data: {
        sessionId: session.id,
        userId
      }
    });

    // Add other participants for joint sessions
    if (type === 'joint' && participantIds.length > 0) {
      const participantData = participantIds.map(participantId => ({
        sessionId: session.id,
        userId: participantId
      }));

      await prisma.sessionParticipant.createMany({
        data: participantData
      });
    }

    // Fetch complete session with participants
    const completeSession = await prisma.session.findUnique({
      where: { id: session.id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                pseudonym: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(completeSession);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/sessions
 * @desc Get all sessions for a user
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all sessions where user is a participant
    const sessions = await prisma.session.findMany({
      where: {
        participants: {
          some: {
            userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                pseudonym: true
              }
            }
          }
        },
        messages: {
          orderBy: {
            sentAt: 'desc'
          },
          take: 1,
          select: {
            id: true,
            encryptedContent: true,
            sentAt: true,
            isAi: true,
            sender: {
              select: {
                id: true,
                pseudonym: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(sessions);
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/sessions/:id
 * @desc Get a session by ID
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is a participant in the session
    const participant = await prisma.sessionParticipant.findUnique({
      where: {
        sessionId_userId: {
          sessionId: id,
          userId
        }
      }
    });

    if (!participant) {
      return res.status(403).json({ message: 'User is not a participant in this session' });
    }

    // Get the session
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        topic: { select: { id: true, title: true } },
        recap: { select: { id: true } },
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
        messages: {
          orderBy: {
            sentAt: 'asc'
          },
          include: {
            sender: {
              select: {
                id: true,
                pseudonym: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route POST /api/sessions/:id/wrapup
 * @desc Wrap up a topic joint session: Coco generates a structured recap
 *       (summary, agreements, commitments) for both partners to endorse
 * @access Private
 */
router.post('/:id/wrapup', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        topic: { include: { summaries: { include: { user: { select: { id: true, pseudonym: true } } } } } },
        recap: { include: { agreements: true } },
        participants: { include: { user: { select: { id: true, pseudonym: true } } } },
        messages: {
          orderBy: { sentAt: 'asc' },
          include: { sender: { select: { id: true, pseudonym: true } } }
        }
      }
    });

    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (!session.participants.some(p => p.user.id === userId)) {
      return res.status(403).json({ message: 'User is not a participant in this session' });
    }
    if (session.type !== 'joint' || !session.topic) {
      return res.status(400).json({ message: 'Wrap-up is only available for topic joint sessions' });
    }
    if (session.recap) {
      return res.json(session.recap); // already wrapped up
    }
    if (session.messages.length < 2) {
      return res.status(400).json({ message: 'Not enough conversation yet to wrap up' });
    }

    const participantNames = session.participants.map(p => p.user.pseudonym);
    const summaries = session.topic.summaries
      .filter(s => s.approvedAt)
      .map(s => ({ name: s.user.pseudonym, content: s.content }));

    const recapData = await generateSessionRecap(
      session.topic.title, participantNames, session.messages, summaries
    );
    if (!recapData) {
      return res.status(502).json({ message: 'Could not generate a recap — please try again' });
    }

    // Map commitment pseudonyms back to user ids
    const byName = {};
    session.participants.forEach(p => { byName[p.user.pseudonym] = p.user.id; });

    const recap = await prisma.sessionRecap.create({
      data: {
        sessionId: session.id,
        topicId: session.topic.id,
        summary: recapData.summary,
        suggestedCheckInDays: recapData.suggestedCheckInDays,
        agreements: {
          create: [
            ...recapData.agreements.map(text => ({
              topicId: session.topic.id, text, ownerId: null
            })),
            ...recapData.commitments
              .filter(c => byName[c.name])
              .map(c => ({
                topicId: session.topic.id, text: c.text, ownerId: byName[c.name]
              }))
          ]
        }
      },
      include: { agreements: true }
    });

    res.status(201).json(recap);
  } catch (error) {
    console.error('Error wrapping up session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route PUT /api/sessions/:id/end
 * @desc End a session
 * @access Private
 */
router.put('/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if session exists and user is the creator
    const session = await prisma.session.findFirst({
      where: {
        id,
        createdById: userId
      }
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found or user is not the creator' });
    }

    if (session.endedAt) {
      return res.status(400).json({ message: 'Session is already ended' });
    }

    // End the session
    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        endedAt: new Date()
      }
    });

    res.json(updatedSession);
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;