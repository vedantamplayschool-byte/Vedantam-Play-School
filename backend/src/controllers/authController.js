import Admin from '../models/Admin.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { signToken } from '../middleware/auth.js';
import { uploadImage } from '../services/uploadService.js';
import { env } from '../config/env.js';
import { recordLoginAttempt } from '../middleware/auditLog.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: env.nodeEnv === 'production',
  maxAge: env.jwtCookieDays * 24 * 60 * 60 * 1000
};

const adminPublic = admin => ({
  id: admin._id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
  profilePhoto: admin.profilePhoto || '',
  lastLoginAt: admin.lastLoginAt,
  mustChangePassword: admin.mustChangePassword === true
});

export const registerFirstAdmin = asyncHandler(async (req, res) => {
  const count = await Admin.countDocuments();
  if (count > 0) {
    const e = new Error('Admin registration is disabled');
    e.status = 403;
    throw e;
  }
  const admin = await Admin.create(req.body);
  ok(res, {
    status: 201,
    message: 'Initial admin created',
    data: { id: admin._id, name: admin.name, email: admin.email, role: admin.role }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) {
    await recordLoginAttempt({ portal: 'admin', identifier: email, userModel: 'Admin', success: false, reason: 'Invalid email or password', req });
    const e = new Error('Invalid email or password');
    e.status = 401;
    throw e;
  }
  if (!admin.isActive) {
    await recordLoginAttempt({ portal: 'admin', identifier: email, user: admin, userModel: 'Admin', success: false, reason: 'Account deactivated', req });
    const e = new Error('Your account has been deactivated. Contact the principal.');
    e.status = 403;
    throw e;
  }
  admin.lastLoginAt = new Date();
  await admin.save({ validateBeforeSave: false });
  await recordLoginAttempt({ portal: 'admin', identifier: email, user: admin, userModel: 'Admin', success: true, req });
  const token = signToken(admin._id);
  res.cookie('token', token, cookieOptions);
  ok(res, {
    message: 'Logged in successfully',
    data: { token, admin: adminPublic(admin) }
  });
});

export const logout = (req, res) => {
  res.clearCookie('token', cookieOptions);
  ok(res, { message: 'Logged out successfully' });
};

const requireAdmin = async id => {
  const admin = await Admin.findById(id);
  if (!admin || !admin.isActive) {
    const e = new Error('Admin account not found or deactivated');
    e.status = 401;
    throw e;
  }
  return admin;
};

export const me = asyncHandler(async (req, res) => {
  const admin = await requireAdmin(req.admin.id);
  ok(res, { data: { admin: adminPublic(admin) } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const admin = await requireAdmin(req.admin.id);
  admin.name  = req.body.name  ?? admin.name;
  admin.email = req.body.email ?? admin.email;
  await admin.save();
  ok(res, { message: 'Profile updated successfully', data: { admin: adminPublic(admin) } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin.id).select('+password');
  if (!admin || !admin.isActive) {
    const e = new Error('Admin account not found'); e.status = 401; throw e;
  }
  if (!(await admin.comparePassword(req.body.currentPassword))) {
    const e = new Error('Current password is incorrect'); e.status = 400; throw e;
  }
  admin.password = req.body.newPassword;
  if (admin.mustChangePassword) admin.mustChangePassword = false;
  await admin.save();
  ok(res, { message: 'Password changed successfully' });
});

export const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    const e = new Error('Photo file is required'); e.status = 400; throw e;
  }
  const uploaded = await uploadImage(req.file, 'vedantam/admins', req);
  const admin    = await requireAdmin(req.admin.id);
  admin.profilePhoto          = uploaded.url;
  admin.profilePhotoPublicId  = uploaded.publicId || '';
  await admin.save();
  ok(res, { message: 'Profile photo updated', data: { profilePhoto: admin.profilePhoto } });
});
