# Whisper Link

Secure, one-time secret sharing built with Next.js (App Router) and TypeScript.

Whisper Link lets you encrypt a secret client-side and generate a one-time link that can be opened exactly once (or until TTL) to reveal the secret. The secret ciphertext is stored server-side while the decryption key is only stored in the URL fragment (so it is never sent to the server).

## Features
- Client-side AES-GCM encryption (Web Crypto) so plaintext never leaves the browser.
- One-time links: server stores ciphertext + IV and deletes the record on first retrieval.
- Pluggable storage: Upstash REST Redis support (recommended) with an in-memory fallback for local development.
- Minimal, responsive UI styled by the project's Blueprint D tokens (dark-first theme, Inter font).
- Small, focused components: `SecretViewer`, `Toast`, and a create-secret page.

## Tech stack
- Next.js (App Router)
- React 19 + TypeScript
- CSS + utility classes (see `src/app/globals.css`) — theme tokens live there
- `@upstash/redis` (optional production store) — `lib/redis.ts` wraps the client
- Web Crypto (AES-GCM) via `lib/crypto.ts`

## Quick start (dev)

Prerequisites: Node 18+ and npm.

1. Install dependencies

```cmd
npm install --legacy-peer-deps
```

Note: `--legacy-peer-deps` may be required because some icon packages list peer ranges that don't yet include React 19. This flag tells npm to accept the dependency tree as-is. If you prefer not to use it, remove or pin the conflicting dependency in `package.json` first.

2. Start the dev server

```cmd
npm run dev
```

Open http://localhost:3000 — the root route redirects to `/secret` which is the app entry.

3. Type-check and build

```cmd
npx tsc --noEmit
npm run build
npm start
```

## Environment variables

- `UPSTASH_REDIS_REST_URL` — Upstash REST URL (optional, for production)
- `UPSTASH_REDIS_REST_TOKEN` — Upstash REST token (optional)

If both Upstash environment variables are present the app will use Upstash for storage. Otherwise the app will fall back to an in-memory Map (useful for local development only — not production safe).

## How it works (high level)

1. User enters plaintext on the create page.
2. The browser uses `lib/crypto.ts` (Web Crypto) to generate an AES-GCM key and encrypt the plaintext. The key (exported as base64) is kept client-side.
3. The client sends ciphertext and IV to `POST /api/secret` with a TTL (expiration) value.
4. The server stores ciphertext and IV keyed by a generated token and returns that token.
5. The client constructs a URL in the form `/secret/{token}#{key}` and displays it to the user. The key is stored in the URL fragment so it never gets sent to the server when the link is visited.
6. When a recipient opens the link, the client reads the fragment (the key), fetches ciphertext from `GET /api/secret/{token}`, deletes the record atomically (so it can't be requested again), then decrypts in the browser and displays the plaintext.

This design keeps the plaintext only on clients that hold the fragment key.

## API endpoints

- `POST /api/secret` — store ciphertext
  - Request body: `{ ciphertext: string, iv: string, expiration: string }`
  - Response: `{ token: string }`

- `GET /api/secret/{token}` — atomically retrieve and delete ciphertext
  - Response: `{ ciphertext: string, iv: string }` (200) or 404 if missing/expired

The client-side decryption is handled by `lib/crypto.ts`.

## Redis / Upstash notes

- The repo includes `lib/redis.ts` which uses Upstash REST when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Otherwise it falls back to an in-memory Map useful for local development.
- If you want to use a self-hosted Redis (non-Upstash), you can extend `lib/redis.ts` to add an `ioredis` branch that uses `REDIS_URL`.
- The wrapper exposes a minimal `RedisLike` interface with `get`, `set`, `del`, and a `getdel` helper for atomic get+delete (uses `GETDEL` if available; otherwise does `get` then `del`). For strict atomicity in production prefer a Redis that supports `GETDEL` or use a Lua script.

## Security considerations

- The decryption key is put in the URL fragment — the fragment is never sent to the server by design. However, fragments can be recorded in browser history and client-side logs; treat generated links as sensitive data.
- The server stores only ciphertext + IV and a TTL; if an attacker has access to the server storage they cannot decrypt without the fragment key.
- The in-memory fallback should never be used for production; configure Upstash or a production Redis for persistent, reliable storage.

## Troubleshooting

- `lucide-react` peer dependency errors during `npm install` (React 19 vs peers): run `npm install --legacy-peer-deps` as above.
- Type errors: run `npx tsc --noEmit` to see TypeScript diagnostics.
- Upstash 401/403: ensure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set correctly in your environment.

## Development notes

- UI tokens and global styles are in `src/app/globals.css`.
- `src/components/SecretViewer.tsx` handles fetching/decrypting a token-protected secret.
- `lib/crypto.ts` provides Web Crypto helpers used by the client to encrypt/decrypt.

## Contributing

Contributions welcome. Please open issues or pull requests with small, focused changes. If you add a new storage backend (for example `REDIS_URL` with `ioredis`), include tests and update this README.

## License

MIT — see `LICENSE` (if present) or add one before publishing.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
