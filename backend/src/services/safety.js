/**
 * Programmatic crisis/abuse detection for incoming user messages.
 *
 * Two layers, so safety never depends on the counseling prompt behaving:
 *  1. A cheap regex screen runs on every message (no API cost).
 *  2. Screen hits go to a small, fast classifier model that returns a strict
 *     severity level, filtering out figures of speech ("this traffic is
 *     killing me") without missing real signals.
 *
 * If the classifier is unavailable, a screen hit degrades to 'concern' —
 * we would rather show resources unnecessarily than miss a crisis.
 */
const { Anthropic } = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');

dotenv.config();

let anthropic;
try {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
} catch (error) {
  console.error('Safety service: failed to initialize Anthropic client:', error.message);
}

const CLASSIFIER_MODEL = 'claude-haiku-4-5-20251001';

// Candidate categories with their screening patterns. Patterns are meant to be
// broad (high recall) — the classifier handles precision.
const SCREEN_PATTERNS = {
  self_harm: [
    /suicid/i,
    /kill(ing)?\s+myself/i,
    /end(ing)?\s+(my|it)\s+(life|all)/i,
    /self[\s-]?harm/i,
    /hurt(ing)?\s+myself/i,
    /cut(ting)?\s+myself/i,
    /overdose/i,
    /don'?t\s+want\s+to\s+(be\s+alive|live|wake\s+up)/i,
    /better\s+off\s+(dead|without\s+me)/i,
    /no\s+(reason|point)\s+(to|in)\s+(liv|go(ing)?\s+on)/i,
    /want\s+to\s+(die|disappear|not\s+exist)/i,
  ],
  harm_to_others: [
    /kill(ing)?\s+(him|her|them|you|someone)/i,
    /want\s+to\s+hurt\s+(him|her|them|someone)/i,
    /make\s+(him|her|them)\s+pay/i,
    /(shoot|stab|strangle)/i,
  ],
  abuse: [
    /(hits?|hitting|beats?|beating|punche[sd]|punching|choke[sd]?|choking|slaps?|slapped|slapping|shove[sd]?|shoving|grabs?|grabbed)\s+me/i,
    /(afraid|scared|terrified|frightened)\s+of\s+(him|her|them|my\s+(partner|husband|wife|boyfriend|girlfriend))/i,
    /threat(en(s|ed|ing)?)?\s+(me|to\s+(hurt|kill|leave\s+with|take))/i,
    /won'?t\s+let\s+me\s+(leave|see|talk|go|work|have)/i,
    /controls?\s+(my\s+money|everything|who\s+i|where\s+i|what\s+i)/i,
    /forc(es?|ed|ing)\s+me\s+to/i,
    /rape[sd]?/i,
    /sexual(ly)?\s+assault/i,
    /violen(t|ce)/i,
    /not\s+safe\s+(at\s+home|with\s+(him|her|them))/i,
    /(threw|throws?|throwing)\s+things\s+at/i,
  ],
};

/**
 * Regex pre-screen. Returns the list of candidate categories (possibly empty).
 * @param {string} text
 * @returns {string[]}
 */
function screenMessage(text) {
  if (!text || typeof text !== 'string') return [];
  const candidates = [];
  for (const [category, patterns] of Object.entries(SCREEN_PATTERNS)) {
    if (patterns.some(p => p.test(text))) candidates.push(category);
  }
  return candidates;
}

/**
 * Classify a screen-flagged message with a small model.
 * @param {string} text - the user's message
 * @param {string[]} candidates - categories the screen flagged
 * @returns {Promise<{level: 'none'|'concern'|'crisis', category: string}|null>}
 */
async function classifyMessage(text, candidates) {
  if (!anthropic) return null;

  const prompt = `You are a safety classifier for a relationship-support app. Classify the message below.

Levels:
- "crisis": active suicidal intent or plan, self-harm happening now, someone in immediate physical danger, or ongoing physical violence at home.
- "concern": ideation without stated plan, past or suspected abuse, fear of a partner, or distress where support resources would clearly help.
- "none": figure of speech, hypothetical discussion, quoting someone, media/news talk, or clearly not about real risk.

Categories: "self_harm", "harm_to_others", "abuse", "other".

A keyword screen flagged this message as possibly: ${candidates.join(', ')}.

Message:
"""
${text.slice(0, 2000)}
"""

Respond with ONLY a JSON object: {"level": "...", "category": "..."}`;

  try {
    const response = await anthropic.messages.create({
      model: CLASSIFIER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
    });
    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock) return null;
    const raw = textBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(raw);
    if (!['none', 'concern', 'crisis'].includes(parsed.level)) return null;
    if (!['self_harm', 'harm_to_others', 'abuse', 'other'].includes(parsed.category)) {
      parsed.category = candidates[0] || 'other';
    }
    return { level: parsed.level, category: parsed.category };
  } catch (error) {
    console.error('Safety classifier error:', error.message);
    return null;
  }
}

/**
 * Full assessment pipeline for one message.
 * @param {string} text
 * @returns {Promise<{level: 'concern'|'crisis', category: string}|null>} null when no risk detected
 */
