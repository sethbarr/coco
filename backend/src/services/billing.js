/**
 * Billing: per-connection Stripe subscriptions behind the BILLING_ENABLED flag.
 *
 * With BILLING_ENABLED unset/false (testing mode) nothing here runs: the
 * entitlement check passes unconditionally and no Stripe calls are made.
 * Flipping the flag gates only NEW second topics — existing topics, messages,
 * and check-ins are never gated, so nobody is locked out mid-conversation.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function billingEnabled() {
  return process.env.BILLING_ENABLED === 'true';
}

let stripe = null;
function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

// Stripe statuses that count as paid. past_due stays entitled: a failed card
// retry shouldn't yank features from a couple mid-topic — Stripe moves it to
// canceled/unpaid if retries exhaust.
const ENTITLED_STATUSES = ['active', 'trialing', 'past_due'];

/**
 * Can this connection open another topic?
 * Free tier: 1 active (non-closed) topic per connection.
 * @returns {Promise<{entitled: boolean, reason?: 'UPGRADE_REQUIRED'}>}
 */
async function canCreateTopic(connectionId) {
  if (!billingEnabled()) return { entitled: true };

  const activeTopics = await prisma.topic.count({
    where: { connectionId, status: { not: 'closed' } }
  });
  if (activeTopics === 0) return { entitled: true };

  const sub = await prisma.subscription.findUnique({ where: { connectionId } });
  if (sub && ENTITLED_STATUSES.includes(sub.status)) return { entitled: true };
  return { entitled: false, reason: 'UPGRADE_REQUIRED' };
}

/** Upsert the local subscription record from a Stripe subscription object. */
async function syncSubscription(connectionId, payerUserId, stripeSub) {
  const data = {
    status: stripeSub.status,
    currentPeriodEnd: stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000)
      : null
  };
  await prisma.subscription.upsert({
    where: { connectionId },
    create: {
      connectionId,
      payerUserId,
      stripeCustomerId: typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id,
      stripeSubscriptionId: stripeSub.id,
      ...data
    },
    update: data
  });
}

module.exports = { billingEnabled, getStripe, canCreateTopic, syncSubscription, ENTITLED_STATUSES };
