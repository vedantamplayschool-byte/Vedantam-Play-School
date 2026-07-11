import { Router }         from 'express';
import { protectTeacher } from '../middleware/teacherAuth.js';
import {
  teacherDashboard, myStudents,
  listHomework, createHomework, updateHomework, deleteHomework,
  listMyLeaveRequests, createLeaveRequest,
  todayStudentAttendance
} from '../controllers/teacherPortalController.js';

const r = Router();
r.use(protectTeacher);

r.get('/dashboard',          teacherDashboard);
r.get('/my-students',        myStudents);
r.get('/today-attendance',   todayStudentAttendance);

r.get('/homework',           listHomework);
r.post('/homework',          createHomework);
r.put('/homework/:id',       updateHomework);
r.delete('/homework/:id',    deleteHomework);

r.get('/leave-requests',     listMyLeaveRequests);
r.post('/leave-requests',    createLeaveRequest);

export default r;
