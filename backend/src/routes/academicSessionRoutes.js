import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { idParam, pagination } from '../validators/common.js';
import { validate } from '../middleware/validate.js';
import {
  listSessions, getSession, getActiveSession, createSession, updateSession, deleteSession
} from '../controllers/academicSessionController.js';

const r = Router();
r.use(protect);

r.get('/',        pagination, validate, listSessions);
r.get('/active',  getActiveSession);
r.get('/:id',     idParam, validate, getSession);

r.post('/',    authorize('super_admin', 'admin'), createSession);
r.put('/:id',  authorize('super_admin', 'admin'), idParam, validate, updateSession);
r.patch('/:id',authorize('super_admin', 'admin'), idParam, validate, updateSession);
r.delete('/:id',authorize('super_admin'),         idParam, validate, deleteSession);

export default r;
