import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  studentQR, teacherQR, studentIdCard, teacherIdCard
} from '../controllers/qrController.js';

const r = Router();
r.use(protect);

/* The id-card routes render a standalone print page (photo <img> from
   Cloudinary + an inline window.print() trigger). The app-wide helmet
   CSP (img-src 'self' data:, script-src 'self') blocks both, so these
   two routes get a scoped, relaxed CSP instead of loosening it globally. */
const idCardCsp = (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https://res.cloudinary.com; " +
    "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com;"
  );
  next();
};

r.get('/student/:id',          studentQR);
r.get('/teacher/:id',          teacherQR);
r.get('/student/:id/id-card',  idCardCsp, studentIdCard);
r.get('/teacher/:id/id-card',  idCardCsp, teacherIdCard);

export default r;
