---
name: Vedantam Play School architecture
description: How the Vedantam Play School site's hosting split (Render + GitHub Pages) is preserved while running in Replit dev.
---

Production topology: Express/MongoDB backend deployed on Render (`render.yaml` sets `rootDir: backend`, so only the `backend/` folder ships there), static frontend hosted separately on GitHub Pages.

**Why it matters:** In Replit dev, there's no separate static host, so the same Express process needs to serve both the API and the static frontend on one port (5000) for the preview to work — but this must not change production behavior.

**How to apply:**
- `backend/src/app.js` serves the static frontend via `express.static` pointing at the project root (two levels up from `backend/src`). This is additive and a no-op on Render since the frontend files aren't deployed there.
- `js/api-config.js` uses a relative `/api/v1` base URL unless `location.hostname` ends with `github.io`, in which case it falls back to the hardcoded Render URL — this keeps GitHub Pages production behavior identical while making the Replit/local preview work same-origin.
- The `Enquiry` model/`/enquiries` route is admin-only-created (not fed by any public form); the public "Admission" form (`/admissions`) is the one visitors actually submit — don't confuse the two when debugging "enquiry not saving" reports.
- Admin Portal access is deliberately security-by-obscurity via a secret URL path rather than a listed link: never embed that secret path (or any credential/signing secret) in a public/client-side file, even for a "convenience shortcut" — doing so once already leaked one into a tracked config file and defeated the boundary. Keep such values only in real secrets (never `.replit`/env-var files that get committed), and if a hidden-URL scheme is compromised, rotate the secret rather than patching around it.
- When auto-generating credentials for an external party (e.g. parent portal passwords on enrollment), never persist the plaintext anywhere, even behind a "temp password" flag — store only the hash and return the plaintext once in the creation response. A durable "let admin view current temp password later" requirement should be solved without plaintext persistence (e.g. force a fresh reset instead of redisplaying).
