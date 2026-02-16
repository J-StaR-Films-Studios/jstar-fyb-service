
interface RateLimitContext {
  limit: number;
  window: number; // in milliseconds
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory store for rate limits
// Note: In serverless environments (like Vercel), this map is not shared across instances.
// However, it works perfectly for long-running Node.js servers and provides "best effort" protection
// for serverless functions (per-instance limiting).
const store = new Map<string, { count: number; reset: number }>();

/**
 * Prunes expired entries from the store to prevent memory leaks.
 * Also enforces a maximum size to prevent OOM.
 */
function pruneStore() {
  const now = Date.now();

  // Remove expired entries
  for (const [key, value] of store.entries()) {
    if (value.reset < now) {
      store.delete(key);
    }
  }

  // If still too large, remove oldest entries (Map preserves insertion order)
  if (store.size > 10000) {
    for (const key of store.keys()) {
      store.delete(key);
      if (store.size <= 8000) break; // Prune down to 8000
    }
  }
}

// Prune periodically (every 5 minutes) if the process is long-running
// Use unref to allow process to exit if this is the only thing keeping it alive (Node.js only)
if (typeof setInterval !== 'undefined') {
  const interval = setInterval(pruneStore, 5 * 60 * 1000);
  if (interval.unref) interval.unref();
}

export async function rateLimit(
  identifier: string,
  context: RateLimitContext
): Promise<RateLimitResult> {
  const { limit, window } = context;
  const now = Date.now();

  // Lazy cleanup on access if store is getting full
  if (store.size > 10000) {
    pruneStore();
  }

  const record = store.get(identifier);

  // If no record or expired, reset
  if (!record || record.reset < now) {
    const reset = now + window;
    store.set(identifier, { count: 1, reset });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset,
    };
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: record.reset,
    };
  }

  // Increment count
  record.count += 1;

  // Update record (not strictly necessary as object is mutable, but good for clarity)
  // We don't need to set() again unless we want to refresh LRU order (delete/set).
  // For strict rate limiting window, we don't refresh the reset time.

  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: record.reset,
  };
}
