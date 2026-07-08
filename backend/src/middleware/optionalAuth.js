import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { env } from '../config/env.js';

export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.split(' ')[1];
    else if (req.cookies?.token) token = req.cookies.token;
    if (!token) return next();
    const decoded = jwt.verify(token, env.jwtSecret);
    const admin = await Admin.findById(decoded.id);
    if (admin?.isActive) req.admin = admin;
  } catch {}
  next();
};
