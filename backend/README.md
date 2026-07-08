# Vedantam Play School Backend

Production-ready REST API for the Vedantam Play School website. It is designed for free-tier deployment on Render with MongoDB Atlas Free and Cloudinary Free.

## Stack
- Node.js + Express
- MongoDB Atlas + Mongoose
- JWT admin authentication with bcrypt password hashing
- Helmet, CORS, rate limiting, compression, morgan, cookie-parser
- express-validator request validation and express-mongo-sanitize request sanitization
- Multer + Cloudinary image upload support, with local upload fallback in development
- Centralized error handling and consistent API responses

## Setup
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## Required Environment Variables
- `NODE_ENV` - `development` or `production`
- `PORT` - API port, usually supplied by Render
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - long random signing secret
- `JWT_EXPIRES_IN` - JWT lifetime, for example `7d`
- `JWT_COOKIE_EXPIRES_DAYS` - cookie lifetime in days
- `CLIENT_ORIGINS` - comma-separated frontend origins, for example local dev and Vercel URLs
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - optional but recommended for production image uploads
- `MAX_FILE_SIZE_MB` - image upload size limit

## API Base
`/api/v1`

## Response Shape
```json
{
  "success": true,
  "message": "Success",
  "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 0, "pages": 1 }
}
```

## Public Endpoints
- `GET /health`
- `POST /admissions`
- `POST /contacts`
- `POST /newsletter`
- `GET /gallery`
- `GET /notices`
- `GET /events`
- `GET /teachers`
- `GET /testimonials`
- `GET /hero-slides`

## Protected Admin Endpoints
Create the first admin once with `POST /auth/bootstrap`, then use `POST /auth/login`.
Protected routes require `Authorization: Bearer <token>` or the secure `token` cookie.

- Auth: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- Admins: `GET|POST /admins`, `GET|PUT|PATCH|DELETE /admins/:id`
- Admissions: `GET /admissions`, `GET /admissions/:id`, `PATCH /admissions/:id/status`, `DELETE /admissions/:id`
- Contacts: `GET /contacts`, `GET|PUT|PATCH|DELETE /contacts/:id`
- Newsletter: `GET /newsletter`, `DELETE /newsletter/:id`
- Teachers: `GET|POST /teachers`, `GET|PUT|PATCH|DELETE /teachers/:id`
- Gallery: `GET|POST /gallery`, `GET|PUT|PATCH|DELETE /gallery/:id`
- Events: `GET|POST /events`, `GET|PUT|PATCH|DELETE /events/:id`
- Notices: `GET|POST /notices`, `GET|PUT|PATCH|DELETE /notices/:id`
- Testimonials: `GET|POST /testimonials`, `GET|PUT|PATCH|DELETE /testimonials/:id`
- Hero Slides: `GET|POST /hero-slides`, `GET|PUT|PATCH|DELETE /hero-slides/:id`
- Students: `GET|POST /students`, `GET|PUT|PATCH|DELETE /students/:id`
- Enquiries: `GET|POST /enquiries`, `GET|PUT|PATCH|DELETE /enquiries/:id`

List endpoints support `page`, `limit`, `sort`, `search`, and simple field filters.

## Free Deployment Plan
1. Create a MongoDB Atlas Free cluster and add the connection string to Render.
2. Create a Cloudinary Free account and add the Cloudinary credentials to Render.
3. Deploy `backend` as a Render Free Web Service using build command `npm install` and start command `npm start`.
4. Add the Render API URL to the frontend by defining `window.VEDANTAM_API_BASE` before `js/api-config.js` or by adding a `vedantam-api-base` meta tag.
5. Add the Vercel frontend URL to `CLIENT_ORIGINS`.
