/**
 * Security middleware for adding headers and rate limiting
 */
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const { createReportUri } = require('./cspreporter');

/**
 * Configure and apply security headers with helmet
 * @param {object} app - Express app
 */
function applySecurityHeaders(app) {
  // Base Helmet configuration
  app.use(helmet());
  
  // Content Security Policy configuration
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        upgradeInsecureRequests: [],
        reportUri: [createReportUri()]
      },
      reportOnly: process.env.NODE_ENV !== 'production' // Report only in development
    })
  );
  
  // Referrer Policy
  app.use(
    helmet.referrerPolicy({
      policy: ['no-referrer', 'strict-origin-when-cross-origin']
    })
  );
  
  // Strict Transport Security
  app.use(
    helmet.hsts({
      maxAge: 15552000, // 180 days
      includeSubDomains: true,
      preload: true
    })
  );
  
  // Feature Policy
  app.use((req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );
    next();
  });
  
  // Cross-Origin headers
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    next();
  });
  
  // Cache control for static assets
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.path.startsWith('/static/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    next();
  });
  
  // Prevent XSS attacks
  app.use(xss());
  
  // Prevent HTTP Parameter Pollution
  app.use(hpp());
}

/**
 * Apply various rate limiters for different routes
 * @param {object} app - Express app
 */
function applyRateLimits(app) {
  // Global limiter - 100 requests per minute
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later' },
    skip: (req) => req.ip === '127.0.0.1' // Don't limit local testing
  });
  
  // API limiter - 60 requests per minute
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many API requests, please try again later' }
  });
  
  // Auth limiter - 10 requests per 15 minutes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many authentication attempts, please try again later' }
  });
  
  // Message sending limiter - 30 messages per minute
  const messageLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'You are sending too many messages, please slow down' }
  });
  
  // Apply limiters to routes
  app.use(globalLimiter); // Apply to all routes
  app.use('/api/', apiLimiter); // Apply to all API routes
  app.use('/api/auth/login', authLimiter); // Apply to login route
  app.use('/api/auth/register', authLimiter); // Apply to registration route
  app.use('/api/messages', messageLimiter); // Apply to message sending
}

/**
 * Apply CORS configuration
 * @param {object} app - Express app
 */
function configureCORS(app) {
  const cors = require('cors');
  
  // CORS options
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // List of allowed origins
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        // Add additional domains as needed for production
      ];
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-csrf-token'],
    credentials: true, // Allow cookies
    maxAge: 86400 // Cache preflight for 24 hours
  };
  
  app.use(cors(corsOptions));
}

/**
 * Middleware to create a CSP report endpoint
 * @returns {function} Middleware function
 */
function createCspReportEndpoint() {
  return (req, res) => {
    if (req.method === 'POST' && req.body) {
      // Log CSP violations
      const reportData = req.body['csp-report'] || req.body;
      console.warn('CSP Violation:', JSON.stringify(reportData, null, 2));
    }
    res.status(204).end();
  };
}

/**
 * Temporary in-memory store for tracking API abuse
 * In production, use Redis or similar for distributed environments
 */
const abuseStore = {
  ipCounts: new Map(),
  suspiciousIps: new Set(),
  
  /**
   * Increment count for an IP
   * @param {string} ip - IP address
   * @param {string} action - Action type
   */
  increment(ip, action) {
    const key = `${ip}:${action}`;
    const count = (this.ipCounts.get(key) || 0) + 1;
    this.ipCounts.set(key, count);
    
    // Check threshold based on action
    let threshold = 100; // Default
    
    switch (action) {
      case 'auth:failed':
        threshold = 5;
        break;
      case 'csrf:invalid':
        threshold = 3;
        break;
      case '4xx':
        threshold = 20;
        break;
    }
    
    if (count >= threshold) {
      this.suspiciousIps.add(ip);
    }
    
    // Cleanup old entries every hour
    setTimeout(() => {
      this.ipCounts.delete(key);
    }, 3600000);
  },
  
  /**
   * Check if IP is suspicious
   * @param {string} ip - IP address to check
   * @returns {boolean} True if suspicious
   */
  isSuspicious(ip) {
    return this.suspiciousIps.has(ip);
  }
};

/**
 * Middleware to detect and block suspicious activity
 * @returns {function} Middleware function
 */
function detectSuspiciousActivity() {
  return (req, res, next) => {
    const ip = req.ip;
    
    // Check if already marked as suspicious
    if (abuseStore.isSuspicious(ip)) {
      // Delay response to rate limit abusive requests
      setTimeout(() => {
        res.status(429).json({
          message: 'Too many suspicious requests, please try again later'
        });
      }, 2000);
      return;
    }
    
    // Track 4xx errors
    const originalStatus = res.statusCode;
    res.on('finish', () => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        abuseStore.increment(ip, '4xx');
      }
    });
    
    next();
  };
}

module.exports = {
  applySecurityHeaders,
  applyRateLimits,
  configureCORS,
  createCspReportEndpoint,
  detectSuspiciousActivity
};