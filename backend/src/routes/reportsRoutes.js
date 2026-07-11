import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  studentsReport, admissionsReport, feesReport, teachersReport, attendanceReport
} from '../controllers/reportsController.js';

const r = Router();
r.use(protect, authorize('super_admin', 'admin', 'principal', 'office_staff'));

r.get('/students',    studentsReport);
r.get('/admissions',  admissionsReport);
r.get('/fees',        feesReport);
r.get('/teachers',    teachersReport);
r.get('/attendance',  attendanceReport);

export default r;
