import Redis from 'ioredis';

export class CacheService {
  private client: Redis | null = null;
  private readonly defaultTTL: number;
  private readonly enabled: boolean;

  constructor(ttlSeconds = 60) {
    this.defaultTTL = ttlSeconds;

    const redisUrl = process.env.REDIS_URL;

    // If REDIS_URL is not set at all, disable cache entirely — no connection
    // attempts, no error logs, zero performance cost for dev environments
    // that don't run Redis.
    if (!redisUrl) {
      this.enabled = false;
      return;
    }

    this.enabled = true;
    this.client  = new Redis(redisUrl, {
      lazyConnect:        true,   // don't connect until first command
      enableOfflineQueue: false,  // fail fast rather than queuing
      maxRetriesPerRequest: 0,    // no retries — treat any failure as a miss
      connectTimeout: 3000,       // give up after 3 seconds
    });

    // Log connection events once — don't spam every failed request
    let warned = false;
    this.client.on('error', (err: Error) => {
      if (!warned) {
        console.warn('[Cache] Redis unavailable — caching disabled:', err.message);
        warned = true;
      }
    });

    this.client.on('connect', () => {
      warned = false; // reset so re-connections are logged
      console.log('[Cache] Redis connected ✅');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.enabled || !this.client) return;
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

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = next;
        if (keys.length > 0) await this.client.del(...keys);
      } while (cursor !== '0');
    } catch {
      // silently skip
    }
  }

  async invalidate(key: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // silently skip
    }
  }
}

export default new CacheService(60);
