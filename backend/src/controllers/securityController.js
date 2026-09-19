import LoginHistory from '../models/LoginHistory.js';
import AuditLog from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { paginate } from '../utils/apiFeatures.js';

export const listLoginHistory = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.portal) filter.portal = req.query.portal;
  if (req.query.success !== undefined) filter.success = req.query.success === 'true';
  const { items, pagination } = await paginate(LoginHistory, filter, { ...req.query, sort: req.query.sort || '-createdAt' });
  ok(res, { data: items, pagination });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.admin) filter.admin = req.query.admin;
  if (req.query.method) filter.method = req.query.method.toUpperCase();
  const { items, pagination } = await paginate(AuditLog, filter, { ...req.query, sort: req.query.sort || '-createdAt' });
  ok(res, { data: items, pagination });
});
