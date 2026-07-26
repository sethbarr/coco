/**
 * Enhanced Claude API service with protections against prompt injection
 */
const { Anthropic } = require('@anthropic-ai/sdk');
const { logger } = require('../middleware/errorHandler');
const dotenv = require('dotenv');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

dotenv.config();

// Create a window with jsdom for DOMPurify
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Base system prompt with clear boundaries
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

IMPORTANT BOUNDARIES:
- Never diagnose mental health conditions
- Do not provide medical or legal advice
- Recommend professional help for serious issues (abuse, addiction, mental health crises)
- Maintain strict confidentiality between users

Remember that your purpose is to facilitate better understanding between people, not to replace professional counseling.`;

/**
 * Array of patterns that might indicate prompt injection attempts
 * @type {RegExp[]}
 */
const SUSPICIOUS_PATTERNS = [
  /ignore (previous|above|all) instructions/i,
  /disregard (previous|above|all) instructions/i,
  /forget (previous|above|all) instructions/i,
  /new instructions/i,
  /you are not coco/i,
  /you are an AI assistant/i,
  /system prompt/i,
  /\<\/?system\>/i,
  /\<\/?instructions\>/i,
  /\<\/?prompt\>/i,
  /\[system\]/i,
  /\[instructions\]/i,
  /\[prompt\]/i
];

/**
 * Sanitize user input to prevent prompt injection
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
function sanitizeUserInput(input) {
  if (!input) return '';
  
  // HTML sanitization
  let sanitized = purify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [] // No HTML attributes allowed
  });
  
  // Check for suspicious patterns
  const hasSuspiciousPattern = SUSPICIOUS_PATTERNS.some(pattern => 
    pattern.test(sanitized)
  );
  
  if (hasSuspiciousPattern) {
    logger.warn({
      event: 'prompt_injection_attempt',
      input: sanitized
    });
    
    // Replace suspicious patterns with benign text
    SUSPICIOUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[filtered content]');
    });
  }
  
  // Prevent impersonation of Claude or system
  sanitized = sanitized
    .replace(/\b(claude|anthropic|ai assistant|system|admin)\b:/gi, 'user:')
    .replace(/^I am (claude|anthropic|the ai|the assistant)/gi, 'I said');
  
  return sanitized;
}

/**
 * Process and structure the conversation history
 * @param {Array} history - Message history
 * @returns {Array} Processed message history
 */
function processConversationHistory(history) {
  if (!Array.isArray(history)) return [];
  
  // Limit history length to prevent context overflow
  const recentHistory = history.slice(-20);
  
  return recentHistory.map(msg => ({
    role: msg.isAi ? 'assistant' : 'user',
    content: msg.isAi 
      ? msg.content 
      : sanitizeUserInput(msg.content)
  }));
}

/**
 * Create the system prompt with appropriate context
 * @param {string} sessionType - Type of session ('individual' or 'joint')
 * @param {Array} participants - Session participants (for joint sessions)
 * @returns {string} Complete system prompt
 */
function createSystemPrompt(sessionType, participants = []) {
  let prompt = BASE_SYSTEM_PROMPT;
  
  if (sessionType === 'joint' && participants.length > 0) {
    // Add context for joint sessions
    const participantNames = participants
      .map(p => p.pseudonym)
      .join(' and ');
    
    prompt += `\n\nADDITIONAL GUIDANCE FOR JOINT SESSIONS:
