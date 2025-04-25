type RateLimitStore = Record<string, { count: number; lastAttemptAt: number }>;

const store: Record<string, RateLimitStore> = {
  login: {},
  signup: {},
  message: {},
  request: {},
};

interface RateLimitOptions {
  key: string;
  type: "login" | "signup" | "message" | "request";
  limit: number;
  windowMs: number;
}

/* Checks whether a given key has exceeded the rate limit for a specific action type */
export function checkRateLimit({ type, key, limit, windowMs }: RateLimitOptions): boolean {
  const timeNow = Date.now();

  // If it's the first attempt or the last attempt was outside the time window,
  // reset the count and timestamp
  if (!store[type][key] || timeNow - store[type][key].lastAttemptAt > windowMs) {
    store[type][key] = { count: 1, lastAttemptAt: timeNow };
    return true;
  }

  // Otherwise, increment the count and update the timestamp
  store[type][key].count += 1;
  store[type][key].lastAttemptAt = timeNow;

  // Allow the request if the count is still within the limit
  return store[type][key].count <= limit;
}

/* Resets the rate limit for a given key and type. */
export function resetRateLimit({ type, key }: { type: keyof typeof store; key: string }) {
  store[type][key] = { count: 0, lastAttemptAt: Date.now() };
}
