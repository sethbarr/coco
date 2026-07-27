/**
 * Simplified Claude API service with reliable operation
 */
const { Anthropic } = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Anthropic client
let anthropic;

try {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  console.log('Anthropic client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Anthropic client:', error.message);
}

const CLAUDE_MODEL = 'claude-sonnet-5';

/**
 * Extract the assistant's text from a response. With adaptive thinking the
 * first content block can be a thinking block, so find the text block.
 */
function extractText(response) {
  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock ? textBlock.text : null;
}

// Base system prompt
const BASE_SYSTEM_PROMPT = `You are Coco, a supportive AI counselor who helps individuals and couples improve their relationships. You are NOT a therapist or healthcare provider. Your role is similar to a thoughtful, unbiased friend who helps people communicate better.

When helping users, you should:
- Listen actively and validate feelings
- Ask clarifying questions to understand the situation
- Reflect back what you're hearing to ensure understanding
- Suggest communication techniques when appropriate
- Remain neutral and avoid taking sides in conflicts
- Recommend professional therapy when issues seem beyond your scope

Your conversations should focus on:
- Improving communication patterns
- Identifying relationship patterns
- Building empathy between partners
- Finding constructive ways to resolve conflicts
- Celebrating relationship strengths

IMPORTANT: Keep your responses conversational, warm, and thoughtful. Vary your responses and don't be repetitive.`;

/**
 * Generate a fallback response when the API call fails
 * @returns {string} Fallback response
 */
function generateFallbackResponse() {
  const fallbackResponses = [
    "I'm here to support you. Could you tell me more about what's on your mind regarding your relationship?",
    "I'd like to understand your relationship situation better. What specific aspects would you like to discuss today?",
    "Relationships can be complex. Would you like to talk about a specific challenge you're facing?",
    "I'm here to help with your relationship questions. What's been on your mind lately?",
    "I'm listening and ready to support you. What relationship topics are most important to you right now?"
  ];
  
  const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
  return fallbackResponses[randomIndex];
}

/**
 * Handles a message sent by a user to Claude
 * @param {string} message - The user's message
 * @param {Array} history - Array of previous messages in the conversation (optional)
 * @returns {Promise<string>} - Claude's response
 */
async function handleUserMessage(message, history = []) {
  // First message? Provide a welcome message
  if (history.length === 0) {
    const welcomeResponses = [
      "Welcome to Coco! I'm here to help with relationship questions and communication challenges. What brings you here today?",
      "Hi there! I'm Coco, your relationship support companion. I'm here to listen and help however I can. What would you like to talk about?",
      "Thank you for reaching out. I'm Coco, and I'm here to support you with relationship matters. How can I assist you today?",
      "Hello! I'm Coco, and I'm glad you're here. I'm ready to listen and help with your relationship questions. What's on your mind?",
      "Welcome! I'm Coco, your supportive counseling companion. I'm here to help with relationship communication and understanding. What would you like to discuss?"
    ];
    
    const randomIndex = Math.floor(Math.random() * welcomeResponses.length);
    return welcomeResponses[randomIndex];
  }

  try {
    // Ensure Anthropic client is initialized
    if (!anthropic) {
      console.error('Anthropic client not initialized');
      return generateFallbackResponse();
    }

    console.log('Preparing to call Claude API with message:', message);
    
    // For simplicify, only include the last few messages in history
    // Format them as Claude expects
    const processedMessages = [];
    
    // Add up to 10 recent messages from history
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      processedMessages.push({
        role: msg.isAi ? 'assistant' : 'user',
        content: msg.content || msg.encryptedContent
      });
    }
    
    // Add the current message
    processedMessages.push({
      role: 'user',
      content: message
    });
    
    console.log(`Calling Claude API with ${processedMessages.length} messages in context`);

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      system: BASE_SYSTEM_PROMPT,
      messages: processedMessages,
      max_tokens: 1000
    });

    const aiResponse = extractText(response);
    if (!aiResponse) {
      console.error('No text block in Claude response');
      return generateFallbackResponse();
    }

    console.log('Claude API response received');
    
    // Return the response text
    return aiResponse;
    
  } catch (error) {
    console.error('Error calling Claude API:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    // Return a fallback response
    return generateFallbackResponse();
  }
}

