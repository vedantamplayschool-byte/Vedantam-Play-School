import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { idParam, pagination } from '../validators/common.js';
import { validate } from '../middleware/validate.js';
import {
  listFeeStructures, getFeeStructure, createFeeStructure, updateFeeStructure, deleteFeeStructure,
  listFeePayments, getFeePayment, createFeePayment, updateFeePayment, deleteFeePayment,
  studentFeeSummary, monthlyCollection
} from '../controllers/feeController.js';

const r = Router();
r.use(protect);

/* ── Fee Structures ───────────────────────────────────────────────── */
r.get('/structures',        pagination, validate, listFeeStructures);
r.get('/structures/:id',   idParam, validate, getFeeStructure);
r.post('/structures',
  authorize('super_admin', 'admin', 'principal'),
  createFeeStructure
);
r.put('/structures/:id',
  authorize('super_admin', 'admin', 'principal'),
  idParam, validate, updateFeeStructure
);
r.patch('/structures/:id',
  authorize('super_admin', 'admin', 'principal'),
  idParam, validate, updateFeeStructure
);
r.delete('/structures/:id',
  authorize('super_admin', 'admin'),
  idParam, validate, deleteFeeStructure
);

/* ── Fee Payments ─────────────────────────────────────────────────── */
r.get('/payments',              pagination, validate, listFeePayments);
r.get('/payments/monthly',      monthlyCollection);
r.get('/payments/:id',          idParam, validate, getFeePayment);
r.get('/student/:studentId',    studentFeeSummary);
r.post('/payments',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  createFeePayment
);
r.put('/payments/:id',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  idParam, validate, updateFeePayment
);
r.patch('/payments/:id',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  idParam, validate, updateFeePayment
);
r.delete('/payments/:id',
  authorize('super_admin', 'admin'),
  idParam, validate, deleteFeePayment
);

export default r;
