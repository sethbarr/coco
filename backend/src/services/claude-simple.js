/**
 * Simplified Claude API service with reliable operation
 */
const { Anthropic } = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Anthropic client
let anthropic;
let useV2API = false;

try {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  console.log('Anthropic client initialized successfully');
  
  // Check which API version we need to use
  if (!anthropic.messages || typeof anthropic.messages.create !== 'function') {
    console.log('Cannot find messages API, using older completions API');
    useV2API = true;
  } else {
    console.log('Using newer messages API');
  }
} catch (error) {
  console.error('Failed to initialize Anthropic client:', error.message);
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
    
    let aiResponse;
    
    if (useV2API) {
      // Use older API (completions)
      let prompt = `${BASE_SYSTEM_PROMPT}\n\n`;
      
      // Add conversation history
      for (const msg of processedMessages) {
        if (msg.role === 'user') {
          prompt += `\n\nHuman: ${msg.content}`;
        } else {
          prompt += `\n\nAssistant: ${msg.content}`;
        }
      }
      
      // Add final assistant prompt
      prompt += '\n\nAssistant:';
      
      console.log('Using V2 API with prompt format');
      
      // We need to use a Claude-2 model with the completions API
      const response = await anthropic.completions.create({
        model: "claude-2",
        prompt: prompt,
        max_tokens_to_sample: 1000,
        temperature: 0.7
      });
      
      aiResponse = response.completion.trim();
    } else {
      // Use newer messages API
      const response = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        system: BASE_SYSTEM_PROMPT,
        messages: processedMessages,
        max_tokens: 1000,
        temperature: 0.7
      });
      
      aiResponse = response.content[0].text;
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
 * Simplified joint session handler
 * @param {string} message - The user's message
 * @param {string} senderName - Name of the sender
 * @param {Array} history - Message history
 * @returns {Promise<string>} - Claude's response
 */
async function handleJointSession(message, senderName, history = []) {
  // This is a simplified version - in a complete implementation,
  // you would include additional context about all participants
  
  // Prefix the message with the sender's name
  const prefixedMessage = `[${senderName}]: ${message}`;
  
  // Use the standard message handler with the prefixed message
  return handleUserMessage(prefixedMessage, history);
}

module.exports = {
  handleUserMessage,
  handleJointSession
};