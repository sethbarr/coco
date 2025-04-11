/**
 * Setup and Environment Check Script
 * 
 * This script helps set up the Coco Counseling environment
 * and checks for common issues.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

// ANSI color codes for prettier console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan} Coco Counseling Setup & Environment Check ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}`);

// Load environment variables
console.log(`\n${colors.bold}Checking environment...${colors.reset}`);
const envFile = path.join(__dirname, '.env');
const envExists = fs.existsSync(envFile);

if (envExists) {
  console.log(`${colors.green}✓ .env file found${colors.reset}`);
  dotenv.config();
} else {
  console.log(`${colors.red}✗ .env file not found${colors.reset}`);
  console.log(`  Creating .env from .env.example...`);
  try {
    const exampleEnv = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');
    fs.writeFileSync(envFile, exampleEnv);
    console.log(`${colors.green}✓ Created .env file${colors.reset}`);
    console.log(`${colors.yellow}! Please update the .env file with your actual credentials${colors.reset}`);
    dotenv.config();
  } catch (error) {
    console.log(`${colors.red}✗ Failed to create .env file: ${error.message}${colors.reset}`);
  }
}

// Check for required environment variables
console.log(`\n${colors.bold}Checking required environment variables...${colors.reset}`);
const requiredVars = [
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'ANTHROPIC_API_KEY',
  'CORS_ORIGIN'
];

const missingVars = [];
requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
    console.log(`${colors.red}✗ Missing: ${varName}${colors.reset}`);
  } else {
    // Show a preview for sensitive keys
    if (varName === 'ANTHROPIC_API_KEY' || varName === 'JWT_SECRET') {
      const value = process.env[varName];
      const preview = value.substring(0, 5) + '...' + 
        (value.length > 7 ? value.substring(value.length - 3) : '');
      console.log(`${colors.green}✓ ${varName}: ${preview}${colors.reset}`);
    } else if (varName === 'DATABASE_URL') {
      console.log(`${colors.green}✓ ${varName}: [HIDDEN]${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ ${varName}: ${process.env[varName]}${colors.reset}`);
    }
  }
});

// Check Anthropic API key format
if (process.env.ANTHROPIC_API_KEY) {
  if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    console.log(`${colors.red}✗ ANTHROPIC_API_KEY format is incorrect. It should start with 'sk-ant-'${colors.reset}`);
  }
}

// Check for installed dependencies
console.log(`\n${colors.bold}Checking dependencies...${colors.reset}`);
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const dependencies = [
    '@anthropic-ai/sdk',
    'express',
    'prisma',
    '@prisma/client',
    'jsonwebtoken'
  ];
  
  const missingDeps = [];
  dependencies.forEach(dep => {
    if (!packageJson.dependencies[dep]) {
      missingDeps.push(dep);
      console.log(`${colors.red}✗ Missing dependency: ${dep}${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ ${dep}: ${packageJson.dependencies[dep]}${colors.reset}`);
    }
  });
  
  if (missingDeps.length > 0) {
    console.log(`\n${colors.yellow}Installing missing dependencies...${colors.reset}`);
    try {
      execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' });
      console.log(`${colors.green}✓ Dependencies installed successfully${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}✗ Failed to install dependencies: ${error.message}${colors.reset}`);
    }
  }
} catch (error) {
  console.log(`${colors.red}✗ Failed to read package.json: ${error.message}${colors.reset}`);
}

// Check for database
console.log(`\n${colors.bold}Checking database connection...${colors.reset}`);
try {
  // We just check if the URL matches the format without actually connecting
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('postgresql://')) {
    console.log(`${colors.green}✓ Database URL format is valid${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Database URL format is invalid${colors.reset}`);
  }
} catch (error) {
  console.log(`${colors.red}✗ Database check failed: ${error.message}${colors.reset}`);
}

// Show next steps
console.log(`\n${colors.bold}${colors.cyan}Next Steps:${colors.reset}`);
if (missingVars.length > 0) {
  console.log(`${colors.yellow}1. Update the .env file with your credentials${colors.reset}`);
  console.log(`   - Edit the .env file in this directory`);
  console.log(`   - Set values for: ${missingVars.join(', ')}`);
}

console.log(`${colors.yellow}2. Run the API test script to verify Claude API connectivity:${colors.reset}`);
console.log(`   node testApi.js`);

console.log(`${colors.yellow}3. Start the backend server:${colors.reset}`);
console.log(`   npm run dev`);

console.log(`${colors.yellow}4. Start the frontend (in a separate terminal):${colors.reset}`);
console.log(`   cd ../frontend`);
console.log(`   npm start`);

console.log(`\n${colors.bold}${colors.cyan}Troubleshooting:${colors.reset}`);
console.log(`- If you receive Claude API errors, ensure your API key is correct and active`);
console.log(`- For database connection issues, check that PostgreSQL is running`);
console.log(`- For CORS errors, verify the CORS_ORIGIN matches your frontend URL`);
console.log(`- For auth errors, check that JWT_SECRET is set correctly`);

console.log(`\n${colors.bold}${colors.cyan}Setup and check complete!${colors.reset}`);
