import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { dashboardStats } from '../controllers/dashboardController.js';
const r = Router();
r.use(protect);
r.get('/stats', dashboardStats);
export default r;
