# ScholarsCrib — frontend

The Next.js app for ScholarsCrib (WAEC, JAMB and NECO exam prep). It is a pure
client of the FastAPI backend, which owns auth, the database, scoring, study
plans, billing and push delivery. Nothing here talks to a database or holds a
backend secret.

## Getting started

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example`. All of them are safe to expose to the browser except
`API_URL`, which only the server reads.

| Variable | Purpose |
|---|---|
| `API_URL` | Backend base URL for server components, no trailing slash. Defaults to `https://scholarscrib-backend.onrender.com` in production and `http://localhost:8000` in development. |
| `NEXT_PUBLIC_API_URL` | Backend base URL for the browser. Same as `API_URL` unless proxied. |
| `NEXT_PUBLIC_APP_URL` | This app's public URL, used for canonical links and the sitemap. |
| `NEXT_PUBLIC_BILLING_ENABLED` | `"true"` shows checkout. |
| `NEXT_PUBLIC_PUSH_ENABLED` | `"true"` offers push notifications. Also needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, the backend's public VAPID key. |

## How the code is organised

- `src/app` — routes. Server components load data from the backend.
- `src/lib/api` — the two transports: `server.ts` (server components; reads the
  token cookie) and `client.ts` (browser; attaches the bearer token).
- `src/lib` — loaders that map backend responses onto page shapes, plus display
  helpers, labels and client-side form validation.
- `src/types` — shapes the backend sends that the UI renders.
- `src/stores` — Zustand stores for client-only UI state. See
  `src/stores/README.md` for the rules.
- `src/components` — UI.

## Scripts

- `npm run dev` / `npm run build` / `npm start`
- `npm run lint`
- `npm test` — runs every `scripts/test-*.mts`
- `npm run typecheck:tests` — type-checks the tests
