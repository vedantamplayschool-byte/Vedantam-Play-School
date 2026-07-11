# Vedantam Play School — School Management ERP v3.0

## Overview
Full-featured MERN-stack school management system for Vedantam Play School. The Express backend serves the static HTML/JS/CSS frontend from the repository root. Production-ready with JWT authentication, MongoDB Atlas, and Cloudinary media storage.

## Architecture
- **Backend:** Node.js + Express (ESM modules) in `backend/`
- **Frontend:** Static HTML/JS/CSS served from repository root
- **Database:** MongoDB Atlas (via `MONGODB_URI` secret)
- **Media:** Cloudinary (via `CLOUDINARY_*` secrets)
- **Auth:** JWT cookies — `token` (admin), `teacher_token` (teacher), `parent_token` (parent)

## Running the Application
```bash
cd backend && npm start
```
The app runs on port 5000. The workflow "Start application" manages this.

## Portals
| Portal | URL | Auth |
|--------|-----|------|
| Public Website | `/` | None |
| Admin ERP | `/admin.html` | Admin JWT (`token`) |
| Teacher Portal | `/teacher.html` | Teacher JWT (`teacher_token`) |
| Parent Portal | `/parent.html` | Parent JWT (`parent_token`) |

## Key Features (v3.0 Enterprise)

### Core ERP (v2.0)
- Student management (admission, profiles, documents)
- Parent records with parent portal auth fields
- Fee management with receipts and payment tracking
- Attendance (student and teacher)
- Reports and analytics
- Academic session management
- CMS: gallery, notices, events, testimonials, hero slides

### Teacher Portal (v2.5)
- Teacher authentication (JWT, force-change-password)
- Self check-in/out with GPS and device info
- Homework assignment
- Leave requests with admin approval
- Notifications system
- Certificates with QR codes

### Parent Portal (v3.0 NEW)
- Secure parent login (via email, father phone, or mother phone)
- View children: profiles, photos, class details
- Real-time attendance history
- Homework by child/class
- Fee details and payment history
- School notices and events
- Gallery access
- Force-change-password on first login
- Admin management: activate/deactivate/reset parent portal access

### Storage Monitor (v3.0 NEW)
- MongoDB Atlas usage: `dbStats` — used/free MB, collections, documents, indexes
- Cloudinary usage via API
- Color-coded health levels: ok / caution / warning / danger / critical
- Capacity estimator: students/teachers/records remaining, estimated months to limit
- Per-collection breakdown
- Smart recommendations

### Archive Manager (v3.0 NEW)
- Export collections to JSON/Excel/CSV and download
- Optional: delete archived records from DB and Cloudinary
- `ArchiveManifest` model tracks all archive events
- Admin: list archives, see deletion state

### Backup & Export (v3.0 NEW)
- One-click CSV reports: students, admissions, fees, teachers, attendance
- Quick JSON exports of any collection via Archive API

## API Route Groups
| Prefix | Purpose |
|--------|---------|
| `/api/v1/auth` | Admin authentication |
| `/api/v1/teacher-auth` | Teacher authentication |
| `/api/v1/parent-auth` | Parent authentication |
| `/api/v1/teacher-portal` | Teacher portal data |
| `/api/v1/parent-portal` | Parent portal data (read-only) |
| `/api/v1/teacher-admin` | Admin → teacher portal management |
| `/api/v1/admin-parent-portal` | Admin → parent portal management |
| `/api/v1/storage` | Storage health stats |
| `/api/v1/archive` | Archive create/list/purge |
| `/api/v1/students` | Student CRUD |
| `/api/v1/parents` | Parent CRUD |
| `/api/v1/fees` | Fee records |
| `/api/v1/attendance` | Student attendance |
| `/api/v1/reports` | CSV/data exports |

## Secrets Required
- `MONGODB_URI` — MongoDB Atlas connection string (configured)
- `JWT_SECRET` — shared JWT signing secret, auto-generated on setup (configured)
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — Cloudinary media storage (configured)
- `SESSION_SECRET` — present but currently unused by backend code

## Setup Status (July 2026 re-import)
- Dependencies installed via `npm install --prefix backend`.
- All required secrets configured; "Start application" workflow boots cleanly, connects to MongoDB, and serves the site + `/admin.html`.
- An admin account already exists in the connected database, so the JWT/bootstrap flow was skipped — log in with existing admin credentials at `/admin.html`.

## User Preferences
- Existing APIs and collections must never be removed — all changes are additive
- Parent portal is read-only (no uploads, no edits from parents)
- Portal login identifier for parents: email OR father phone OR mother phone
- Admin must explicitly activate parent portal per family (`isPortalActive: true`)
