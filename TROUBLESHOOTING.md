# Coco Counseling Platform - Troubleshooting Guide

This guide addresses the login flickering issue and unresponsive chatbot problems in the Coco Counseling platform.

## Common Issues & Solutions

### 1. Login Page Flickering

**Symptoms:**
- Login page flickers between "log in" and "logging in" states
- Need to stop page loading (command + .) to enter login details

**Causes:**
- Race condition in the authentication flow
- Improper token handling in the `loadUser` function
- TypeScript compilation errors preventing proper build

**Solutions:**

1. **Fix the auth token handling:**
   - Modified `loadUser` in `authSlice.ts` to properly handle missing tokens
   - Prevented automatic token removal on error
   - Added better error logging

2. **Clear browser data:**
   ```
   // Run in browser console
   localStorage.clear();
   sessionStorage.clear();
   indexedDB.deleteDatabase('cocoEncryptionStore');
   ```

3. **Fix TypeScript compilation errors:**
   - Updated `tsconfig.json` to set `noImplicitAny` to `false` temporarily
   - Fixed incorrect import paths (.ts and .tsx extensions)

### 2. Unresponsive Chatbot

**Symptoms:**
- After login, dots appear when typing to Coco but no response appears
- Typing indicator disappears without showing a message

**Causes:**
- Issues with Claude API integration
- Encryption/decryption problems
- Improper handling of API response states

**Solutions:**

1. **Enhanced Claude API integration:**
   - Improved error handling in `claude.js`
   - Added additional logging to diagnose API issues
   - Implemented fallback responses on API failure

2. **Fixed message handling:**
   - Updated the chat interface to properly handle async message sending
   - Modified the message dispatch to work with promises
   - Made typing indicator respond to actual message delivery

3. **Improved backend message processing:**
   - Updated messages.js to handle both encrypted and plaintext messages
   - Added fallback handling for missing encryption metadata

## Step-by-Step Recovery

1. **Run the troubleshooting script:**
   ```
   node troubleshoot.js
   ```

2. **Update environment variables:**
   - Check backend/.env file has valid:
     - DATABASE_URL
     - JWT_SECRET
     - ANTHROPIC_API_KEY
     - CORS_ORIGIN

3. **Install dependencies:**
   ```
   npm run install-all
   ```

4. **Fix database issues:**
   - Ensure PostgreSQL is running
   - Run database migrations:
     ```
     cd backend
     npx prisma migrate dev
     ```

5. **Clear frontend storage:**
   - In your browser's developer tools:
     - Application tab → Clear Storage
     - Select all items and click "Clear site data"

6. **Restart both servers:**
   ```
   npm start
   ```

## Monitoring for Future Issues

1. **Check console logs:**
   - Browser console for frontend errors
   - Terminal/log files for backend errors

2. **Look for common error patterns:**
   - Authentication failures (401 errors)
   - API request timeouts
   - Encryption/decryption errors

3. **Review environment configuration:**
   - Ensure environment variables are correct
   - Verify database connection
   - Check Claude API key validity

## For Developers

For TypeScript errors, consider gradually adding proper type definitions:

1. Create interface files in `frontend/src/types/` folder
2. Define types for all main data structures (User, Message, Session, etc.)
3. Implement these types across components

For encryption issues, test encryption/decryption in isolation using the browser console with:

```javascript
import { encryptMessage, decryptMessage } from './utils/encryption';
// Test with sample data
```

## Need More Help?

If problems persist, check the detailed error logs in `/error logs` directory, which may contain more specific error information to diagnose the issues further.
