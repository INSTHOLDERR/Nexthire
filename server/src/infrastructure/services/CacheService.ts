import Redis from 'ioredis';

/**
 * CacheService wraps ioredis with typed get/set/invalidate helpers.
 *
 * Why a dedicated class instead of calling redis directly in controllers:
 * - Single Responsibility: controllers decide *what* to cache; this class
 *   decides *how* (serialization, TTL, connection error handling)
 * - If we ever swap Redis for another cache (Memcached, in-memory fallback)
 *   only this file changes — use sites stay untouched (Dependency Inversion)
 * - Connection errors are caught here and logged as warnings, not thrown —
 *   a cache miss is never worse than no cache at all, so a Redis outage
 *   should degrade gracefully rather than take down the whole server
 */
export class CacheService {
  private readonly client: Redis;
  private readonly defaultTTL: number;

  constructor(ttlSeconds = 60) {
    this.defaultTTL = ttlSeconds;

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.client = new Redis(redisUrl, {
      lazyConnect: true,        // don't connect until first command
      enableOfflineQueue: false, // fail fast if not connected — don't queue
      maxRetriesPerRequest: 1,  // one retry, then give up rather than hanging
    });

    this.client.on('error', (err) => {
      // Log but never throw — a cache miss is always acceptable
      console.warn('[Cache] Redis error (cache disabled for this request):', err.message);
    });
  }

  /**
   * Get a cached value by key.
   * Returns null (cache miss) if the key doesn't exist OR if Redis is down.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null; // treat any error as a cache miss, never throw
    }
  }

  /**
   * Set a cache entry with an optional TTL (defaults to this.defaultTTL).
   * Silently swallows errors so callers never need to wrap this in try/catch.
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      await this.client.set(
        key,
        JSON.stringify(value),
        'EX',
        ttlSeconds ?? this.defaultTTL
      );
    } catch {
      // silently skip — cache write failure is never fatal
    }
  }

  /**
   * Delete all keys matching a pattern (e.g. 'admin:users:*' to clear all
   * user query caches when any user's status changes).
   * Uses SCAN instead of KEYS to avoid blocking Redis on large key sets.
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // silently skip
    }
  }

  /** Delete a single key explicitly. */
  async invalidate(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      // silently skip
    }
  }
}

export default new CacheService(60); // 60-second default TTL
