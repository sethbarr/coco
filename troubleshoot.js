/**
 * Coco Counseling Troubleshooting Script
 * 
 * This script helps diagnose common issues with the Coco Counseling platform.
 * Run it with Node.js: node troubleshoot.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🔍 Coco Counseling Troubleshooter 🔍\n');

// Check if Node modules are installed
console.log('Checking Node modules...');
const checkBackendModules = fs.existsSync(path.join(__dirname, 'backend', 'node_modules'));
const checkFrontendModules = fs.existsSync(path.join(__dirname, 'frontend', 'node_modules'));

if (!checkBackendModules || !checkFrontendModules) {
  console.log('❌ Missing node_modules. Installing dependencies...');
  try {
    execSync('npm run install-all', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Node modules found');
}

// Check environment variables
console.log('\nChecking environment variables...');

// Check backend .env file
const backendEnvPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(backendEnvPath)) {
  console.log('❌ Backend .env file missing. Creating it...');
  const envContent = `DATABASE_URL=postgresql://username:password@localhost:5432/coco_db
JWT_SECRET=temporary_dev_jwt_secret_key_123456789
ANTHROPIC_API_KEY=your_claude_api_key
CORS_ORIGIN=http://localhost:3000`;
  
  fs.writeFileSync(backendEnvPath, envContent);
  console.log('✅ Created backend .env file. Please update with your actual values.');
} else {
  console.log('✅ Backend .env file exists');
}

// Check frontend .env file
const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
if (!fs.existsSync(frontendEnvPath)) {
  console.log('❌ Frontend .env file missing. Creating it...');
  const envContent = `REACT_APP_API_URL=http://localhost:3001/api`;
  
  fs.writeFileSync(frontendEnvPath, envContent);
  console.log('✅ Created frontend .env file.');
} else {
  console.log('✅ Frontend .env file exists');
}

// Check database
console.log('\nChecking database configuration...');
try {
  const backendPrismaPath = path.join(__dirname, 'backend', 'prisma');
  const schemaExists = fs.existsSync(path.join(backendPrismaPath, 'schema.prisma'));
  
  if (!schemaExists) {
    console.log('❌ Prisma schema not found. Please make sure the database is properly set up.');
  } else {
    console.log('✅ Prisma schema found');
  }
} catch (error) {
  console.error('❌ Error checking database:', error.message);
}

// Check TypeScript configuration
console.log('\nChecking TypeScript configuration...');
const tsConfigPath = path.join(__dirname, 'tsconfig.json');
if (!fs.existsSync(tsConfigPath)) {
  console.log('❌ Root tsconfig.json missing');
} else {
  const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
  if (tsConfig.compilerOptions.noImplicitAny === true) {
    console.log('⚠️ noImplicitAny is set to true, which may cause TypeScript errors');
    console.log('   Consider setting this to false temporarily');
  } else {
    console.log('✅ TypeScript configuration looks good');
  }
}

// Suggest fixes for common issues
console.log('\n📋 Common Issues and Fixes:');
console.log('---------------------------');
console.log('1. Login Flickering Issue:');
console.log('   - Check browser console for errors');
console.log('   - Ensure the loadUser function in authSlice.ts properly handles token validation');
console.log('   - Make sure your backend JWT_SECRET hasn\'t changed');

console.log('\n2. Unresponsive Chatbot:');
console.log('   - Verify your ANTHROPIC_API_KEY is valid');
console.log('   - Check network requests in browser dev tools');
console.log('   - Look for errors in the backend console/logs');
console.log('   - Ensure messages are properly formatted for Claude API');

console.log('\n3. TypeScript Errors:');
console.log('   - Temporarily set "noImplicitAny": false in tsconfig.json');
console.log('   - Add proper type definitions for your data structures');

console.log('\n4. Database Connection:');
console.log('   - Check DATABASE_URL in your backend .env file');
console.log('   - Make sure PostgreSQL is running');
console.log('   - Run npx prisma migrate dev to update the database schema');

console.log('\n🔧 Next steps:');
console.log('1. Restart both frontend and backend servers');
console.log('2. Clear browser cache and localStorage');
console.log('3. Run "npm start" from the project root');
console.log('\nGood luck! 🍀');
