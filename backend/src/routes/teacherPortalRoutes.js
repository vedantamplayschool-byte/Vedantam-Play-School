import { Router }         from 'express';
import { protectTeacher } from '../middleware/teacherAuth.js';
import { upload }         from '../middleware/upload.js';
import {
  teacherDashboard, myStudents,
  listHomework, createHomework, updateHomework, deleteHomework, uploadHomeworkImage,
  listMyLeaveRequests, createLeaveRequest,
  todayStudentAttendance, markStudentAttendance,
  teacherNotices, upsertStudentRemark, listStudentRemarks
} from '../controllers/teacherPortalController.js';

const r = Router();
r.use(protectTeacher);

r.get('/dashboard',          teacherDashboard);
r.get('/my-students',        myStudents);
r.get('/today-attendance',   todayStudentAttendance);
r.post('/attendance',        markStudentAttendance);

r.get('/notices',            teacherNotices);

r.put('/students/:id/remark',   upsertStudentRemark);
r.get('/students/:id/remarks',  listStudentRemarks);

r.get('/homework',           listHomework);
r.post('/homework',          createHomework);
r.put('/homework/:id',       updateHomework);
r.delete('/homework/:id',    deleteHomework);
r.patch('/homework/:id/image', upload.single('image'), uploadHomeworkImage);

r.get('/leave-requests',     listMyLeaveRequests);
r.post('/leave-requests',    createLeaveRequest);

export default r;
