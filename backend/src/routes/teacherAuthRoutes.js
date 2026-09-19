import { Router }             from 'express';
import { protectTeacher }     from '../middleware/teacherAuth.js';
import { upload }             from '../middleware/upload.js';
import rateLimit              from 'express-rate-limit';
import {
  teacherLogin, teacherLogout, teacherMe,
  updateTeacherProfile, changeTeacherPassword, uploadTeacherPhoto
} from '../controllers/teacherAuthController.js';

const r = Router();

r.post('/login',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { success: false, message: 'Too many login attempts' } }),
  teacherLogin
);

r.post('/logout', teacherLogout);

r.use(protectTeacher);
r.get('/me',                       teacherMe);
r.put('/profile',                  updateTeacherProfile);
r.put('/change-password',          changeTeacherPassword);
r.patch('/photo', upload.single('photo'), uploadTeacherPhoto);

export default r;
