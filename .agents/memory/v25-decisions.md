---
name: v2.5 key decisions
description: Auth separation, print-URL pattern, upload MIME types, and route layout for v2.5 upgrade
---

## Teacher JWT separation
Teacher tokens include `type: 'teacher'` in the payload (signed by `signTeacherToken` in `teacherAuth.js`).
Admin tokens have no `type` field. `protectTeacher` middleware rejects any token without `type === 'teacher'`,
so admin tokens cannot reach teacher-only routes and vice-versa.

**Why:** Prevents privilege confusion without introducing a second secret or breaking existing admin sessions.

**How to apply:** All new teacher-facing routes use `protectTeacher`; admin routes use the existing `protect`.

---

## Print / certificate URL pattern
Certificates and ID cards are server-rendered HTML (no pdfkit). The admin SPA opens them via
`openPrintUrl(apiPath)` — a helper that does `fetch(API + path, { Authorization: Bearer ... })`,
reads the response as text, creates a `Blob` URL, and opens it in a new tab.
`window.open(url_with_?token=...)` is **not** used because query-param tokens appear in server logs
and rely on the auth middleware accepting them.

**Why:** New tabs cannot set Authorization headers. Blob URLs avoid the token-in-URL problem cleanly.

**How to apply:** Any future print/download endpoint in admin.js must use `openPrintUrl()`, not `window.open` with a token query param.

---

## Upload middleware MIME rules
`backend/src/middleware/upload.js` allows PDFs **only** when `file.fieldname` is one of
`['document', 'file', 'attachment']`. All other field names (photo, etc.) remain image-only.

**Why:** Student documents can be PDFs. Cloudinary accepts PDFs; the image-only check was too strict.

**How to apply:** When adding a new document-type upload route, name the multer field `document` (or `file`/`attachment`).

---

## v2.5 route layout
All new routes are mounted in `backend/src/routes/index.js`:
- `/teacher-auth`     → teacherAuthRoutes
- `/teacher-portal`   → teacherPortalRoutes  (teacher-facing)
- `/teacher-checkin`  → checkInRoutes
- `/notifications`    → notificationRoutes
- `/certificates`     → certificateRoutes
- `/qr`               → qrRoutes
- `/teacher-admin`    → adminTeacherPortalRoutes  (admin manages teacher accounts/leaves)

`adminTeacherPortalRoutes` handles: set/revoke teacher portal password, list/approve/reject leave requests,
list all homework. It requires `protect + authorize('super_admin','admin','principal')`.

---

## Check-in/out photo capture is now optional-but-functional
Teacher self check-in/out used to explicitly promise "no photo is ever captured/stored" (privacy stance).
This was changed: if the teacher opens the camera in the UI, a snapshot is captured and uploaded
(multipart) and stored on the attendance record; if the camera is never opened, behavior is unchanged
(JSON-only request, no photo). Both check-in and check-out endpoints accept an optional multipart file
now, falling back to JSON when none is sent.

**Why:** User requested photo-verified check-in as an option without breaking the no-camera flow or
older clients that still POST plain JSON.

**How to apply:** Any future changes to check-in/out must preserve both paths (JSON-only and
multipart-with-photo). Update the on-screen privacy disclaimer text if this policy changes again.

---

## AuditLog / LoginHistory field names
`AuditLog` uses `statusCode` and `adminName` (not `status`/`admin.name` — `admin` is just an ObjectId,
not populated). `LoginHistory` uses `portal`/`identifier`/`success`/`reason`/`ipAddress`. Mismatching
these in frontend rendering fails silently (fields just render blank, no error).
