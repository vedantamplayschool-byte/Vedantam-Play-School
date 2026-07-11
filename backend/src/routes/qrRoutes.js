import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  studentQR, teacherQR, studentIdCard, teacherIdCard
} from '../controllers/qrController.js';

const r = Router();
r.use(protect);

r.get('/student/:id',          studentQR);
r.get('/teacher/:id',          teacherQR);
r.get('/student/:id/id-card',  studentIdCard);
r.get('/teacher/:id/id-card',  teacherIdCard);

export default r;