/**
 * Guided prep session — private, structured work on one named topic.
 * @param {string} message - The user's message
 * @param {Array} history - Message history
 * @param {string} topicTitle - The topic being prepared
 * @returns {Promise<string>}
 */
async function handlePrepSession(message, history = [], topicTitle = '') {
  if (!anthropic) {
    console.error('Anthropic client not initialized');
    return generateFallbackResponse();
  }

  const prepSystemPrompt = `${BASE_SYSTEM_PROMPT}

GUIDANCE FOR THIS PRIVATE PREP SESSION:
This is a private, individual preparation session on the topic: "${topicTitle}".
Nothing said here is shared with the user's partner. Your job is to guide the user
through organizing their thoughts before a joint conversation. Work through these
phases one at a time — don't rush ahead, and don't ask about more than one phase at once:

1. DESCRIBE — What happens, concretely? Help them separate observations ("you said X")
   from interpretations ("you don't care").
2. FEELINGS — What do they feel when it happens? Help them name the emotions
   underneath the surface ones (anger often covers hurt or fear).
3. NEEDS — What do they actually need? (Security, respect, partnership, autonomy...)
4. GOALS — What would a good outcome look like for the relationship, not just for them?
5. SUMMARY — When the phases feel complete, offer a short draft "shared summary"
   (3-5 sentences, first person, non-blaming) that they could share with their
   partner. Tell them they can edit it and must approve it on the topic page before
   anything is shared. Be explicit that only the approved summary is ever shared —
   never this conversation.

If this is the start of the session, briefly explain the process and begin with
phase 1. Keep each response focused and reasonably short.`;

  try {
    const recentHistory = history.slice(-20);
    const processedMessages = recentHistory.map(msg => ({
      role: msg.isAi ? 'assistant' : 'user',
      content: msg.content || msg.encryptedContent
    }));
    processedMessages.push({ role: 'user', content: message });

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      system: prepSystemPrompt,
      messages: processedMessages,
      max_tokens: 1000
    });

    const aiResponse = extractText(response);
    if (!aiResponse) {
      console.error('No text block in Claude prep response');
      return generateFallbackResponse();
    }
    return aiResponse;
  } catch (error) {
    console.error('Error calling Claude API for prep session:', error.message);
    return generateFallbackResponse();
  }
}

/**
 * Joint session handler — Coco facilitates a conversation between partners.
 * @param {string} message - The user's message
 * @param {string} senderName - Pseudonym of the sender
 * @param {Array<string>} participantNames - Pseudonyms of all participants
 * @param {Array} history - Message history (with sender info)
 * @param {Object|null} briefing - Optional topic briefing: { topicTitle, summaries: [{name, content}] }
 * @returns {Promise<string>} - Claude's response
 */
