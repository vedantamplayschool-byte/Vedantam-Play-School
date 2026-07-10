# Vedantam Play School — Website + Admin Panel

A modern preschool website with a full-featured admin dashboard. Built with pure HTML/CSS/JS frontend and a Node.js/Express/MongoDB backend.

## Stack

| Layer     | Technology                                         |
|-----------|----------------------------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JS — no frameworks            |
| Admin SPA | `admin.html` + `css/admin.css` + `js/admin.js`     |
| Backend   | Node.js 20 + Express 5 + Mongoose (ESM)            |
| Database  | MongoDB Atlas                                      |
| Media     | Cloudinary (image upload)                          |
| Auth      | JWT (Bearer + HttpOnly cookie) + bcrypt            |
| Hosting   | Render (API) + GitHub Pages / Replit (frontend)    |

## Project Structure

```
index.html              Public website
admin.html              Admin SPA (login → dashboard)
css/
  style.css             Public site styles
  responsive.css        Public site responsive
  admin.css             Admin panel design system
js/
  script.js             Public site JS
  admin.js              Admin SPA logic
  api-config.js         API base URL config (optional override)
images/                 Static images & logo
backend/
  src/
    server.js           Express app entry + bootstrap()
    config/env.js       Environment variable config
    models/             Mongoose models (Admin, Settings, …)
    controllers/        Route handlers
    routes/             API route definitions
    middleware/         auth, upload, validate, error
    services/           uploadService (Cloudinary)
    utils/              asyncHandler, apiResponse
```

## API Base URL Configuration

The admin SPA reads the API endpoint from (in priority order):
1. `window.VedantamAPIConfig.baseUrl` — set this in `js/api-config.js`
2. Falls back to `http://localhost:5000/api/v1`

For production, create/update `js/api-config.js`:
```js
window.VedantamAPIConfig = { baseUrl: 'https://your-render-app.onrender.com/api/v1' };
```
and include it **before** `admin.js` in `admin.html`.

## Admin v2.0 — Key Features

- **Secure JWT auth** — login, force-password-change on first login, remember-me
- **Role system** — `super_admin`, `admin`, `principal`, `office_staff`, `teacher`
- **Auto-bootstrap** — first admin created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars
- **Dashboard** — 8 stat cards, activity feed, recent admissions, quick actions
- **CRUD resources** — Students, Admissions, Enquiries, Gallery, Teachers, Events, Notices, Hero Slides, Testimonials, Newsletter, Contact Messages
- **Settings** — school info, social links, logo upload
- **Profile** — photo upload, name/email edit, change password

## Running Locally

```
npx serve -l 5000 .
```
Then open `http://localhost:5000` (public site) or `http://localhost:5000/admin.html`.

Backend:
```
cd backend && npm install && npm run dev
```

## Environment Variables (backend)

| Variable             | Required | Purpose                        |
|----------------------|----------|--------------------------------|
| `MONGODB_URI`        | ✅       | MongoDB Atlas connection string |
| `JWT_SECRET`         | ✅       | JWT signing secret              |
| `CLOUDINARY_NAME`    | ✅       | Cloudinary cloud name           |
| `CLOUDINARY_KEY`     | ✅       | Cloudinary API key              |
| `CLOUDINARY_SECRET`  | ✅       | Cloudinary API secret           |
| `ADMIN_EMAIL`        | ✅       | Seed admin email                |
| `ADMIN_PASSWORD`     | ✅       | Seed admin password             |
| `SESSION_SECRET`     | optional | Express session secret          |
| `NODE_ENV`           | optional | `production` for secure cookies |
| `PORT`               | optional | Default 5000                    |

## Design Theme

| Token      | Hex       | Usage                         |
|------------|-----------|-------------------------------|
| Green      | `#5FBF3A` | Primary, CTAs, nav active     |
| Sky Blue   | `#27A9E1` | Secondary accents             |
| Orange     | `#F9A825` | Highlights, badges            |
| Purple     | `#8E44AD` | Accent variety                |

Font: **Nunito** (Google Fonts CDN) — public site  
Icons: **Material Icons Round** (Google CDN) — admin panel

## User Preferences

- Pure HTML/CSS/JS only — no React, Bootstrap, Tailwind, jQuery, or any framework
- Colors: Green `#5FBF3A`, Sky Blue `#27A9E1`, Orange `#F9A825`, Purple `#8E44AD`
- Font: Nunito (Google Fonts)
- Existing public API routes must never break — all admin changes are additive
