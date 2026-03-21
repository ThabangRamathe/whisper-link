import { Redis as UpstashRedis } from "@upstash/redis";

// Provide a small fallback in-memory store for local development when Upstash
// credentials are not provided. This keeps the dev experience simple and
// prevents the app from requiring an external Redis during local runs.
type RedisLike = {
  get(key: string): Promise<string | null>;
  getdel?(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK' | null>;
  del?(key: string): Promise<number>;
};

let _redis: RedisLike;

// Prefer Upstash when environment variables are present. Use the REST
// credentials: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.log("Using Upstash Redis client");
  const client = new UpstashRedis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const wrapper: RedisLike & { getdel?: (k: string) => Promise<string | null> } = {
    async get(key: string) {
      const v = await client.get(key);
      return v === null || v === undefined ? null : String(v);
    },
    async set(key: string, value: string, mode?: string, ttl?: number) {
      // upstash `set` accepts options like { ex: seconds }
      if (mode === "EX" && typeof ttl === "number") {
        const res = await client.set(key, value, { ex: ttl });
        return res ? "OK" : null;
      }
      const res = await client.set(key, value);
      return res ? "OK" : null;
    },
    async del(key: string) {
      const res = await client.del(key);
      // client.del returns number of deleted keys
      return typeof res === "number" ? res : Number(res);
    }
  };

  // Try to use GETDEL if the client exposes it; otherwise fall back to a
  // get+del sequence (not strictly atomic on remote Redis, but Upstash REST
  // may not expose GETDEL directly).
  if ((client as UpstashRedis).getdel) {
    wrapper.getdel = async (key: string) => {
      const v = await (client as UpstashRedis).getdel(key);
      return v === null || v === undefined ? null : String(v);
    };
  } else {
    wrapper.getdel = async (key: string) => {
      const v = await wrapper.get(key);
      if (v !== null) await client.del(key);
      return v;
    };
  }

  _redis = wrapper;
} else {
  console.log("Using in-memory Redis fallback");
  // In-memory fallback for local development (same shape as before).
  const store = new Map<string, { value: string; expiresAt: number | null }>();

  const redisFallback: RedisLike & { getdel?: (k: string) => Promise<string | null> } = {
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
    },
    async del(key: string) {
      return store.delete(key) ? 1 : 0;
    }
  };

  redisFallback.getdel = async (key: string) => {
    const v = await redisFallback.get(key);
    if (v !== null) store.delete(key);
    return v;
  };

  _redis = redisFallback;
}

export const redis = _redis as RedisLike;