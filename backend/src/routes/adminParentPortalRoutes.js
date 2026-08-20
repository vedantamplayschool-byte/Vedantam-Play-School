import { Router }            from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listPortalParents, getParentProfile, updateParentProfileByAdmin, activatePortal, deactivatePortal, resetParentPassword, linkStudentToParentByAdmin, unlinkStudentFromParentByAdmin
} from '../controllers/adminParentPortalController.js';

const r = Router();
r.use(protect, authorize('super_admin', 'admin', 'principal', 'office_staff'));

r.get('/',                          listPortalParents);
r.get('/:id/profile',                 getParentProfile);
r.put('/:id/profile',                 updateParentProfileByAdmin);
r.post('/:id/activate',             activatePortal);
r.post('/:id/deactivate',           deactivatePortal);
r.post('/:id/reset-password',       resetParentPassword);
r.post('/:id/students/link',        linkStudentToParentByAdmin);
r.delete('/:id/students/:studentId', unlinkStudentFromParentByAdmin);

export default r;