async function handleJointSession(message, senderName, participantNames = [], history = [], briefing = null) {
  if (!anthropic) {
    console.error('Anthropic client not initialized');
    return generateFallbackResponse();
  }

  const names = participantNames.join(' and ');

  let briefingBlock = '';
  if (briefing?.summaries?.length) {
    const summaryText = briefing.summaries
      .map(s => `--- ${s.name}'s approved shared summary ---\n${s.content}`)
      .join('\n\n');
    briefingBlock = `

TOPIC AND BRIEFING:
This joint session is about: "${briefing.topicTitle}".
Each partner privately prepared for this conversation and explicitly approved
the summary below for sharing. You may draw on these summaries openly — both
partners know the other has seen them. Do NOT reference anything else from
either person's private prep conversations; only the approved summaries.

${summaryText}

HOW TO START AND FACILITATE:
- If this is the first message, open warmly: acknowledge the preparation both
  have done, briefly reflect the common ground and shared goals you see in the
  two summaries, then propose a simple structure (e.g. each partner shares their
  view for a few turns while the other listens, then reflect back).
- Guide them through the conversation step by step. Offer one concrete
  instruction or exercise at a time.
- Aim toward one or two small, specific agreements they both endorse by the end.`;
  }

  const jointSystemPrompt = `${BASE_SYSTEM_PROMPT}

GUIDANCE FOR THIS JOINT SESSION:
- You are facilitating a live conversation between ${names}. Messages from participants are prefixed with their name in brackets, e.g. [name]: message.
- Ensure both parties have equal opportunity to express themselves; if one has been quiet, gently invite them in.
- Reflect back and reframe charged statements neutrally; highlight miscommunications when you notice them.
- Look for common ground and shared goals; suggest brief communication exercises when helpful.
- Remain completely neutral. Never take sides.
- Do not reference anything from either person's individual sessions beyond an approved shared summary provided below (if any).${briefingBlock}`;

  try {
    const recentHistory = history.slice(-10);
    const processedMessages = recentHistory.map(msg => ({
      role: msg.isAi ? 'assistant' : 'user',
      content: msg.isAi
        ? (msg.content || msg.encryptedContent)
        : `[${msg.sender?.pseudonym || 'participant'}]: ${msg.content || msg.encryptedContent}`
    }));

    processedMessages.push({
      role: 'user',
      content: `[${senderName}]: ${message}`
    });

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      system: jointSystemPrompt,
      messages: processedMessages,
      max_tokens: 1000
    });

    const aiResponse = extractText(response);
    if (!aiResponse) {
      console.error('No text block in Claude joint response');
      return generateFallbackResponse();
    }
    return aiResponse;
  } catch (error) {
    console.error('Error calling Claude API for joint session:', error.message);
    return generateFallbackResponse();
  }
}

/**
 * Private reflection session — how are the agreements going, in private.
 * @param {string} message
 * @param {Array} history
 * @param {string} topicTitle
 * @param {Array<{text: string, owner: string|null, status: string}>} agreements
 * @returns {Promise<string>}
 */
async function handleReflection(message, history = [], topicTitle = '', agreements = []) {
  if (!anthropic) return generateFallbackResponse();

  const agreementList = agreements
    .map(a => `- ${a.owner ? `[${a.owner}'s commitment] ` : '[shared] '}${a.text} (status: ${a.status})`)
    .join('\n');

  const reflectionPrompt = `${BASE_SYSTEM_PROMPT}

GUIDANCE FOR THIS PRIVATE REFLECTION SESSION:
This is a private check-in with one partner about the topic "${topicTitle}".
Nothing said here is shared with their partner. The couple's current agreements:

${agreementList || '(no agreements yet)'}

Your job:
- Ask how things have actually gone since the plan was made — their own follow-through
  first, honestly and without judgment. It's safe here to admit what slipped.
- Explore what got in the way (logistics? feelings? the agreement itself being wrong?).
- Never help them build a case against their partner. Redirect blame toward what they
  can influence and what they'd want to say constructively.
- Toward the end, help them decide what they want to bring to the next joint check-in:
  one thing to acknowledge, one thing to ask for, phrased non-blamingly.
- Keep responses short and conversational. One question at a time.`;

  try {
    const processedMessages = history.slice(-20).map(msg => ({
      role: msg.isAi ? 'assistant' : 'user',
      content: msg.content || msg.encryptedContent
    }));
    processedMessages.push({ role: 'user', content: message });

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      system: reflectionPrompt,
      messages: processedMessages,
      max_tokens: 800
    });
    return extractText(response) || generateFallbackResponse();
  } catch (error) {
    console.error('Error in reflection session:', error.message);
    return generateFallbackResponse();
  }
}

/**
 * Joint check-in session — review the active agreements together.
 * @param {string} message
 * @param {string} senderName
 * @param {Array<string>} participantNames
 * @param {Array} history
 * @param {Object} briefing - { topicTitle, agreements: [{id, text, owner, status}], lastRecapSummary }
 * @returns {Promise<string>}
 */
