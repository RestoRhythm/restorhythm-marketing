# restorhythm.com — Standalone Marketing Site (RR-045 fallback)

Self-contained static website for the canonical public domain
`https://restorhythm.com`. Zero build step, zero backend, zero
dependencies — plain HTML/CSS/JS that can be hosted anywhere
(Emergent "Landing Page" app via GitHub import, Cloudflare Pages,
Netlify, Vercel, S3…).

The application (auth, Reserve, billing, /internal, booking pages)
lives permanently on the separate deployment `https://app.restorhythm.com`
and is NOT part of this site.

## Contents

| Path | Purpose |
|---|---|
| `index.html` | Homepage — prerendered from the approved RR-032/RR-035 design |
| `product/reserve/index.html` | Reserve product page (the only product page in scope) |
| `robots.txt` | Allows only `/` + `/product/reserve` (+ assets) |
| `sitemap.xml` | Exactly the two indexable URLs |
| `assets/site.js` | Mobile nav, smooth scroll, Apps menu, demo-form handler |
| `brand/`, `images/`, favicons | Copied from the app's `frontend/public/` |
| `tools/regenerate.py` | Re-captures the pages from the running React app |

## Hard-wired architecture decisions

- Canonical URLs, OG URLs, JSON-LD all use `https://restorhythm.com`.
- App CTAs point to the app deployment:
  - Sign in → `https://app.restorhythm.com/login`
  - Sign up / Get Started → `https://app.restorhythm.com/register`
  - Launch Reserve → `https://app.restorhythm.com/modules/reserve`
  - Footer Dashboard → `https://app.restorhythm.com/dashboard`
- The demo form posts to `https://app.restorhythm.com/api/demo-requests`
  (CORS on the app already allows `https://restorhythm.com`).
- The Pass / Shift / Prep / Hospitality Refined links point at
  `/#products` — those pages are intentionally NOT in this deployment
  or the sitemap until approved as live marketing pages.

## Regenerating after design/copy changes in the main app

From the main app repo, with the frontend dev server running:

```bash
pip install playwright beautifulsoup4 && python3 -m playwright install chromium
python3 tools/regenerate.py
```

This re-renders `/` and `/product/reserve` from the React app and
rewrites the static files in place (links, JSON-LD, assets included).

## Deployment (Emergent)

1. Push this folder to its own GitHub repository.
2. Emergent home → connect GitHub → import that repository → app type
   **Landing Page** → deploy.
3. Manage Publishing → Domain → link `restorhythm.com` (apex) and add
   the DNS records the panel shows (platform-documented values:
   `A @ 162.159.142.117`, `A @ 172.66.2.113`, `CNAME www → restorhythm.com`
   — always confirm against what the panel displays).
4. Enable **Root Domain Redirection** (default www → apex) once verified.
5. Google Search Console: verify the `restorhythm.com` domain property
   (DNS TXT token from Google), submit `https://restorhythm.com/sitemap.xml`.
