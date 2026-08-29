/**
 * OOP Infrastructure Layer: RedisCacheAdapter
 * Simulates a high-performance Redis cache with TTL, LRU eviction, and keyspace invalidation.
 */

export interface CacheOptions {
  ttlSeconds?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keysCount: number;
  hitRatio: string;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
  lastAccessed: number;
}

export class RedisCacheAdapter {
  private cache = new Map<string, CacheEntry<any>>();
  private maxKeys: number;
  private defaultTTL: number; // in seconds
  private hits = 0;
  private misses = 0;

  constructor(maxKeys = 1000, defaultTTL = 300) {
    this.maxKeys = maxKeys;
    this.defaultTTL = defaultTTL;
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.lastAccessed = Date.now();
    this.hits++;
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ?? this.defaultTTL;
    const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;

    if (this.cache.size >= this.maxKeys && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt,
      lastAccessed: Date.now(),
    });
  }

  public del(key: string): void {
    this.cache.delete(key);
  }

  public invalidatePattern(pattern: string): void {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  public getStats(): CacheStats {
    const total = this.hits + this.misses;
    const ratio = total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0%';
    return {
      hits: this.hits,
      misses: this.misses,
      keysCount: this.cache.size,
      hitRatio: ratio,
    };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// Global Singleton Instance for BIB Logistics Application
export const redisCache = new RedisCacheAdapter(500, 180); // 500 keys max, 3-minute default TTL
