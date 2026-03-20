import Redis from "ioredis";

// Provide a small fallback in-memory store for local development when REDIS_URL
// is not provided. This prevents ioredis from emitting unhandled errors and
// makes the dev experience smoother.
type RedisLike = {
  get(key: string): Promise<string | null>;
  getdel?(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK' | null>;
};

// Export a single `redis` binding. We'll assign one of two implementations below.
let _redis: unknown;

if (process.env.REDIS_URL) {
  const client = new Redis(process.env.REDIS_URL);
  client.on("error", (err) => {
    console.error("Redis error:", err);
  });
  _redis = client;
} else {
  // In-memory fallback.
  const store = new Map<string, { value: string; expiresAt: number | null }>();

  const redisFallback: RedisLike = {
    async get(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key: string, value: string, mode?: string, ttl?: number) {
      let expiresAt: number | null = null;
      if (mode === "EX" && typeof ttl === "number") {
        expiresAt = Date.now() + ttl * 1000;
      }
      store.set(key, { value, expiresAt });
      return "OK";
    }
  };

  // Add getdel implementation as used by the app route (atomic get+delete)
  (redisFallback as RedisLike & { getdel?: (k: string) => Promise<string | null> }).getdel = async (key: string) => {
    const v = await redisFallback.get(key);
    if (v !== null) store.delete(key);
    return v;
  };

  _redis = redisFallback;
}

export const redis = _redis as RedisLike;