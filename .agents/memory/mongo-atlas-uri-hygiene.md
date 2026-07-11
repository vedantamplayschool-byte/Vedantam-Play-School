---
name: Mongo Atlas URI hand-entry issues
description: Common ways a hand-retyped MongoDB Atlas connection string breaks the mongodb driver, and a defensive fix.
---

When a user copies/retypes an Atlas connection string manually (e.g. from a screenshot or another host's dashboard), two failure modes recur:

1. **Unsupported query option error** (`MongoParseError: option X is not supported`, sometimes with a mangled key like "app name" instead of "appName") — a query param got a stray space/casing change during retyping.
2. **`bad auth : authentication failed`** even though credentials "look right" — often caused by unencoded special characters (e.g. `@`, `:`) in the password, which break URI parsing since those characters are structural separators in a `mongodb://` URI.

**Why:** Manual transcription (typing from a photo/screenshot, autocorrect, etc.) is unreliable for connection strings, and the driver validates strictly.

**How to apply:** In the DB connection module, defensively sanitize the URI before connecting: percent-encode the username/password portion (find the *last* `@` before the host to split userinfo from host, since the host itself never contains `@`), and drop the query string entirely (none of `retryWrites`/`w`/`appName` are required for the app to function). This makes the app resilient regardless of how the user pastes the string. If `bad auth` persists after this fix, don't keep guessing at typos — ask the user to reset the DB user's password directly in Atlas and copy a fresh connection string via Atlas's own "Connect" button, and confirm the secret form was actually submitted (a plain chat reply describing a new value does NOT update the secret — watch for the "User added or confirmed requested secrets" automatic update before retrying).
