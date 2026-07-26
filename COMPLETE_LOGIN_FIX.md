# Complete Fix for Login Issues in Coco Counseling

## Problem Identified

The login functionality is failing with a 500 Internal Server Error. The issue is in the `auth.js` middleware file, which tries to create a record in a `securityEvent` table that doesn't exist in the database.

## Issue Details

The problem occurs in the `invalidateRefreshTokens` function in `middleware/auth.js`:

```javascript
await prisma.securityEvent.create({
  data: {
    userId,
    eventType: 'potential_token_theft',
    metadata: {
      userAgent,
      timestamp: new Date()
    }
  }
});
```

This code attempts to create a record in the `securityEvent` table, which doesn't exist in your Prisma schema, causing a 500 error.

## Database Connection Issue

Additionally, there's a problem connecting to your Supabase PostgreSQL database:

```
Error: P1001: Can't reach database server at `db.gsongujcyaxeieapnfhj.supabase.co:5432`
```

This could be due to:
1. The database server being down
2. IP restrictions in Supabase
3. Incorrect credentials in your `.env` file
4. Network connectivity issues

## Step-by-Step Solution

### 1. Fix the Auth Middleware

Replace the contents of `/backend/src/middleware/auth.js` with the patched version that removes the reference to the missing table:

```javascript
/**
 * Enhanced authentication middleware with improved security features
 */
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request object
 */
module.exports = async function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate that token was issued to the same client
    // This helps mitigate token theft
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    
    if (decoded.userAgent && decoded.userAgent !== userAgent) {
      // Potential token theft from different browser/device
      await invalidateRefreshTokens(decoded.user.id, userAgent);
      return res.status(401).json({ message: 'Invalid client, please login again' });
    }
    
    // Check if user exists and is not deleted
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.user.id,
        deletedAt: null
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found or deleted' });
    }
    
    // Check if user is locked out (optional security feature)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(403).json({ 
        message: 'Account temporarily locked', 
        lockedUntil: user.lockedUntil 
      });
    }

    // Add user to request
    req.user = decoded.user;
    
    // Update last active timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() }
    });

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        expired: true
      });
    }
    
    console.error('Token verification error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

/**
 * Helper function to invalidate refresh tokens
 * Used when potential token theft is detected
 */
async function invalidateRefreshTokens(userId, userAgent) {
  try {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        userAgent
      },
      data: {
        invalid: true
      }
    });
    
    // Log the event instead of creating a security event record
    console.warn(`Potential token theft detected for user ${userId} with user agent ${userAgent}`);
  } catch (error) {
    console.error('Error invalidating refresh tokens:', error);
  }
}
```

### 2. Check Database Connection

Verify your database connection settings in the `.env` file:

1. Open `/backend/.env`
2. Check the `DATABASE_URL` value:
   ```
   DATABASE_URL=postgresql://username:password@db.gsongujcyaxeieapnfhj.supabase.co:5432/postgres
   ```

3. Verify that:
   - You have the correct username and password
   - Your Supabase project is active and online
   - Your IP address is allowed in Supabase's Database Settings > Connection Pooling

If you want to test locally without the remote database:

1. Install PostgreSQL locally
2. Create a local database
3. Update `.env` to use the local database:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/coco_db
   ```

### 3. Add Better Error Logging

To help diagnose future issues, enhance error logging in the auth routes:

1. Modify `/backend/src/routes/auth.js` to provide more detailed error logging:

```javascript
router.post('/login', authLimiter, async (req, res) => {
  try {
    // Existing login code...
  } catch (error) {
    console.error('Login error:', error);
    // Log more detailed error information
    if (error.code) {
      console.error(`Database error code: ${error.code}`);
    }
    if (error.meta) {
      console.error('Error metadata:', error.meta);
    }
    res.status(500).json({ message: 'Server error' });
  }
});
```

### 4. Create a Testing Endpoint

Add a simple endpoint to verify database connectivity:

1. Create a new file `/backend/src/routes/debug.js`:

```javascript
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Only enable in development
if (process.env.NODE_ENV !== 'production') {
  /**
   * @route GET /api/debug/db-status
   * @desc Check database connection
   * @access Public (only in development)
   */
  router.get('/db-status', async (req, res) => {
    try {
      // Try to query something simple
      const count = await prisma.user.count();
      res.json({ 
        status: 'connected',
        userCount: count,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Database connection test failed:', error);
      res.status(500).json({ 
        status: 'error',
        message: error.message,
        code: error.code || 'UNKNOWN'
      });
    }
  });
}

module.exports = router;
```

2. Add this route to `/backend/src/index.js`:

```javascript
// Only include debug routes in development
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', require('./routes/debug'));
}
```

### 5. Implementation Steps

1. Stop the backend server if it's running
2. Make the changes to `auth.js` as described above
3. Restart the backend server
4. Test the connection with the debug endpoint (if added)
5. Try logging in again

## Long-term Solution

Once the immediate login issue is fixed, consider implementing a proper security events system:

1. Add the SecurityEvent model to your schema:
```prisma
model SecurityEvent {
  id         String   @id @default(uuid())
  userId     String
  eventType  String
  metadata   Json
  createdAt  DateTime @default(now())
  
  // Relationship
  user       User     @relation("UserSecurityEvents", fields: [userId], references: [id])
}

// Update User model
model User {
  // ... existing fields
  securityEvents SecurityEvent[] @relation("UserSecurityEvents")
}
```

2. Run a migration to create the table:
```bash
npx prisma migrate dev --name add_security_events
```

3. Revert the changes in `auth.js` to use the SecurityEvent model now that it exists.

This approach allows you to:
1. Fix the immediate login issue
2. Later implement the security event logging properly
3. Maintain the enhanced security features of the application