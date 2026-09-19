import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { protectParent } from '../middleware/parentAuth.js';

import {
  listExaminations,
  getConfiguration,
  saveConfiguration,
  marksGrid,
  saveMarks,
  publishMarks,
  parentResults
} from '../controllers/marksController.js';

const r = Router();

/*
 * Parent results
 * Keep this BEFORE the admin protect middleware.
 */
r.get('/parent/results', protectParent, parentResults);

/*
 * Admin / staff marks management
 */
r.use(protect);

r.get('/examinations', listExaminations);
r.get('/configuration', getConfiguration);
r.get('/grid', marksGrid);

r.put(
  '/configuration',
  authorize('super_admin', 'admin', 'principal'),
  saveConfiguration
);

r.post(
  '/save',
  authorize('super_admin', 'admin', 'principal'),
  saveMarks
);

r.post(
  '/publish',
  authorize('super_admin', 'admin', 'principal'),
  publishMarks
);

export default r;