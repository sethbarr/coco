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

module.exports = {
  handleUserMessage,
  handlePrepSession,
  handleJointSession
};