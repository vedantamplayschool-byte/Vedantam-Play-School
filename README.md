# Vedantam Play School

Production-ready school website with a static frontend, secure Express/MongoDB API, Cloudinary image uploads, and a responsive admin dashboard.

## Features
- Public website with admissions, contact, gallery, notices, events, teachers, testimonials, hero content and newsletter forms.
- Admin dashboard at `/admin.html` with statistics, CRUD management, search, image uploads, status actions and CSV export.
- Security: JWT auth, bcrypt, Helmet, CORS allow-listing, rate limiting, request sanitization, validation and central errors.
- SEO: meta tags, OpenGraph, Twitter cards, JSON-LD, canonical URL, robots.txt and sitemap.xml.

## Local Development
```bash
npm install --prefix backend
cp backend/.env.example backend/.env
npm run backend:dev
python3 -m http.server 5000
```

## First Admin
Call `POST /api/v1/auth/bootstrap` once with `name`, `email`, and `password`, then login through `/admin.html`.

## Deployment
- Backend: Render Free using `render.yaml`.
- Database: MongoDB Atlas Free.
- Images: Cloudinary Free.
- Frontend: Vercel static deployment or GitHub Pages.
- Add your frontend origin to `CLIENT_ORIGINS` and configure the frontend API URL in `js/api-config.js` or via a `vedantam-api-base` meta tag.