async function assessMessage(text) {
  const candidates = screenMessage(text);
  if (candidates.length === 0) return null;

  const verdict = await classifyMessage(text, candidates);
  if (verdict === null) {
    // Classifier unavailable — degrade safe: show resources at concern level
    return { level: 'concern', category: candidates[0] };
  }
  if (verdict.level === 'none') return null;
  return verdict;
}

const DISCLAIMER = 'Coco is an AI companion, not a therapist, and not a crisis service. For anything urgent, please reach a human.';

const RESOURCES = {
  self_harm: [
    { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988 (US)', url: 'https://988lifeline.org' },
    { name: 'Crisis Text Line', contact: 'Text HOME to 741741', url: 'https://www.crisistextline.org' },
    { name: 'Find a Helpline (outside the US)', contact: null, url: 'https://findahelpline.com' },
  ],
  abuse: [
    { name: 'National Domestic Violence Hotline', contact: 'Call 1-800-799-7233 or text START to 88788', url: 'https://www.thehotline.org' },
    { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988 (US)', url: 'https://988lifeline.org' },
    { name: 'Find a Helpline (outside the US)', contact: null, url: 'https://findahelpline.com' },
  ],
  harm_to_others: [
    { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988 (US)', url: 'https://988lifeline.org' },
    { name: 'Emergency services', contact: 'If someone is in immediate danger, call 911', url: null },
  ],
  generic: [
    { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988 (US)', url: 'https://988lifeline.org' },
    { name: 'Find a Helpline (outside the US)', contact: null, url: 'https://findahelpline.com' },
    { name: 'Find a therapist', contact: null, url: 'https://www.psychologytoday.com/us/therapists' },
  ],
};

/**
 * Build the resource card shown alongside Coco's message.
 *
 * In JOINT sessions the card is visible to both partners, so abuse-specific
 * resources are replaced with the generic card — a DV hotline appearing on a
 * shared screen can endanger the person who disclosed.
 * @param {{level: string, category: string}} assessment
 * @param {string} sessionType - 'individual' | 'joint'
 */
function buildResourceCard(assessment, sessionType) {
  let category = assessment.category;
  if (category === 'abuse' && sessionType === 'joint') category = 'generic';
  const resources = RESOURCES[category] || RESOURCES.generic;
  return {
    level: assessment.level,
    category: assessment.category,
    title: assessment.level === 'crisis' ? 'Please reach out for real support' : 'Support is available',
    disclaimer: DISCLAIMER,
    resources,
  };
}

/**
 * Fixed response used when a crisis pauses the normal AI turn. Deliberately
 * not model-generated: in a crisis the wording should be reviewed, not sampled.
 * @param {string} category
 * @param {string} sessionType
 */
function crisisPauseMessage(category, sessionType) {
  const base = "I want to pause our session for a moment, because what you just shared matters more than anything else we're working on.\n\nI'm an AI, and I'm not able to give you the support you deserve right now — a trained human can. Please use one of the resources shown below; they're free, confidential, and available 24/7.\n\nWhen you're ready, I'm still here, and we can pick this back up whenever it feels right.";
  if (category === 'abuse' && sessionType !== 'joint') {
    return "I want to pause for a moment, because your safety comes before anything we're working on here.\n\nWhat you're describing sounds like it may not be safe, and that's not something an AI should be guiding you through alone. The people at the resources below are trained for exactly this — they're free, confidential, and available 24/7. If browsing safety is ever a concern, thehotline.org has a quick-exit button.\n\nI'm still here whenever you want to keep talking.";
  }
  return base;
}

/**
 * Pre-joint-work safety screening. Joint sessions are contraindicated in
 * coercive relationships (standard practice in couples counseling), so each
 * partner answers these privately once per connection before joint work.
 *
 * `riskWhen` is the answer that indicates risk. The outcome gates NOTHING
 * visible to the partner — flagged users get private resources and guidance,
 * and decide for themselves whether to continue.
 */
const SCREEN_QUESTIONS = [
  { id: 'fear', text: 'Are you ever afraid of your partner?', riskWhen: true },
  { id: 'physical', text: 'Has your partner ever hit, pushed, choked, or otherwise physically hurt you?', riskWhen: true },
  { id: 'control', text: 'Does your partner control where you go, who you see, or your access to money?', riskWhen: true },
  { id: 'safe_disagree', text: 'Do you feel safe disagreeing with your partner?', riskWhen: false },
];

/**
 * Score screening answers server-side.
 * @param {Object} answers - { [questionId]: boolean }
 * @returns {{outcome: 'clear'|'flagged'}|{error: string}}
 */
function scoreScreen(answers) {
  if (!answers || typeof answers !== 'object') return { error: 'Answers are required' };
  for (const q of SCREEN_QUESTIONS) {
    if (typeof answers[q.id] !== 'boolean') {
      return { error: 'Please answer every question' };
    }
  }
  const flagged = SCREEN_QUESTIONS.some(q => answers[q.id] === q.riskWhen);
  return { outcome: flagged ? 'flagged' : 'clear' };
}

module.exports = {
  screenMessage,
  classifyMessage,
  assessMessage,
  buildResourceCard,
  crisisPauseMessage,
  SCREEN_QUESTIONS,
  scoreScreen,
  RESOURCES,
};
