import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { idParam } from '../validators/common.js';
import { validate } from '../middleware/validate.js';
import {
  markStudentAttendance, getStudentAttendanceByDate, studentMonthlyAttendance,
  markTeacherAttendance, getTeacherAttendanceByDate, teacherMonthlyAttendance,
  listHolidays, createHoliday, updateHoliday, deleteHoliday
} from '../controllers/attendanceController.js';

const r = Router();
r.use(protect);

/* ── Student Attendance ───────────────────────────────────────────── */
r.get('/students/date',                 getStudentAttendanceByDate);
r.get('/students/:studentId/monthly',   studentMonthlyAttendance);
r.post('/students',
  authorize('super_admin', 'admin', 'principal', 'office_staff', 'teacher'),
  markStudentAttendance
);

/* ── Teacher Attendance ───────────────────────────────────────────── */
r.get('/teachers/date',                 getTeacherAttendanceByDate);
r.get('/teachers/:teacherId/monthly',   teacherMonthlyAttendance);
r.post('/teachers',
  authorize('super_admin', 'admin', 'principal'),
  markTeacherAttendance
);

/* ── Holidays ─────────────────────────────────────────────────────── */
r.get('/holidays',     listHolidays);
r.post('/holidays',    authorize('super_admin', 'admin', 'principal'), createHoliday);
r.put('/holidays/:id', authorize('super_admin', 'admin', 'principal'), idParam, validate, updateHoliday);
r.patch('/holidays/:id', authorize('super_admin', 'admin', 'principal'), idParam, validate, updateHoliday);
r.delete('/holidays/:id', authorize('super_admin', 'admin'), idParam, validate, deleteHoliday);

export default r;
