# Deployment Guide

## Backend on Render Free
1. Create a MongoDB Atlas Free database and copy the connection string.
2. Create a Cloudinary Free account for gallery, teacher, testimonial, event and hero images.
3. In Render, create a Web Service from this repository. Render can read `render.yaml`.
4. Set environment variables from `backend/.env.example`.
5. Confirm `/api/v1/health` returns success.

## Frontend on Vercel
1. Import the repository as a static project.
2. No build command is required.
3. Set the production API base by editing `js/api-config.js` or adding `<meta name="vedantam-api-base" content="https://YOUR-RENDER-APP.onrender.com/api/v1">` before scripts.
4. Add the Vercel domain and custom domain to backend `CLIENT_ORIGINS`.

## Production Checklist
- Replace sitemap and canonical URLs with the final custom domain.
- Bootstrap the first admin, then keep `/auth/bootstrap` unused.
- Use strong JWT secrets and Cloudinary credentials.
- Test all forms and admin CRUD flows after deployment.
