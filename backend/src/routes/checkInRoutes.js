import { Router }         from 'express';
import { protectTeacher } from '../middleware/teacherAuth.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload }         from '../middleware/upload.js';
import {
  checkIn, checkOut, todayStatus,
  myAttendanceHistory, adminCheckInList
} from '../controllers/checkInController.js';

const r = Router();

// Teacher self-service routes — photo capture is optional (multipart 'photo' field)
r.post('/checkin',  protectTeacher, upload.single('photo'), checkIn);
r.post('/checkout', protectTeacher, upload.single('photo'), checkOut);
r.get('/status',    protectTeacher, todayStatus);
r.get('/history',   protectTeacher, myAttendanceHistory);

// Admin view of self-reported check-ins
r.get('/admin/list', protect, authorize('super_admin', 'admin', 'principal'), adminCheckInList);

export default r;
