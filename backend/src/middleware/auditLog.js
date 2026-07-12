import AuditLog from '../models/AuditLog.js';
import LoginHistory from '../models/LoginHistory.js';

/* Record a login attempt (success or failure). Never throws — logging must
   never break the actual login flow. */
export const recordLoginAttempt = async ({ portal, identifier, user, userModel, success, reason, req }) => {
  try {
    await LoginHistory.create({
      portal,
      identifier: identifier || '',
      userId: user?._id,
      userModel,
      userName: user?.name || user?.studentName || user?.fatherName || '',
      success,
      reason: reason || '',
      ipAddress: req?.ip || '',
      userAgent: (req?.headers?.['user-agent'] || '').substring(0, 300)
    });
  } catch (err) {
    // Swallow — audit logging is best-effort only.
    console.error('LoginHistory write failed:', err.message);
  }
};

/* Express middleware — attaches to admin API routes and writes one AuditLog
   entry per mutating (non-GET) request that completes, success or error. */
export const auditAdminActions = (req, res, next) => {
  if (req.method === 'GET') return next();
  res.on('finish', () => {
    if (!req.admin) return; // only log authenticated admin actions
    AuditLog.create({
      admin: req.admin._id,
      adminName: req.admin.name,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      ipAddress: req.ip || ''
    }).catch(err => console.error('AuditLog write failed:', err.message));
  });
  next();
};