async function handleCheckinSession(message, senderName, participantNames = [], history = [], briefing = {}) {
  if (!anthropic) return generateFallbackResponse();

  const names = participantNames.join(' and ');
  const agreementList = (briefing.agreements || [])
    .map((a, i) => `${i + 1}. ${a.owner ? `[${a.owner}'s commitment] ` : '[shared] '}${a.text} (current status: ${a.status})`)
    .join('\n');

  const checkinPrompt = `${BASE_SYSTEM_PROMPT}

GUIDANCE FOR THIS CHECK-IN SESSION:
You are facilitating a scheduled check-in between ${names} on the topic "${briefing.topicTitle}".
Messages from participants are prefixed with their name in brackets.

Their current agreements:
${agreementList || '(none)'}

${briefing.lastRecapSummary ? `From the last session: ${briefing.lastRecapSummary}` : ''}

HOW TO RUN THE CHECK-IN:
- If this is the first message, welcome them back warmly and explain the shape:
  you'll go through the agreements one at a time — what worked, what was hard —
  hearing briefly from each of them, then decide together to keep, adjust, or
  retire each one.
- Take ONE agreement at a time. Ask each partner in turn how it actually went.
  Celebrate what was kept (genuinely, specifically). Normalize what slipped —
  a struggling agreement usually means the agreement needs adjusting, not that
  someone failed.
- If they disagree about how it went, reflect both views neutrally.
- After covering the agreements, ask if anything new came up that needs an agreement.
- Close by suggesting they wrap up the session so the updated plan gets recorded.
- Keep each response short. One agreement, one question at a time.`;

  try {
    const processedMessages = history.slice(-30).map(msg => ({
      role: msg.isAi ? 'assistant' : 'user',
      content: msg.isAi
        ? (msg.content || msg.encryptedContent)
        : `[${msg.sender?.pseudonym || 'participant'}]: ${msg.content || msg.encryptedContent}`
    }));
    processedMessages.push({ role: 'user', content: `[${senderName}]: ${message}` });

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      system: checkinPrompt,
      messages: processedMessages,
      max_tokens: 1000
    });
    return extractText(response) || generateFallbackResponse();
  } catch (error) {
    console.error('Error in check-in session:', error.message);
    return generateFallbackResponse();
  }
}

/**
 * Generate a structured recap of a CHECK-IN session: per-agreement status
 * verdicts plus any new agreements.
 * @returns {Promise<{summary, statusUpdates: [{index, status}], newAgreements: string[], commitments, suggestedCheckInDays}|null>}
 */
async function generateCheckinRecap(topicTitle, participantNames, history = [], agreements = []) {
  if (!anthropic) return null;

  const transcript = history.slice(-60).map(msg => msg.isAi
    ? `Coco: ${msg.content || msg.encryptedContent}`
    : `${msg.sender?.pseudonym || 'participant'}: ${msg.content || msg.encryptedContent}`
  ).join('\n');

  const agreementList = agreements
    .map((a, i) => `${i + 1}. ${a.owner ? `[${a.owner}'s commitment] ` : '[shared] '}${a.text} (status: ${a.status})`)
    .join('\n');

  const prompt = `You are Coco, wrapping up a check-in session between ${participantNames.join(' and ')} on the topic "${topicTitle}".

THE AGREEMENTS THEY REVIEWED (numbered):
${agreementList}

SESSION TRANSCRIPT:
${transcript}

Produce a wrap-up as JSON with exactly this shape:
{
  "summary": "3-5 sentences: how the check-in went, what's working, what they adjusted.",
  "statusUpdates": [{"index": <agreement number from the list above>, "status": "kept" | "struggling" | "retired" | "active"}],
  "newAgreements": ["any NEW shared agreements reached this session, 'We will...' phrasing"],
  "commitments": [{"name": "<participant pseudonym>", "text": "new individual commitment, 'I will...'"}],
  "suggestedCheckInDays": <7, 14, or 30>
}

Status meanings: "kept" = consistently done and worth celebrating; "active" = keep going as is;
"struggling" = not landing, they adjusted or want to retry; "retired" = no longer needed
(either it worked and became habit, or they replaced it). Only report what the conversation
supports. Respond with ONLY the JSON object.`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200
    });
    let text = extractText(response);
    if (!text) return null;
    text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(text);
    if (typeof parsed.summary !== 'string') return null;
    return {
      summary: parsed.summary,
      statusUpdates: Array.isArray(parsed.statusUpdates)
        ? parsed.statusUpdates.filter(u => Number.isInteger(u?.index) && typeof u?.status === 'string')
        : [],
      newAgreements: Array.isArray(parsed.newAgreements) ? parsed.newAgreements.filter(a => typeof a === 'string') : [],
      commitments: Array.isArray(parsed.commitments)
        ? parsed.commitments.filter(c => c && typeof c.name === 'string' && typeof c.text === 'string')
        : [],
      suggestedCheckInDays: Number.isInteger(parsed.suggestedCheckInDays) ? parsed.suggestedCheckInDays : 14
    };
  } catch (error) {
    console.error('Error generating check-in recap:', error.message);
    return null;
  }
}

