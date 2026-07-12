import { Router }        from 'express';
import { protectParent } from '../middleware/parentAuth.js';
import rateLimit         from 'express-rate-limit';
import {
  parentLogin, parentLogout, parentMe, changeParentPassword, updateParentProfile
} from '../controllers/parentAuthController.js';

const r = Router();

r.post('/login',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { success: false, message: 'Too many login attempts' } }),
  parentLogin
);

r.post('/logout', parentLogout);

r.use(protectParent);
r.get('/me',              parentMe);
r.put('/profile',         updateParentProfile);
r.put('/change-password', changeParentPassword);

export default r;
