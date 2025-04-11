
const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config();

async function testApi() {
  try {
    // Initialize the client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    console.log("Anthropic SDK initialized successfully");
    
    // Test if messages API is available
    if (anthropic.messages && typeof anthropic.messages.create === 'function') {
      console.log("✓ Messages API is available");
      console.log("Testing Messages API...");
      
      try {
        const response = await anthropic.messages.create({
          model: "claude-2",
          system: "You are a helpful assistant.",
          messages: [
            { role: 'user', content: 'Say hello!' }
          ],
          max_tokens: 100
        });
        
        console.log("✓ Messages API worked!");
        console.log("Response:", response.content[0].text);
      } catch (error) {
        console.log("✗ Messages API failed:", error.message);
      }
    } else {
      console.log("✗ Messages API is not available");
    }
    
    // Test if completions API is available
    if (anthropic.completions && typeof anthropic.completions.create === 'function') {
      console.log("✓ Completions API is available");
      console.log("Testing Completions API...");
      
      try {
        const response = await anthropic.completions.create({
          model: "claude-2",
          prompt: "\n\nHuman: Say hello!\n\nAssistant:",
          max_tokens_to_sample: 100
        });
        
        console.log("✓ Completions API worked!");
        console.log("Response:", response.completion);
      } catch (error) {
        console.log("✗ Completions API failed:", error.message);
      }
    } else {
      console.log("✗ Completions API is not available");
    }
    
  } catch (error) {
    console.log("Error initializing Anthropic SDK:", error.message);
  }
}

console.log("Testing Anthropic SDK...");
testApi();
