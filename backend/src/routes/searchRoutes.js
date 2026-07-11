import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { globalSearch } from '../controllers/searchController.js';

const r = Router();
r.use(protect);
r.get('/', globalSearch);
export default r;
