import rateLimit from 'express-rate-limit';

// Read rate limit config from environment or use defaults
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 min default
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '300', 10);
const AUTH_RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '20', 10);

export const globalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for verification endpoints
  skip: (req) => {
    return req.path?.includes('/verification') || false;
  },
});

export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100, // Increased from 30 to 100 for uploads
  message: { error: 'Too many uploads, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Less restrictive limiter for verification endpoints
export const verificationLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: 1000, // Much higher limit for verification attempts
  message: { error: 'Too many verification attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => true, // Disable rate limiting entirely for testing
});
