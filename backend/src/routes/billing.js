/**
 * Billing routes — dormant unless BILLING_ENABLED=true and Stripe keys are set.
 *
 * Card data never touches this server: checkout and subscription management
 * happen on Stripe-hosted pages. Coco stores only Stripe IDs and a status.
 *
 * The webhook is mounted separately in index.js with express.raw() — Stripe
 * signature verification needs the raw body, so it must bypass express.json().
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');
const { billingEnabled, getStripe, syncSubscription } = require('../services/billing');

const APP_URL = process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';

async function loadActiveConnectionForUser(connectionId, userId) {
  return prisma.connection.findFirst({
    where: {
      id: connectionId,
      status: 'active',
      OR: [{ creatorId: userId }, { recipientId: userId }]
    }
  });
}

/**
 * @route GET /api/billing/status
 * @desc Billing flag + this connection's subscription state
 */
router.get('/status', auth, async (req, res) => {
  try {
    if (!billingEnabled()) return res.json({ billingEnabled: false, subscription: null });

    const { connectionId } = req.query;
    const connection = await loadActiveConnectionForUser(connectionId, req.user.id);
    if (!connection) return res.status(404).json({ message: 'Active connection not found' });

    const sub = await prisma.subscription.findUnique({ where: { connectionId } });
    res.json({
      billingEnabled: true,
      subscription: sub
        ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, isPayer: sub.payerUserId === req.user.id }
        : null
    });
  } catch (error) {
    console.error('Billing status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/billing/checkout
 * @desc Create a Stripe Checkout session for this connection
 */
router.post('/checkout', auth, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!billingEnabled() || !stripe) {
      return res.status(400).json({ message: 'Billing is not enabled' });
    }

    const { connectionId, interval } = req.body;
    const connection = await loadActiveConnectionForUser(connectionId, req.user.id);
    if (!connection) return res.status(404).json({ message: 'Active connection not found' });

    const existing = await prisma.subscription.findUnique({ where: { connectionId } });
    if (existing && ['active', 'trialing', 'past_due'].includes(existing.status)) {
      return res.status(400).json({ message: 'This connection already has a subscription' });
    }

    const price = interval === 'year'
      ? process.env.STRIPE_PRICE_ANNUAL
      : process.env.STRIPE_PRICE_MONTHLY;
    if (!price) return res.status(500).json({ message: 'Billing price not configured' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: `${APP_URL}/topics?billing=success`,
      cancel_url: `${APP_URL}/topics?billing=canceled`,
      metadata: { connectionId, userId: req.user.id },
      subscription_data: { metadata: { connectionId, userId: req.user.id } }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/billing/portal
 * @desc Stripe Customer Portal (cancel, change card, invoices) — payer only
 */
router.post('/portal', auth, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!billingEnabled() || !stripe) {
      return res.status(400).json({ message: 'Billing is not enabled' });
    }

    const { connectionId } = req.body;
    const sub = await prisma.subscription.findUnique({ where: { connectionId } });
    if (!sub) return res.status(404).json({ message: 'No subscription for this connection' });
    if (sub.payerUserId !== req.user.id) {
      return res.status(403).json({ message: 'Only the partner who pays can manage the subscription' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${APP_URL}/topics`
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Webhook handler — mounted in index.js with express.raw() BEFORE express.json().
 * Stripe is the source of truth; we never poll, we only react to events.
 */
async function webhookHandler(req, res) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return res.status(400).send('Billing not configured');

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send('Invalid signature');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { connectionId, userId } = session.metadata || {};
        if (connectionId && session.subscription) {
          const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(connectionId, userId, stripeSub);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object;
        const connectionId = stripeSub.metadata?.connectionId;
        if (connectionId) {
          await syncSubscription(connectionId, stripeSub.metadata?.userId, stripeSub);
        } else {
          // No metadata (e.g. created outside checkout) — match by Stripe ID
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: stripeSub.id },
            data: {
              status: stripeSub.status,
              currentPeriodEnd: stripeSub.current_period_end
                ? new Date(stripeSub.current_period_end * 1000)
                : null
            }
          });
        }
        break;
      }
      default:
        break; // Unhandled event types are fine — Stripe sends many
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handling error:', error);
    // Non-2xx makes Stripe retry, which is what we want on transient DB errors
    res.status(500).send('Webhook error');
  }
}

module.exports = { router, webhookHandler };
