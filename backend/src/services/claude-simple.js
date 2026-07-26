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
 * Joint session handler — Coco facilitates a conversation between partners.
 * @param {string} message - The user's message
 * @param {string} senderName - Pseudonym of the sender
 * @param {Array<string>} participantNames - Pseudonyms of all participants
 * @param {Array} history - Message history (with sender info)
 * @returns {Promise<string>} - Claude's response
 */
async function handleJointSession(message, senderName, participantNames = [], history = []) {
  if (!anthropic) {
    console.error('Anthropic client not initialized');
    return generateFallbackResponse();
  }

  const names = participantNames.join(' and ');
  const jointSystemPrompt = `${BASE_SYSTEM_PROMPT}

GUIDANCE FOR THIS JOINT SESSION:
- You are facilitating a live conversation between ${names}. Messages from participants are prefixed with their name in brackets, e.g. [name]: message.
- Ensure both parties have equal opportunity to express themselves; if one has been quiet, gently invite them in.
- Reflect back and reframe charged statements neutrally; highlight miscommunications when you notice them.
- Look for common ground and shared goals; suggest brief communication exercises when helpful.
- Remain completely neutral. Never take sides.
- Do not reference anything from either person's individual sessions.`;

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
  handleJointSession
};