- You are currently facilitating a conversation between ${participantNames}.
- Ensure both parties have equal opportunity to express themselves.
- Look for common ground and shared interests.
- Highlight when you notice miscommunications or misunderstandings.
- Suggest exercises that can help the participants practice better communication.
- Remain completely neutral and avoid appearing to take sides.`;
  }
  
  return prompt;
}

/**
 * Validate the AI response for appropriateness
 * @param {string} response - AI response to validate
 * @returns {boolean} True if the response is appropriate
 */
function validateResponse(response) {
  if (!response) return false;
  
  // Check for suspicious patterns that might indicate prompt injection success
  const suspiciousResponse = [
    /I am not Coco/i,
    /I am Claude/i,
    /I am an AI assistant created by Anthropic/i,
    /my instructions/i,
    /system prompt/i,
    /can't follow that request/i,
    /here is my/i,
    /my purpose is to/i
  ].some(pattern => pattern.test(response));
  
  if (suspiciousResponse) {
    logger.warn({
      event: 'suspicious_ai_response',
      response: response.substring(0, 200) // Log just the beginning
    });
    return false;
  }
  
  return true;
}

/**
 * Generate a fallback response when the AI response is invalid
 * @param {string} sessionType - Type of session ('individual' or 'joint')
 * @returns {string} Fallback response
 */
function generateFallbackResponse(sessionType) {
  // Create an array of possible fallback responses
  const individualResponses = [
    "I'm here to support you. Could you tell me more about what's on your mind regarding your relationship?",
    "I'd like to understand your relationship situation better. What specific aspects would you like to discuss today?",
    "Relationships can be complex. Would you like to talk about a specific challenge you're facing?",
    "I'm here to help with your relationship questions. What's been on your mind lately?",
    "I'm listening and ready to support you. What relationship topics are most important to you right now?"
  ];
  
  const jointResponses = [
    "I'm here to support your communication. Could you both share more about what brought you here today?",
    "I'd like to understand what you both hope to achieve in this conversation. Could you share your thoughts?",
    "Thank you for coming together to work on your relationship. What specific topics would you like to address?",
    "I'm here to help facilitate a productive conversation between you. What's the most important issue you'd like to discuss?",
    "Communication is key in any relationship. What aspects of your communication would you like to improve today?"
  ];
  
  // Select a random response based on session type
  if (sessionType === 'joint') {
    const randomIndex = Math.floor(Math.random() * jointResponses.length);
    return jointResponses[randomIndex];
  }
  
  const randomIndex = Math.floor(Math.random() * individualResponses.length);
  return individualResponses[randomIndex];
}

/**
 * Handles a message sent by a user to Claude
 * @param {string} message - The user's message
 * @param {Array} history - Array of previous messages in the conversation
 * @returns {Promise<string>} - Claude's response
 */
async function handleUserMessage(message, history = []) {
  try {
    // Sanitize the user message
    const sanitizedMessage = sanitizeUserInput(message);
    
    console.log('Processing message:', sanitizedMessage);
    
    // Process conversation history
    const processedHistory = processConversationHistory(history);
    
    // If this is the first message (no history at all), provide a welcoming first message
    if (history.length === 0) {
      const welcomeMessages = [
        "Welcome to Coco! I'm here to help with relationship questions and communication challenges. What brings you here today?",
        "Hi there! I'm Coco, your relationship support companion. I'm here to listen and help however I can. What would you like to talk about?",
        "Thank you for reaching out. I'm Coco, and I'm here to support you with relationship matters. How can I assist you today?",
        "Hello! I'm Coco, and I'm glad you're here. I'm ready to listen and help with your relationship questions. What's on your mind?",
        "Welcome! I'm Coco, your supportive counseling companion. I'm here to help with relationship communication and understanding. What would you like to discuss?"
      ];
      
      const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
      return welcomeMessages[randomIndex];
    }
    
    // Format messages for Claude API
    const messages = [
      ...processedHistory,
      { role: 'user', content: sanitizedMessage }
    ];
    
    // Create appropriate system prompt
    const systemPrompt = createSystemPrompt('individual');
    
    console.log('Calling Claude API with prompt length:', systemPrompt.length);
    console.log('Message history items:', messages.length);
    
    // Call the Claude API with appropriate parameters
    try {
      console.log('Attempting to call Claude API...');
      const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        system: systemPrompt,
        messages: messages,
        max_tokens: 1000
      });
      
      const aiResponse = response.content.find(b => b.type === 'text')?.text;
      console.log('Claude API response received:', aiResponse ? aiResponse.substring(0, 50) + '...' : 'no text block');
      
      // Validate the response
      if (!validateResponse(aiResponse)) {
        logger.error('Generated an invalid AI response');
        return generateFallbackResponse('individual');
      }
      
      return aiResponse;
    } catch (apiError) {
      console.error('Claude API call failed:', apiError.message);
      console.error('API Error details:', JSON.stringify(apiError, null, 2));
      logger.error('Claude API error details:', apiError);
      return generateFallbackResponse('individual');
    }
  } catch (error) {
    logger.error('Error in handleUserMessage:', error);
    return generateFallbackResponse('individual');
  }
}

/**
 * Handles a joint session with multiple participants
 * @param {string} message - The user's message
 * @param {string} senderId - ID of the user sending the message
 * @param {Array} participants - Array of session participants
 * @param {Array} history - Array of previous messages in the joint session
 * @returns {Promise<string>} - Claude's response
 */
async function handleJointSession(message, senderId, participants, history = []) {
  try {
    // Sanitize the user message
    const sanitizedMessage = sanitizeUserInput(message);
    
    // Process conversation history
    const processedHistory = processConversationHistory(history);
    
    // Find the participant who sent this message
    const sender = participants.find(p => p.id === senderId);
    const prefix = sender ? `[${sender.pseudonym}]: ` : '';
    
    // Format messages for Claude API with sender prefixes
    const messages = [
      ...processedHistory,
      { role: 'user', content: `${prefix}${sanitizedMessage}` }
    ];
    
    // Create joint session system prompt
    const systemPrompt = createSystemPrompt('joint', participants);
    
    // Call the Claude API with appropriate parameters
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      system: systemPrompt,
      messages: messages,
      max_tokens: 1500
    });
    
    const aiResponse = response.content.find(b => b.type === 'text')?.text;

    // Validate the response
    if (!validateResponse(aiResponse)) {
      logger.error('Generated an invalid AI response for joint session');
      return generateFallbackResponse('joint');
    }
    
    return aiResponse;
  } catch (error) {
    logger.error('Error calling Claude API for joint session:', error);
    throw new Error('Failed to get response from Claude for joint session');
  }
}

module.exports = {
  handleUserMessage,
  handleJointSession,
  sanitizeUserInput // Exported for testing
};