/**
 * Generate a structured recap of a joint session.
 * @param {string} topicTitle
 * @param {Array<string>} participantNames
 * @param {Array} history - full session message history (with sender info)
 * @param {Array} summaries - [{name, content}] approved shared summaries
 * @returns {Promise<{summary: string, agreements: string[], commitments: Array<{name: string, text: string}>, suggestedCheckInDays: number}|null>}
 */
async function generateSessionRecap(topicTitle, participantNames, history = [], summaries = []) {
  if (!anthropic) return null;

  const transcript = history
    .slice(-60)
    .map(msg => msg.isAi
      ? `Coco: ${msg.content || msg.encryptedContent}`
      : `${msg.sender?.pseudonym || 'participant'}: ${msg.content || msg.encryptedContent}`)
    .join('\n');

  const summaryText = summaries
    .map(s => `${s.name}'s shared summary: ${s.content}`)
    .join('\n');

  const recapPrompt = `You are Coco, wrapping up a joint counseling session between ${participantNames.join(' and ')} on the topic "${topicTitle}".

${summaryText}

SESSION TRANSCRIPT:
${transcript}

Produce a wrap-up document as JSON with exactly this shape:
{
  "summary": "3-6 sentences: what was worked on, what each person expressed, and the common ground reached. Warm, neutral, first-person-plural where natural.",
  "agreements": ["1-3 shared agreements, each concrete and checkable (who/what/when), phrased as 'We will...'"],
  "commitments": [{"name": "<participant pseudonym>", "text": "one specific thing this person committed to, phrased as 'I will...'"}],
  "suggestedCheckInDays": <7, 14, or 30 — how soon they should review how it's going>
}

Only include agreements and commitments that were actually discussed or clearly follow from the conversation. If the session didn't reach agreements, return an empty agreements array and gentle commitments about continuing the conversation. Respond with ONLY the JSON object — no markdown fences, no commentary.`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      messages: [{ role: 'user', content: recapPrompt }],
      max_tokens: 1200
    });
    let text = extractText(response);
    if (!text) return null;
    // Tolerate accidental code fences
    text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(text);
    if (typeof parsed.summary !== 'string') return null;
    return {
      summary: parsed.summary,
      agreements: Array.isArray(parsed.agreements) ? parsed.agreements.filter(a => typeof a === 'string') : [],
      commitments: Array.isArray(parsed.commitments)
        ? parsed.commitments.filter(c => c && typeof c.name === 'string' && typeof c.text === 'string')
        : [],
      suggestedCheckInDays: Number.isInteger(parsed.suggestedCheckInDays) ? parsed.suggestedCheckInDays : 7
    };
  } catch (error) {
    console.error('Error generating session recap:', error.message);
    return null;
  }
}

module.exports = {
  handleUserMessage,
  handlePrepSession,
  handleJointSession,
  handleReflection,
  handleCheckinSession,
  generateSessionRecap,
  generateCheckinRecap
};