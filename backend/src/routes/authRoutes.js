import { Router } from 'express';
import { body } from 'express-validator';
import {
  changePassword,
  login,
  logout,
  me,
  registerFirstAdmin,
  updateProfile,
  uploadProfilePhoto
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';

const r = Router();

r.post(
  '/bootstrap',
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 })
  ],
  validate,
  registerFirstAdmin
);

r.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate,
  login
);

r.post('/logout', logout);
r.get('/me', protect, me);

r.patch(
  '/profile',
  protect,
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail()
  ],
  validate,
  updateProfile
);

r.patch(
  '/change-password',
  protect,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 })],
  validate,
  changePassword
);

r.patch('/profile-photo', protect, upload.single('photo'), uploadProfilePhoto);

export default r;
