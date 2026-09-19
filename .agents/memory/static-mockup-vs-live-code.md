---
name: Static design mockups can be disconnected from live code
description: A polished HTML file in the repo (e.g. under a design-preview folder) is not proof a feature was shipped — always check what the live route/controller actually renders.
---

A repo can contain a fully-built, good-looking static HTML mockup (hardcoded
example data, no wiring to the backend) that looks like a finished feature but
was never actually integrated into the live code path. The real controller/route
can still be running an older, simpler design with real data.

**Why:** found an "ID card redesign" that the user believed was already built —
it existed only as a standalone preview file with fake data, while the live
`/qr/:id/id-card` route still rendered the old design. This is why a previously
"completed" redesign appeared to never show up in the app.

**How to apply:** when a user says a previous design change "isn't showing up"
or "didn't take effect," don't assume the code is broken — check whether the
polished version actually lives in the code path the running route/controller
executes, or if it's an orphaned preview/mockup file that needs to be ported in.
