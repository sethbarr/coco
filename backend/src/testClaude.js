/**
 * A simple script to test the Claude API connection
 */
const { Anthropic } = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;

console.log('Testing Claude API connection');
console.log('API Key found:', apiKey ? 'Yes (first few chars: ' + apiKey.substring(0, 4) + '...)' : 'No');

async function testClaudeAPI() {
  try {
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    console.log('Making API request to Claude...');
    
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      system: "You are a helpful assistant.",
      messages: [
        { role: 'user', content: 'Hello! Can you hear me?' }
      ],
      max_tokens: 100
    });

    console.log('Response received!');
    console.log('Content:', response.content[0].text);
    console.log('Response object keys:', Object.keys(response));
    
    return true;
  } catch (error) {
    console.error('Error testing Claude API:');
    console.error('Message:', error.message);
    console.error('Status:', error.status);
    console.error('Type:', error.type);
    
    if (error.message.includes('API key')) {
      console.error('ISSUE DETECTED: There appears to be a problem with your API key.');
      console.error('Make sure you have a valid Anthropic API key in your .env file.');
    }
    
    if (error.message.includes('cannot be parsed as JSON')) {
      console.error('ISSUE DETECTED: The API response could not be parsed as JSON.');
      console.error('This could indicate a network issue or a problem with the API endpoint.');
    }
    
    return false;
  }
}

testClaudeAPI()
  .then(success => {
    if (success) {
      console.log('✅ Claude API test SUCCESSFUL');
    } else {
      console.log('❌ Claude API test FAILED');
    }
  })
  .catch(err => {
    console.error('Unexpected error running the test:', err);
  });
