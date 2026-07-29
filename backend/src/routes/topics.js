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
const { notify } = require('../services/notify');

router.use(auth);

/**
 * Safety-screen gates. Each partner privately screens once per connection
 * before joint work (joint sessions are contraindicated in coercive
 * relationships). Gates check COMPLETION only, never outcome — outcome is
 * private to the person who answered.
 */
async function safetyScreenStatus(connectionId, userId) {
  const screens = await prisma.safetyScreen.findMany({ where: { connectionId } });
  return {
    mineDone: screens.some(s => s.userId === userId),
    partnerDone: screens.some(s => s.userId !== userId)
  };
}

const SCREEN_REQUIRED = {
  code: 'SAFETY_SCREEN_REQUIRED',
  message: 'Before working on topics together, please take a minute for a short private safety check-in'
};
const PARTNER_SCREEN_PENDING = {
  code: 'PARTNER_SCREEN_PENDING',
  message: "Your partner hasn't finished their private safety check-in yet — joint sessions unlock once they do"
};

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
          id: true, type: true, kind: true, createdAt: true, endedAt: true,
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
    s => s.type === 'individual' && s.kind === 'standard' && s.participants.some(p => p.userId === userId)
  );
  const myReflectionSession = topic.sessions.find(
    s => s.type === 'individual' && s.kind === 'reflection' && !s.endedAt && s.participants.some(p => p.userId === userId)
  );
  const jointSession = topic.sessions.find(s => s.type === 'joint' && s.kind === 'standard' && !s.endedAt);
  const checkinSession = topic.sessions.find(s => s.type === 'joint' && s.kind === 'checkin' && !s.endedAt);

  return {
    id: topic.id,
    title: topic.title,
    connectionId: topic.connectionId,
    status: topic.status,
    createdAt: topic.createdAt,
    partner: { id: partner.id, pseudonym: partner.pseudonym },
    mySummary: mine,
    partnerSummary: theirs,
    myPrepSessionId: myPrepSession?.id || null,
    myReflectionSessionId: myReflectionSession?.id || null,
    jointSessionId: jointSession?.id || null,
    checkinSessionId: checkinSession?.id || null,
    nextCheckInAt: topic.nextCheckInAt,
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

    const { mineDone } = await safetyScreenStatus(connectionId, userId);
    if (!mineDone) {
      return res.status(403).json(SCREEN_REQUIRED);
    }

    const topic = await prisma.topic.create({
      data: { title: title.trim(), connectionId, createdById: userId }
    });
    const { topic: full } = await loadTopicForUser(topic.id, userId);
    const view = topicView(full, userId);
    const me = connection.creatorId === userId
      ? full.connection.creator : full.connection.recipient;
    await notify(
      view.partner.id,
      'topic_created',
      `${me.pseudonym} started a topic with you: "${view.title}"`,
      `/topics/${topic.id}`
    );
    res.status(201).json(view);
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
            id: true, type: true, kind: true, createdAt: true, endedAt: true,
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
        kind: 'standard',
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

    const { creator, recipient } = topic.connection;
    const partner = creator.id === userId ? recipient : creator;
    const me = creator.id === userId ? creator : recipient;
    await notify(
      partner.id,
      bothApproved ? 'joint_ready' : 'summary_approved',
      bothApproved
        ? `You're both ready — the joint session for "${topic.title}" is unlocked`
        : `${me.pseudonym} approved their shared summary for "${topic.title}"`,
      `/topics/${topic.id}`
    );

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

    const existing = topic.sessions.find(s => s.type === 'joint' && s.kind === 'standard' && !s.endedAt);
    if (existing) return res.json({ sessionId: existing.id });

    const approved = topic.summaries.filter(s => s.approvedAt);
    if (approved.length < 2) {
      return res.status(400).json({
        message: 'Both partners must approve their shared summaries before a joint session can begin'
      });
    }

    const gate = await safetyScreenStatus(topic.connectionId, userId);
    if (!gate.mineDone) return res.status(403).json(SCREEN_REQUIRED);
    if (!gate.partnerDone) return res.status(403).json(PARTNER_SCREEN_PENDING);

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

/**
 * @route POST /api/topics/:id/checkin
 * @desc Start (or return) a check-in session — reviews the active agreements.
 *       Requires an active plan (at least one active agreement).
 */
router.post('/:id/checkin', async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic, error } = await loadTopicForUser(req.params.id, userId);
    if (error) return res.status(error.status).json({ message: error.message });

    const existing = await prisma.session.findFirst({
      where: { topicId: topic.id, type: 'joint', kind: 'checkin', endedAt: null }
    });
    if (existing) return res.json({ sessionId: existing.id });

    const activeCount = await prisma.agreement.count({
      where: { topicId: topic.id, status: { in: ['active', 'struggling', 'kept'] } }
    });
    if (activeCount === 0) {
      return res.status(400).json({
        message: 'No active agreements to review yet — finish a joint session and endorse its recap first'
      });
    }

    const gate = await safetyScreenStatus(topic.connectionId, userId);
    if (!gate.mineDone) return res.status(403).json(SCREEN_REQUIRED);
    if (!gate.partnerDone) return res.status(403).json(PARTNER_SCREEN_PENDING);

    const { creator, recipient } = topic.connection;
    const session = await prisma.session.create({
      data: { type: 'joint', kind: 'checkin', createdById: userId, topicId: topic.id }
    });
    await prisma.sessionParticipant.createMany({
      data: [
        { sessionId: session.id, userId: creator.id },
        { sessionId: session.id, userId: recipient.id }
      ]
    });

    const partner = creator.id === userId ? recipient : creator;
    const me = creator.id === userId ? creator : recipient;
    await notify(
      partner.id,
      'checkin_started',
      `${me.pseudonym} started a check-in for "${topic.title}" — join when you're ready`,
      `/sessions/${session.id}`
    );

    res.status(201).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating check-in session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route POST /api/topics/:id/reflect
 * @desc Get or create my private reflection session for this topic
 */
router.post('/:id/reflect', async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic, error } = await loadTopicForUser(req.params.id, userId);
    if (error) return res.status(error.status).json({ message: error.message });

    let session = await prisma.session.findFirst({
      where: {
        topicId: topic.id,
        type: 'individual',
        kind: 'reflection',
        endedAt: null,
        participants: { some: { userId } }
      }
    });

    if (!session) {
      session = await prisma.session.create({
        data: { type: 'individual', kind: 'reflection', createdById: userId, topicId: topic.id }
      });
      await prisma.sessionParticipant.create({
        data: { sessionId: session.id, userId }
      });
    }

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating reflection session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/** Load plan data (recaps + agreements) with endorsement state for a topic. */
async function loadPlan(topicId) {
  return prisma.sessionRecap.findMany({
    where: { topicId },
    orderBy: { createdAt: 'desc' },
    include: { agreements: { orderBy: { createdAt: 'asc' } } }
  });
}

/**
 * @route GET /api/topics/:id/plan
 * @desc The topic's living plan: recaps awaiting endorsement + agreements
 */
router.get('/:id/plan', async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic, error } = await loadTopicForUser(req.params.id, userId);
    if (error) return res.status(error.status).json({ message: error.message });

    const recaps = await loadPlan(topic.id);
    const { creator, recipient } = topic.connection;
    const names = { [creator.id]: creator.pseudonym, [recipient.id]: recipient.pseudonym };

    const allAgreements = await prisma.agreement.findMany({ where: { topicId: topic.id } });
    const agreementText = {};
    allAgreements.forEach(a => { agreementText[a.id] = a.text; });

    res.json({
      nextCheckInAt: topic.nextCheckInAt,
      recaps: recaps.map(r => {
        const endorsements = r.endorsements || {};
        return {
          id: r.id,
          summary: r.summary,
          createdAt: r.createdAt,
          suggestedCheckInDays: r.suggestedCheckInDays,
          endorsedByMe: !!endorsements[userId],
          endorsedByPartner: Object.keys(endorsements).some(id => id !== userId),
          fullyEndorsed: Object.keys(endorsements).length >= 2,
          statusUpdates: Array.isArray(r.statusUpdates)
            ? r.statusUpdates.map(u => ({
                status: u.status,
                text: agreementText[u.agreementId] || null
              }))
            : [],
          agreements: r.agreements.map(a => ({
            id: a.id,
            text: a.text,
            status: a.status,
            owner: a.ownerId ? names[a.ownerId] || null : null
          }))
        };
      })
    });
  } catch (error) {
    console.error('Error loading plan:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route POST /api/topics/:id/recaps/:recapId/endorse
 * @desc Endorse a session recap. When both partners endorse, agreements
 *       become active and the next check-in date is set.
 */
router.post('/:id/recaps/:recapId/endorse', async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic, error } = await loadTopicForUser(req.params.id, userId);
    if (error) return res.status(error.status).json({ message: error.message });

    const recap = await prisma.sessionRecap.findFirst({
      where: { id: req.params.recapId, topicId: topic.id }
    });
    if (!recap) return res.status(404).json({ message: 'Recap not found' });

    const endorsements = { ...(recap.endorsements || {}), [userId]: new Date().toISOString() };
    const fullyEndorsed = Object.keys(endorsements).length >= 2;

    await prisma.sessionRecap.update({
      where: { id: recap.id },
      data: { endorsements }
    });

    const { creator, recipient } = topic.connection;
    const partner = creator.id === userId ? recipient : creator;
    const me = creator.id === userId ? creator : recipient;

    if (fullyEndorsed) {
      // Apply agreement status updates from check-in recaps
      if (Array.isArray(recap.statusUpdates)) {
        for (const u of recap.statusUpdates) {
          if (u?.agreementId && ['kept', 'struggling', 'retired', 'active'].includes(u.status)) {
            await prisma.agreement.updateMany({
              where: { id: u.agreementId, topicId: topic.id },
              data: { status: u.status }
            });
          }
        }
      }
      await prisma.agreement.updateMany({
        where: { recapId: recap.id, status: 'proposed' },
        data: { status: 'active' }
      });
      const days = recap.suggestedCheckInDays || 7;
      await prisma.topic.update({
        where: { id: topic.id },
        data: { nextCheckInAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000) }
      });
      await notify(
        partner.id,
        'plan_active',
        `Your plan for "${topic.title}" is now active — both of you endorsed the recap`,
        `/topics/${topic.id}`
      );
    } else {
      await notify(
        partner.id,
        'recap_created',
        `${me.pseudonym} endorsed the session recap for "${topic.title}" — your endorsement is needed`,
        `/topics/${topic.id}`
      );
    }

    res.json({ fullyEndorsed });
  } catch (error) {
    console.error('Error endorsing recap:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route GET /api/topics/:id/plan.md
 * @desc Download the plan as a Markdown document (only endorsed content)
 */
router.get('/:id/plan.md', async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic, error } = await loadTopicForUser(req.params.id, userId);
    if (error) return res.status(error.status).json({ message: error.message });

    const recaps = (await loadPlan(topic.id))
      .filter(r => Object.keys(r.endorsements || {}).length >= 2);
    const { creator, recipient } = topic.connection;
    const names = { [creator.id]: creator.pseudonym, [recipient.id]: recipient.pseudonym };

    const active = recaps.flatMap(r => r.agreements).filter(a => a.status === 'active');
    const shared = active.filter(a => !a.ownerId);
    const personal = active.filter(a => a.ownerId);

    let md = `# Our Plan — ${topic.title}\n\n`;
    md += `*${creator.pseudonym} & ${recipient.pseudonym} · exported ${new Date().toLocaleDateString()}*\n\n`;
    if (topic.nextCheckInAt) {
      md += `**Next check-in:** ${new Date(topic.nextCheckInAt).toLocaleDateString()}\n\n`;
    }
    if (shared.length) {
      md += `## Our agreements\n\n${shared.map(a => `- ${a.text}`).join('\n')}\n\n`;
    }
    if (personal.length) {
      md += `## Individual commitments\n\n${personal.map(a => `- **${names[a.ownerId]}**: ${a.text}`).join('\n')}\n\n`;
    }
    if (recaps.length) {
      md += `## Session notes\n\n`;
      for (const r of recaps) {
        md += `### ${new Date(r.createdAt).toLocaleDateString()}\n\n${r.summary}\n\n`;
      }
    }
    md += `---\n*Prepared with Coco. Both partners endorsed everything in this document.*\n`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="our-plan-${topic.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md"`);
    res.send(md);
  } catch (error) {
    console.error('Error exporting plan:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
