import { Router } from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.js';
import { idParam, pagination } from '../validators/common.js';
import { validate } from '../middleware/validate.js';
import {
  listParents, getParent, createParent, updateParent, deleteParent, linkStudent
} from '../controllers/parentController.js';

const r      = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

r.use(protect);

r.get('/',    pagination, validate, listParents);
r.get('/:id', idParam, validate, getParent);

r.post('/',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  upload.fields([{ name: 'fatherPhoto', maxCount: 1 }, { name: 'motherPhoto', maxCount: 1 }]),
  createParent
);

r.put('/:id',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  idParam, validate,
  upload.fields([{ name: 'fatherPhoto', maxCount: 1 }, { name: 'motherPhoto', maxCount: 1 }]),
  updateParent
);

r.patch('/:id',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  idParam, validate,
  upload.fields([{ name: 'fatherPhoto', maxCount: 1 }, { name: 'motherPhoto', maxCount: 1 }]),
  updateParent
);

r.delete('/:id',
  authorize('super_admin', 'admin'),
  idParam, validate, deleteParent
);

r.post('/:id/link-student',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  idParam, validate, linkStudent
);

export default r;
