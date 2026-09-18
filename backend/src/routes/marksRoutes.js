import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { listMarks, saveMark, deleteMark } from '../controllers/marksController.js';

const r = Router();
r.use(protect, authorize('super_admin', 'admin', 'principal', 'office_staff'));
r.get('/', listMarks);
r.post('/', saveMark);
r.delete('/:id', deleteMark);

export default r;