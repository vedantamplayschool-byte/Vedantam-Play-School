import { Router } from 'express';
import { body }   from 'express-validator';
import {
  createAdmission,
  deleteAdmission,
  getAdmission,
  listAdmissions,
  updateAdmissionStatus
} from '../controllers/admissionController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate }           from '../middleware/validate.js';
import { admissionRules, idParam, pagination } from '../validators/common.js';

const r = Router();

/* ── Public ───────────────────────────────────────────────────────── */
r.post('/', admissionRules, validate, createAdmission);

/* ── Protected ────────────────────────────────────────────────────── */
r.use(protect);

r.get('/',    pagination, validate, listAdmissions);
r.get('/:id', idParam,   validate, getAdmission);

r.patch(
  '/:id/status',
  [
    ...idParam,
    body('status')
      .isIn(['Pending', 'Verified', 'Approved', 'Rejected', 'Waiting'])
      .withMessage('Invalid status'),
    body('notes')
      .optional().trim().isLength({ max: 1000 }),
    body('waitingListNo')
      .optional().isInt({ min: 1 })
  ],
  validate,
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  updateAdmissionStatus
);

r.delete(
  '/:id',
  idParam, validate,
  authorize('super_admin', 'admin'),
  deleteAdmission
);

export default r;
