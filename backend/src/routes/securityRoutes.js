import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { listLoginHistory, listAuditLogs } from '../controllers/securityController.js';

const r = Router();
r.use(protect, authorize('super_admin', 'admin', 'principal'));

r.get('/login-history', listLoginHistory);
r.get('/audit-logs',    listAuditLogs);

export default r;
