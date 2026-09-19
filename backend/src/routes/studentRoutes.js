import { Router }           from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { upload }             from '../middleware/upload.js';
import { idParam, pagination } from '../validators/common.js';
import { validate }           from '../middleware/validate.js';
import {
  listStudents, getStudent, createStudent, updateStudent, deleteStudent,
  convertAdmission, archiveStudent, restoreStudent,
  addDocument, deleteDocument, replaceDocument, uploadParentPhoto
} from '../controllers/studentController.js';

const r = Router();
r.use(protect);

r.get('/',    pagination, validate, listStudents);
r.get('/:id', idParam,   validate, getStudent);

r.post('/',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  upload.single('photo'), createStudent
);

r.put('/:id',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  idParam, validate, upload.single('photo'), updateStudent
);

r.patch('/:id',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  idParam, validate, upload.single('photo'), updateStudent
);

r.delete('/:id',
  authorize('super_admin', 'admin'),
  idParam, validate, deleteStudent
);

r.post('/:id/archive',
  authorize('super_admin', 'admin', 'principal'),
  idParam, validate, archiveStudent
);

r.post('/:id/restore',
  authorize('super_admin', 'admin', 'principal'),
  idParam, validate, restoreStudent
);

/* ── Document management (v2.5) ──────────────────────────────────── */
r.post('/:id/documents',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  upload.single('document'), addDocument
);

r.delete('/:id/documents/:docId',
  authorize('super_admin', 'admin', 'principal'),
  deleteDocument
);

r.put('/:id/documents/:docId',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  upload.single('document'), replaceDocument
);

/* ── Parent photo upload (v2.5) ───────────────────────────────────── */
r.post('/:id/parent-photo/:parentType',
  authorize('super_admin', 'admin', 'principal', 'office_staff'),
  upload.single('photo'), uploadParentPhoto
);

r.post('/convert-admission/:admissionId',
  authorize('super_admin', 'admin', 'principal'),
  convertAdmission
);

export default r;
