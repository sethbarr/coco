/**
 * Enhanced error handling and structured logging system
 */
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Define custom error levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to Winston
winston.addColors(colors);

// Create a Winston logger
const logger = winston.createLogger({
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata(),
    winston.format.json()
  ),
  defaultMeta: { service: 'coco-api' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs to combined.log
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
  exitOnError: false
});

// If we're not in production, log to the console with a simplified format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.simple()
    ),
    level: 'debug'
  }));
} else {
  // In production, we might want to add other transports like
  // AWS CloudWatch, Loggly, or other log management services
}

/**
 * HTTP request logger middleware
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
function httpLogger(req, res, next) {
  // Generate a unique ID for this request for tracking
  const requestId = uuidv4();
  req.requestId = requestId;
  
  // Set the request ID in the response headers for debugging
  res.setHeader('X-Request-ID', requestId);
  
  // Log the request details
  logger.http({
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user ? req.user.id : 'anonymous'
  });
  
  // Record request start time
  const start = Date.now();
  
  // Log response details when the request completes
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    const logLevel = res.statusCode >= 400 ? 'warn' : 'http';
    
    logger.log(logLevel, {
      requestId,
      statusCode: res.statusCode,
      duration,
      bytesSent: res.getHeader('Content-Length') || 0
    });
  });
  
  next();
}

/**
 * Custom error types
 */
class AppError extends Error {
  constructor(message, statusCode, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Indicates this is an expected error
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message, details = {}) {
    super(message, 401, details);
    this.name = 'AuthenticationError';
  }
}

class ForbiddenError extends AppError {
  constructor(message, details = {}) {
    super(message, 403, details);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(message, details = {}) {
    super(message, 404, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Global error handler middleware
 * @param {object} err - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  // Default to 500 if statusCode is not defined
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;
  
  // Create a sanitized error response
  const errorResponse = {
    message: isOperational ? err.message : 'Server error',
    requestId: req.requestId
  };
  
  // Add details for operational errors or in development
  if (isOperational || process.env.NODE_ENV !== 'production') {
    errorResponse.details = err.details || {};
  }
  
  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.stack = err.stack.split('\n').map(line => line.trim());
  }
  
  // Log the error (different levels depending on status code)
  if (statusCode >= 500) {
    logger.error({
      message: err.message,
      requestId: req.requestId,
      stack: err.stack,
      details: err.details || {},
      request: {
        method: req.method,
        url: req.url,
        body: req.body,
        params: req.params,
        query: req.query
      }
    });
  } else if (statusCode >= 400) {
    logger.warn({
      message: err.message,
      requestId: req.requestId,
      details: err.details || {}
    });
  }
  
  // Send the error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async handler wrapper to eliminate try/catch blocks
 * @param {function} fn - Async function to wrap
 * @returns {function} Express middleware function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Utility to create a sanitized error object from any error
 * @param {Error} error - Any error object
 * @returns {object} Sanitized error object
 */
function sanitizeError(error) {
  // If it's already one of our AppErrors, use it directly
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      name: error.name,
      isOperational: true
    };
  }
  
  // For known error types, map them to appropriate status codes
  if (error.name === 'JsonWebTokenError') {
    return {
      message: 'Invalid token',
      statusCode: 401,
      details: {},
      name: 'AuthenticationError',
      isOperational: true
    };
  }
  
  if (error.name === 'TokenExpiredError') {
    return {
      message: 'Token expired',
      statusCode: 401,
      details: { expired: true },
      name: 'AuthenticationError',
      isOperational: true
    };
  }
  
  if (error.code === 'P2002' && error.meta?.target?.includes('unique')) {
    // Prisma unique constraint violation
    return {
      message: `${error.meta.target} already exists`,
      statusCode: 400,
      details: { field: error.meta.target },
      name: 'ValidationError',
      isOperational: true
    };
  }
  
  // For unknown errors, create a generic server error
  return {
    message: 'Server error',
    statusCode: 500,
    details: {},
    name: 'ServerError',
    isOperational: false
  };
}

/**
 * Log a security event
 * @param {string} eventType - Type of security event
 * @param {object} details - Event details
 * @param {string} userId - User ID if available
 */
function logSecurityEvent(eventType, details, userId = null) {
  logger.warn({
    eventType,
    userId,
    timestamp: new Date().toISOString(),
    details
  });
  
  // You could also persist this to the database
  // or send alerts for critical security events
}

// Export all the functions and classes
module.exports = {
  logger,
  httpLogger,
  errorHandler,
  asyncHandler,
  sanitizeError,
  logSecurityEvent,
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError
};