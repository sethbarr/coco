/**
 * Update script for the Anthropic SDK
 * 
 * This script will update the Anthropic SDK to the latest version
 * and fix compatibility issues.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan} Updating Anthropic SDK for Coco Counseling ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}`);

// Check current version
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const currentVersion = packageJson.dependencies['@anthropic-ai/sdk'];
  
  console.log(`\n${colors.yellow}Current Anthropic SDK version: ${currentVersion}${colors.reset}`);
  console.log(`\n${colors.bold}Installing the latest version...${colors.reset}`);
  
  // Run npm install for the latest version
  try {
    execSync('npm install @anthropic-ai/sdk@latest --save', { stdio: 'inherit' });
    console.log(`\n${colors.green}✓ Successfully updated Anthropic SDK to the latest version${colors.reset}`);
  } catch (error) {
    console.log(`\n${colors.red}✗ Error updating Anthropic SDK: ${error.message}${colors.reset}`);
    process.exit(1);
  }
  
  // Check if the update succeeded
  const updatedPackageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const newVersion = updatedPackageJson.dependencies['@anthropic-ai/sdk'];
  
  console.log(`\n${colors.green}Previous version: ${currentVersion}${colors.reset}`);
  console.log(`${colors.green}Updated version: ${newVersion}${colors.reset}`);
  
  if (currentVersion === newVersion) {
    console.log(`\n${colors.yellow}No version change detected. You might already have the latest version.${colors.reset}`);
  }
  
  // Now create a minimal test script
  console.log(`\n${colors.bold}Creating a minimal test script...${colors.reset}`);
  
  const testScriptContent = `
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
          prompt: "\\n\\nHuman: Say hello!\\n\\nAssistant:",
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
`;

  fs.writeFileSync(path.join(__dirname, 'testSdk.js'), testScriptContent);
  console.log(`${colors.green}✓ Created test script: testSdk.js${colors.reset}`);
  
  console.log(`\n${colors.bold}${colors.cyan}Next Steps:${colors.reset}`);
  console.log(`1. Run the test script: ${colors.yellow}node testSdk.js${colors.reset}`);
  console.log(`2. Restart your server: ${colors.yellow}npm run dev${colors.reset}`);
  console.log(`3. Test the chat interface in your browser`);
  
  console.log(`\n${colors.bold}${colors.cyan}Update complete!${colors.reset}`);
  
} catch (error) {
  console.log(`\n${colors.red}✗ Error reading package.json: ${error.message}${colors.reset}`);
}
