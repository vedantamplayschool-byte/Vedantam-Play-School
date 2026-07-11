import { Router }                 from 'express';
import { protect, authorize }     from '../middleware/auth.js';
import { storageStats }           from '../controllers/storageController.js';

const r = Router();
r.use(protect, authorize('super_admin', 'admin', 'principal'));
r.get('/stats', storageStats);
export default r;
