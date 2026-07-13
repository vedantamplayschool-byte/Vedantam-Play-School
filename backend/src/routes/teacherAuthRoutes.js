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
// Password change is admin-only — teachers use the password given by admin
r.put('/change-password', (req, res) => {
  res.status(403).json({ success: false, message: 'Password can only be changed by the school admin. Please contact admin to reset your password.' });
});
r.patch('/photo', upload.single('photo'), uploadTeacherPhoto);

export default r;
