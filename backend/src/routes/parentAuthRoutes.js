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
// Password change is admin-only — parents use the password given by admin
r.put('/change-password', (req, res) => {
  res.status(403).json({ success: false, message: 'Password can only be changed by the school admin. Please contact admin to reset your password.' });
});

export default r;
