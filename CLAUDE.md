# Nathan's Decision Maker — Claude Code Guide

## Project Overview
A React/Vite app deployed to **gameonsolutions.uk/nathan** via Cloudflare Pages.
Nathan is 18, extremely indecisive, and needs an AI-powered spinning wheel + day plan to sort his life out.

The Groq API is called **server-side** via a Cloudflare Pages Function (`functions/api/plan.js`) to keep the API key secret.

## Tech Stack
- **Frontend**: React 18 + Vite
- **Styling**: Plain CSS (single stylesheet, no frameworks)
- **API proxy**: Cloudflare Pages Functions (`functions/` directory)
- **AI**: Groq (`llama-3.3-70b-versatile`)
- **Deployment**: Cloudflare Pages → gameonsolutions.uk/nathan
- **Base path**: `/nathan/` (configured in vite.config.js and index.html)

## Project Structure
```
nathan-app/
├── CLAUDE.md
├── package.json
├── vite.config.js
├── wrangler.toml
├── index.html
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── App.css
│   └── components/
│       └── SpinWheel.jsx
├── functions/
│   └── api/
│       └── plan.js         ← Cloudflare Pages Function (Groq proxy)
├── .env.example
└── .gitignore
```

## Local Development
```bash
npm install
npm run dev              # Vite dev server on http://localhost:5173/nathan/
```

For local dev with the Pages Function (Groq proxy):
```bash
npm run preview:pages    # Uses wrangler pages dev
```
You must set `GROQ_API_KEY` in `.dev.vars` (see `.env.example`) for local Pages Function testing.

## Environment Variables / Secrets
| Name | Where | Description |
|------|--------|-------------|
| `GROQ_API_KEY` | Cloudflare Pages → Settings → Environment Variables (Secret) | Your Groq API key |

**Never commit `.dev.vars` or any file containing the real API key.**

## Deployment to gameonsolutions.uk/nathan

### First-time setup
1. Push this repo to GitHub (e.g. `gameonsolutions/nathan-app`)
2. In Cloudflare Dashboard → Pages → Create a project → Connect to Git
3. Build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Add `GROQ_API_KEY` as a secret environment variable
5. Deploy — this creates `nathan-app.pages.dev`

### Routing gameonsolutions.uk/nathan → this Pages project
In the Cloudflare Dashboard for the **gameonsolutions.uk zone**:

**Option A — Transform Rules (recommended)**
1. Go to Rules → Transform Rules → URL Rewrites
2. Create rule:
   - **If**: URI Path starts with `/nathan`
   - **Then**: Rewrite to → Dynamic → `concat("/", substring(http.request.uri.path, 8))`
   - **Hostname**: Rewrite to `nathan-app.pages.dev`
   > Note: This requires an **Enterprise** plan or you use a Worker instead.

**Option B — Cloudflare Worker route (works on all plans)**
Deploy a tiny Worker that proxies `/nathan/*` traffic to the Pages project:
```js
// worker: gameonsolutions-router
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/nathan')) {
      const target = new URL(request.url);
      target.hostname = 'nathan-app.pages.dev';
      return fetch(new Request(target.toString(), request));
    }
    return fetch(request);
  }
}
```
Add route `gameonsolutions.uk/nathan*` to this Worker in the dashboard.

**Option C — Custom Domain on Pages project (simplest)**
In the Pages project settings → Custom Domains → Add `nathan.gameonsolutions.uk`
Then add a DNS CNAME `nathan → nathan-app.pages.dev` in the gameonsolutions.uk zone.
This gives `nathan.gameonsolutions.uk` rather than `gameonsolutions.uk/nathan`.

## Key Business Rules (DO NOT CHANGE)
- The first wheel segment is **always** `"Check Jamie has Coca Cola and go to Simon's 🥤"` — hardcoded, never AI-generated
- Groq model: `llama-3.3-70b-versatile`
- The API always returns 7 wheel options (first is prepended client-side, so Groq returns 7, total wheel = 8)
- British English throughout

## Groq API Call (Pages Function)
`POST /api/plan` — accepts `{ interests: string, goals: string }`, returns `{ plan: string, wheelOptions: string[] }`

## Common Tasks

### Change the Groq model
Edit `functions/api/plan.js` → `model` field.

### Add more wheel segments
Change the `slice(0, 7)` in `App.jsx` and update the Groq prompt to request more options.

### Update the mandatory first option text
Edit the `MANDATORY_FIRST` constant in `src/App.jsx`.

### Styling changes
All styles are in `src/App.css`. Fonts loaded via Google Fonts in `index.html`.
