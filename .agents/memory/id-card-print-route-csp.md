---
name: ID card / print-route CSP scoping
description: Standalone print pages (Cloudinary <img>, inline window.print()) get silently broken by app-wide helmet CSP; fix per-route, not globally.
---

Any server-rendered "print this page" HTML (ID cards, receipts, certificates) that
uses an inline `<script>` (e.g. `window.onload = () => window.print()`) or loads
images from an external host (e.g. Cloudinary) will be silently broken by a
global `helmet()` CSP (`script-src 'self'`, `img-src 'self' data:'`) — the photo
never loads and auto-print never fires, with no visible error except in the
browser console.

**Why:** discovered while wiring a redesigned ID card template into the live
`/qr/:id/id-card` route — the design was correct but photos and auto-print
silently failed under the app's default helmet policy. A `<meta http-equiv="Content-Security-Policy">`
tag on the page does NOT override a stricter CSP already sent as an HTTP
response header; browsers enforce the intersection of both, not the more
permissive one. Only changing the actual response header works.

**How to apply:** don't loosen the global helmet CSP. Add a small route-only
middleware that calls `res.setHeader('Content-Security-Policy', ...)` with a
relaxed policy (allow the specific external image host, `'unsafe-inline'` for
script/style) and mount it only on the specific print routes, right before the
handler.
