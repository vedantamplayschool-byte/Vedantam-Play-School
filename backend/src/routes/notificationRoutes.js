import { Router }           from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listNotifications, unreadCount, createNotification,
  markRead, markAllRead, deleteNotification,
  generateBirthdayNotifications
} from '../controllers/notificationController.js';

const r = Router();
r.use(protect);

r.get('/',                   listNotifications);
r.get('/unread-count',       unreadCount);
r.post('/',                  authorize('super_admin', 'admin', 'principal'), createNotification);
r.patch('/read-all',         markAllRead);
r.patch('/:id/read',         markRead);
r.delete('/:id',             authorize('super_admin', 'admin'), deleteNotification);
r.post('/generate-birthdays',authorize('super_admin', 'admin', 'principal'), generateBirthdayNotifications);

export default r;
