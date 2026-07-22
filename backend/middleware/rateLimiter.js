// In-memory sliding window rate limiter for AI requests
const requestStore = new Map();

// Default limit: 25 requests per 1 minute window per IP/User
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 25;

const aiRateLimiter = (req, res, next) => {
  const identifier = req.user ? String(req.user.id || req.user._id) : (req.ip || req.headers["x-forwarded-for"] || "guest");
  const now = Date.now();

  if (!requestStore.has(identifier)) {
    requestStore.set(identifier, []);
  }

  const timestamps = requestStore.get(identifier).filter((time) => now - time < WINDOW_MS);
  
  if (timestamps.length >= MAX_REQUESTS) {
    const oldest = timestamps[0];
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    return res.status(429).json({
      success: false,
      message: `Rate limit exceeded. Please wait ${retryAfterSeconds} seconds before sending another AI request.`,
      retryAfter: retryAfterSeconds
    });
  }

  timestamps.push(now);
  requestStore.set(identifier, timestamps);

  // Clean up store periodically
  if (requestStore.size > 5000) {
    for (const [key, times] of requestStore.entries()) {
      if (times.every((t) => now - t >= WINDOW_MS)) {
        requestStore.delete(key);
      }
    }
  }

  next();
};

module.exports = {
  aiRateLimiter
};
