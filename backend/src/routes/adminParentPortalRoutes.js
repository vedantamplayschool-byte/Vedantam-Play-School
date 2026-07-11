import { Router }            from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listPortalParents, activatePortal, deactivatePortal, resetParentPassword
} from '../controllers/adminParentPortalController.js';

const r = Router();
r.use(protect, authorize('super_admin', 'admin', 'principal', 'office_staff'));

r.get('/',                          listPortalParents);
r.post('/:id/activate',             activatePortal);
r.post('/:id/deactivate',           deactivatePortal);
r.post('/:id/reset-password',       resetParentPassword);

export default r;
