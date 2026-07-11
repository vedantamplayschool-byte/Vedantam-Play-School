import jwt from 'jsonwebtoken';
import Parent from '../models/Parent.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Protect routes that require a logged-in parent.
 * Parent tokens carry `type: 'parent'` in the JWT payload.
 */
export const protectParent = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer '))
    token = req.headers.authorization.split(' ')[1];
  else if (req.cookies?.parent_token)
    token = req.cookies.parent_token;

  if (!token) {
    const e = new Error('Parent authentication required');
    e.status = 401; throw e;
  }

  const decoded = jwt.verify(token, env.jwtSecret);

  if (decoded.type !== 'parent') {
    const e = new Error('Invalid token type'); e.status = 401; throw e;
  }

  const parent = await Parent.findById(decoded.id);
  if (!parent || !parent.isActive || !parent.isPortalActive) {
    const e = new Error('Parent portal access not found or inactive'); e.status = 401; throw e;
  }

  req.parent = parent;
  next();
});

export const signParentToken = id =>
  jwt.sign({ id, type: 'parent' }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
