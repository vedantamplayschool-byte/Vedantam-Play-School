# Vedantam Play School Backend

Production-ready REST API for the Vedantam Play School website.

## Stack
- Node.js + Express
- MongoDB Atlas + Mongoose
- JWT admin authentication with bcrypt password hashing
- Helmet, CORS, rate limiting, compression, morgan, cookie-parser
- express-validator request validation
- Multer + Cloudinary image upload support
- Centralized error handling and consistent API responses

## Setup
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Required environment variables:
- `MONGODB_URI` MongoDB Atlas connection string
- `JWT_SECRET` long random signing secret
- `CLIENT_ORIGINS` comma-separated frontend origins
- Cloudinary variables for image uploads

## API Base
`/api/v1`

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

## Admin Endpoints
Create the first admin once with `POST /auth/bootstrap`, then use `POST /auth/login`.
Protected routes require `Authorization: Bearer <token>` or the secure `token` cookie.

Admin CRUD is available for admissions, contacts, newsletter, gallery, notices, events, teachers, testimonials, hero slides, students and enquiries.

## Response Shape
```json
{
  "success": true,
  "message": "Success",
  "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 0, "pages": 1 }
}
```
