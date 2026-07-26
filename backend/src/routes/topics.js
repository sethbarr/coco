/**
 * Topics: the guided-work arc.
 * A topic belongs to a connection. Each partner does a private prep session,
 * approves a shared summary, and only when both are approved can a joint
 * session be created (with Coco briefed on both summaries).
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');

router.use(auth);

/** Load a topic and verify the requester is one of the two partners. */
async function loadTopicForUser(topicId, userId) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      connection: {
        include: {
          creator: { select: { id: true, pseudonym: true } },
          recipient: { select: { id: true, pseudonym: true } }
        }
      },
      summaries: true,
      sessions: {
        select: {
          id: true, type: true, createdAt: true, endedAt: true,
          participants: { select: { userId: true } }
        }
      }
    }
  });
  if (!topic) return { error: { status: 404, message: 'Topic not found' } };
  const { creator, recipient } = topic.connection;
  if (creator.id !== userId && recipient.id !== userId) {
    return { error: { status: 403, message: 'Not a member of this topic' } };
  }
  return { topic };
}

/** Shape a topic for the requesting user: partner summary only if approved. */
function topicView(topic, userId) {
  const { creator, recipient } = topic.connection;
  const partner = creator.id === userId ? recipient : creator;
  const mine = topic.summaries.find(s => s.userId === userId) || null;
  const theirsRaw = topic.summaries.find(s => s.userId === partner.id) || null;
  const theirs = theirsRaw
    ? {
        approved: !!theirsRaw.approvedAt,
        approvedAt: theirsRaw.approvedAt,
        updatedAt: theirsRaw.updatedAt,
        // Content is only visible to the partner once approved
        content: theirsRaw.approvedAt ? theirsRaw.content : null
      }
    : null;

  const myPrepSession = topic.sessions.find(
    s => s.type === 'individual' && s.participants.some(p => p.userId === userId)
  );
  const jointSession = topic.sessions.find(s => s.type === 'joint' && !s.endedAt);

  return {
    id: topic.id,
    title: topic.title,
    status: topic.status,
    createdAt: topic.createdAt,
    partner: { id: partner.id, pseudonym: partner.pseudonym },
    mySummary: mine,
    partnerSummary: theirs,
    myPrepSessionId: myPrepSession?.id || null,
    jointSessionId: jointSession?.id || null,
    bothApproved:
      topic.summaries.filter(s => s.approvedAt).length === 2
  };
}

/**
 * @route POST /api/topics
 * @desc Create a topic on an active connection
 */
router.post('/', async (req, res) => {
  try {
    const { connectionId, title } = req.body;
    const userId = req.user.id;

    if (!title?.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        status: 'active',
        OR: [{ creatorId: userId }, { recipientId: userId }]
      }
    });
    if (!connection) {
      return res.status(404).json({ message: 'Active connection not found' });
    }

    const topic = await prisma.topic.create({
      data: { title: title.trim(), connectionId, createdById: userId }
    });
    const { topic: full } = await loadTopicForUser(topic.id, userId);
    res.status(201).json(topicView(full, userId));
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/topics
 * @desc List topics on all of the user's connections
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const topics = await prisma.topic.findMany({
      where: {
        connection: {
          OR: [{ creatorId: userId }, { recipientId: userId }]
        }
      },
      include: {
        connection: {
          include: {
            creator: { select: { id: true, pseudonym: true } },
            recipient: { select: { id: true, pseudonym: true } }
          }
        },
        summaries: true,
        sessions: {
          select: {
            id: true, type: true, createdAt: true, endedAt: true,
            participants: { select: { userId: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(topics.map(t => topicView(t, userId)));
  } catch (error) {
    console.error('Error listing topics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/topics/:id
 */
router.get('/:id', async (req, res) => {
  const { topic, error } = await loadTopicForUser(req.params.id, req.user.id);
  if (error) return res.status(error.status).json({ message: error.message });
  res.json(topicView(topic, req.user.id));
});

/**
 * @route POST /api/topics/:id/prep
 * @desc Get or create my private prep session for this topic
 */
router.post('/:id/prep', async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic, error } = await loadTopicForUser(req.params.id, userId);
    if (error) return res.status(error.status).json({ message: error.message });

    let session = await prisma.session.findFirst({
      where: {
        topicId: topic.id,
        type: 'individual',
        endedAt: null,
        participants: { some: { userId } }
      }
    });

    if (!session) {
      session = await prisma.session.create({
        data: { type: 'individual', createdById: userId, topicId: topic.id }
      });
      await prisma.sessionParticipant.create({
        data: { sessionId: session.id, userId }
      });
    }

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating prep session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route PUT /api/topics/:id/summary
 * @desc Save my shared-summary draft. Editing clears approval (must re-approve).
 */
router.put('/:id/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ message: 'Summary content is required' });
    }
    const { topic, error } = await loadTopicForUser(req.params.id, userId);
    if (error) return res.status(error.status).json({ message: error.message });

    const summary = await prisma.sharedSummary.upsert({
      where: { topicId_userId: { topicId: topic.id, userId } },
      create: { topicId: topic.id, userId, content: content.trim() },
      update: { content: content.trim(), approvedAt: null }
    });

    // Any edit means the topic is no longer fully approved
    await prisma.topic.update({
      where: { id: topic.id },
      data: { status: 'prep' }
    });

    res.json(summary);
  } catch (error) {
    console.error('Error saving summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route POST /api/topics/:id/summary/approve
 * @desc Approve my summary for sharing. When both are approved, joint unlocks.
 */
router.post('/:id/summary/approve', async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic, error } = await loadTopicForUser(req.params.id, userId);
    if (error) return res.status(error.status).json({ message: error.message });

    const mine = topic.summaries.find(s => s.userId === userId);
    if (!mine) {
      return res.status(400).json({ message: 'Write your summary before approving it' });
    }

    await prisma.sharedSummary.update({
      where: { id: mine.id },
      data: { approvedAt: new Date() }
    });

    const summaries = await prisma.sharedSummary.findMany({ where: { topicId: topic.id } });
    const bothApproved = summaries.filter(s => s.approvedAt).length === 2;
    const updated = await prisma.topic.update({
      where: { id: topic.id },
      data: { status: bothApproved ? 'joint_ready' : 'prep' }
    });

    res.json({ status: updated.status, bothApproved });
  } catch (error) {
    console.error('Error approving summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route POST /api/topics/:id/joint
 * @desc Create (or return) the joint session — gated on both approvals
 */
router.post('/:id/joint', async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic, error } = await loadTopicForUser(req.params.id, userId);
    if (error) return res.status(error.status).json({ message: error.message });

    const existing = topic.sessions.find(s => s.type === 'joint' && !s.endedAt);
    if (existing) return res.json({ sessionId: existing.id });

    const approved = topic.summaries.filter(s => s.approvedAt);
    if (approved.length < 2) {
      return res.status(400).json({
        message: 'Both partners must approve their shared summaries before a joint session can begin'
      });
    }

    const { creator, recipient } = topic.connection;
    const session = await prisma.session.create({
      data: { type: 'joint', createdById: userId, topicId: topic.id }
    });
    await prisma.sessionParticipant.createMany({
      data: [
        { sessionId: session.id, userId: creator.id },
        { sessionId: session.id, userId: recipient.id }
      ]
    });

    res.status(201).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating joint session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
