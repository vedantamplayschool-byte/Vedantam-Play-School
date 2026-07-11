import jwt from 'jsonwebtoken';
import Teacher from '../models/Teacher.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Protect routes that require a logged-in teacher.
 * Teacher tokens carry `type: 'teacher'` in the JWT payload,
 * which distinguishes them from admin tokens.
 */
export const protectTeacher = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer '))
    token = req.headers.authorization.split(' ')[1];
  else if (req.cookies?.teacher_token)
    token = req.cookies.teacher_token;

  if (!token) {
    const e = new Error('Teacher authentication required');
    e.status = 401; throw e;
  }

  const decoded = jwt.verify(token, env.jwtSecret);

  // Ensure this is a teacher token, not an admin token
  if (decoded.type !== 'teacher') {
    const e = new Error('Invalid token type'); e.status = 401; throw e;
  }

  const teacher = await Teacher.findById(decoded.id).select('+password');
  if (!teacher || !teacher.isActive) {
    const e = new Error('Teacher account not found or inactive'); e.status = 401; throw e;
  }

  req.teacher = teacher;
  next();
});

export const signTeacherToken = id =>
  jwt.sign({ id, type: 'teacher' }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
