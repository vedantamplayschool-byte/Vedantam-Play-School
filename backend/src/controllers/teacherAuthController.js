import Teacher from '../models/Teacher.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { signTeacherToken } from '../middleware/teacherAuth.js';
import { uploadImage } from '../services/uploadService.js';
import { recordLoginAttempt } from '../middleware/auditLog.js';

const COOKIE_OPTS = (days) => ({
  expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
});

/* ── LOGIN ────────────────────────────────────────────────────────── */
export const teacherLogin = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;
  if (!password || (!email && !phone)) {
    const e = new Error('Please provide credentials and password'); e.status = 400; throw e;
  }

  const identifier = email || phone;
  const query = email ? { email: email.toLowerCase().trim() } : { phone: phone.trim() };
  const teacher = await Teacher.findOne({ ...query, isActive: true }).select('+password');

  if (!teacher || !teacher.password) {
    await recordLoginAttempt({ portal: 'teacher', identifier, userModel: 'Teacher', success: false, reason: 'Portal access not activated', req });
    const e = new Error('Teacher portal access not activated for this account. Contact admin.'); e.status = 401; throw e;
  }

  const match = await teacher.comparePassword(password);
  if (!match) {
    await recordLoginAttempt({ portal: 'teacher', identifier, user: teacher, userModel: 'Teacher', success: false, reason: 'Incorrect password', req });
    const e = new Error('Incorrect password'); e.status = 401; throw e;
  }

  teacher.lastLoginAt = new Date();
  await teacher.save({ validateBeforeSave: false });
  await recordLoginAttempt({ portal: 'teacher', identifier, user: teacher, userModel: 'Teacher', success: true, req });

  const token = signTeacherToken(teacher._id);
  const jwtCookieDays = Number(process.env.JWT_COOKIE_EXPIRES_DAYS || 7);
  res.cookie('teacher_token', token, COOKIE_OPTS(jwtCookieDays));

  // Strip password from response
  const t = teacher.toObject();
  delete t.password;

  ok(res, {
    message: 'Login successful',
    data: { token, teacher: t, mustChangePassword: teacher.mustChangePassword }
  });
});

/* ── LOGOUT ──────────────────────────────────────────────────────── */
export const teacherLogout = asyncHandler(async (req, res) => {
  res.cookie('teacher_token', '', { expires: new Date(0), httpOnly: true });
  ok(res, { message: 'Logged out successfully' });
});

/* ── ME ──────────────────────────────────────────────────────────── */
export const teacherMe = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.teacher._id);
  ok(res, { data: teacher });
});

/* ── UPDATE PROFILE ──────────────────────────────────────────────── */
export const updateTeacherProfile = asyncHandler(async (req, res) => {
  const allowed = ['phone', 'address', 'bloodGroup', 'emergencyContact', 'subjects', 'notes', 'dateOfBirth'];
  const payload = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) payload[k] = req.body[k]; });

  const doc = await Teacher.findByIdAndUpdate(req.teacher._id, payload, { new: true, runValidators: true });
  ok(res, { message: 'Profile updated', data: doc });
});

/* ── CHANGE PASSWORD ─────────────────────────────────────────────── */
export const changeTeacherPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    const e = new Error('Current and new password are required'); e.status = 400; throw e;
  }
  if (newPassword.length < 6) {
    const e = new Error('New password must be at least 6 characters'); e.status = 400; throw e;
  }

  const teacher = await Teacher.findById(req.teacher._id).select('+password');
  const match = await teacher.comparePassword(currentPassword);
  if (!match) { const e = new Error('Current password is incorrect'); e.status = 401; throw e; }

  teacher.password = newPassword;
  teacher.mustChangePassword = false;
  await teacher.save();

  ok(res, { message: 'Password changed successfully' });
});

/* ── UPLOAD PHOTO ────────────────────────────────────────────────── */
export const uploadTeacherPhoto = asyncHandler(async (req, res) => {
  if (!req.file) { const e = new Error('Photo file required'); e.status = 400; throw e; }
  const uploaded = await uploadImage(req.file, 'vedantam/teacher-photos', req);
  const doc = await Teacher.findByIdAndUpdate(
    req.teacher._id,
    { photoUrl: uploaded.url, photoPublicId: uploaded.publicId },
    { new: true }
  );
  ok(res, { message: 'Photo updated', data: { photoUrl: doc.photoUrl } });
});
