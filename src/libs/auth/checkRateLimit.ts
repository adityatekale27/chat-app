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

export function checkRateLimit({ type, key, limit, windowMs }: RateLimitOptions): boolean {
  const timeNow = Date.now();

  if (!store[type][key] || timeNow - store[type][key].lastAttemptAt > windowMs) {
    store[type][key] = { count: 1, lastAttemptAt: timeNow };
    return true;
  }

  store[type][key].count += 1;
  store[type][key].lastAttemptAt = timeNow;

  return store[type][key].count <= limit;
}

export function resetRateLimit({ type, key }: { type: keyof typeof store; key: string }) {
  store[type][key] = { count: 0, lastAttemptAt: Date.now() };
}
