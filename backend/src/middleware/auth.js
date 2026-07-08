import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.split(' ')[1];
  else if (req.cookies?.token) token = req.cookies.token;
  if (!token) { const e = new Error('Authentication required'); e.status = 401; throw e; }
  const decoded = jwt.verify(token, env.jwtSecret);
  const admin = await Admin.findById(decoded.id);
  if (!admin || !admin.isActive) { const e = new Error('Admin account not found or inactive'); e.status = 401; throw e; }
  req.admin = admin;
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.admin?.role)) { const e = new Error('You do not have permission to perform this action'); e.status = 403; return next(e); }
  return next();
};

export const signToken = id => jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
