/**
 * Test script for verifying Claude API connectivity
 */
require('dotenv').config();
const { Anthropic } = require('@anthropic-ai/sdk');

// Log environment info
console.log('Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- API Key exists:', !!process.env.ANTHROPIC_API_KEY);
console.log('- API Key preview:', process.env.ANTHROPIC_API_KEY ? 
    `${process.env.ANTHROPIC_API_KEY.substring(0, 5)}...${process.env.ANTHROPIC_API_KEY.substring(process.env.ANTHROPIC_API_KEY.length - 3)}` : 
    'Not found');

async function testClaudeAPI() {
    try {
        console.log('\nInitializing Anthropic client with apiKey parameter...');
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
        
        console.log('Client initialized, details:');
        console.log('- Client methods:', Object.keys(anthropic).join(', '));
        console.log('- Messages object exists:', !!anthropic.messages);
        
        if (!anthropic.messages || typeof anthropic.messages.create !== 'function') {
            console.error('ERROR: messages.create is not a function');
            console.log('Attempting older API style...');
            
            // Try older API style with Claude-2 model
            const response = await anthropic.completions.create({
                model: "claude-2",
                prompt: "\n\nHuman: Say hello\n\nAssistant:",
                max_tokens_to_sample: 100
            });
            
            console.log('Older API worked!');
            console.log(response);
            return true;
        }

        console.log('\nMaking test API request to Claude...');
        const startTime = Date.now();
        
        const response = await anthropic.messages.create({
            model: "claude-3-opus-20240229",
            system: "You are a helpful assistant for a simple test.",
            messages: [
                { role: 'user', content: 'Say hello and confirm that you can hear me.' }
            ],
            max_tokens: 100,
            temperature: 0.7
        });

        const elapsed = (Date.now() - startTime) / 1000;
        
        console.log(`\n✅ SUCCESS! Response received in ${elapsed.toFixed(2)} seconds.`);
        console.log('\nResponse content:');
        console.log(response.content[0].text);
        
        console.log('\nFull response object:');
        console.log(JSON.stringify(response, null, 2));
        
        return true;
    } catch (error) {
        console.error('\n❌ ERROR testing Claude API:');
        console.error('- Message:', error.message);
        console.error('- Status:', error.status);
        console.error('- Type:', error.type);
        
        if (error.message.includes('API key')) {
            console.error('\nISSUE: There appears to be a problem with your API key.');
            console.error('- Check that you have a valid Anthropic API key in your .env file');
            console.error('- Make sure your key starts with "sk-ant-" (Claude API key format)');
            console.error('- Verify that your account has sufficient quota and permissions');
        }
        
        if (error.message.includes('network')) {
            console.error('\nISSUE: There appears to be a network connectivity problem.');
            console.error('- Check your internet connection');
            console.error('- Verify that outbound connections to api.anthropic.com are allowed');
        }
        
        console.error('\nFull error object:');
        console.error(JSON.stringify(error, null, 2));
        
        return false;
    }
}

console.log('Starting Claude API test...');
testClaudeAPI()
    .then(success => {
        console.log('\nTest complete.');
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('Unexpected error running the test:', err);
        process.exit(1);
    });
