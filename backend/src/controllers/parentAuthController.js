import Parent from '../models/Parent.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { signParentToken } from '../middleware/parentAuth.js';

const COOKIE_OPTS = (days) => ({
  expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
});

/* ── LOGIN ──────────────────────────────────────────────────────────
   Identifier can be: portalEmail, fatherPhone, or motherPhone
   ────────────────────────────────────────────────────────────────── */
export const parentLogin = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    const e = new Error('Please provide identifier and password'); e.status = 400; throw e;
  }

  const id = identifier.toLowerCase().trim();

  // Try portalEmail first, then fatherPhone, then motherPhone
  const parent = await Parent.findOne({
    $or: [
      { portalEmail: id },
      { fatherPhone: id },
      { motherPhone: id }
    ],
    isPortalActive: true,
    isActive: true
  }).select('+password');

  if (!parent || !parent.password) {
    const e = new Error('Parent portal access not activated. Contact school admin.'); e.status = 401; throw e;
  }

  const match = await parent.comparePassword(password);
  if (!match) {
    const e = new Error('Incorrect password'); e.status = 401; throw e;
  }

  parent.lastLoginAt = new Date();
  await parent.save({ validateBeforeSave: false });

  const token = signParentToken(parent._id);
  const jwtCookieDays = Number(process.env.JWT_COOKIE_EXPIRES_DAYS || 7);
  res.cookie('parent_token', token, COOKIE_OPTS(jwtCookieDays));

  const p = parent.toObject();
  delete p.password;

  ok(res, {
    message: 'Login successful',
    data: { token, parent: p, mustChangePassword: parent.mustChangePassword }
  });
});

/* ── LOGOUT ─────────────────────────────────────────────────────── */
export const parentLogout = asyncHandler(async (req, res) => {
  res.cookie('parent_token', '', { expires: new Date(0), httpOnly: true });
  ok(res, { message: 'Logged out successfully' });
});

/* ── ME ─────────────────────────────────────────────────────────── */
export const parentMe = asyncHandler(async (req, res) => {
  const parent = await Parent.findById(req.parent._id)
    .populate('students', 'studentName program section admissionNumber isActive dateOfBirth photoUrl status');
  ok(res, { data: parent });
});

/* ── CHANGE PASSWORD ────────────────────────────────────────────── */
export const changeParentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    const e = new Error('Current and new password are required'); e.status = 400; throw e;
  }
  if (newPassword.length < 6) {
    const e = new Error('New password must be at least 6 characters'); e.status = 400; throw e;
  }

  const parent = await Parent.findById(req.parent._id).select('+password');
  const match  = await parent.comparePassword(currentPassword);
  if (!match) { const e = new Error('Current password is incorrect'); e.status = 401; throw e; }

  parent.password           = newPassword;
  parent.mustChangePassword = false;
  await parent.save();

  ok(res, { message: 'Password changed successfully' });
});
