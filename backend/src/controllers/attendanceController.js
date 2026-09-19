import StudentAttendance from '../models/StudentAttendance.js';
import TeacherAttendance from '../models/TeacherAttendance.js';
import Holiday from '../models/Holiday.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import AcademicSession from '../models/AcademicSession.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { paginate } from '../utils/apiFeatures.js';

/* ═══════════════ STUDENT ATTENDANCE ══════════════════════════════ */

/* Mark bulk attendance for a date */
export const markStudentAttendance = asyncHandler(async (req, res) => {
  /*
    body: {
      date: "2024-06-01",
      records: [{ student: "id", status: "Present", remarks: "" }, ...]
    }
  */
  const { date, records } = req.body;
  if (!date || !Array.isArray(records) || !records.length) {
    const e = new Error('date and records[] are required'); e.status = 400; throw e;
  }
  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  const active = await AcademicSession.findOne({ isActive: true });

  const ops = records.map(r => ({
    updateOne: {
      filter: { student: r.student, date: parsedDate },
      update: { $set: { status: r.status || 'Absent', remarks: r.remarks || '', markedBy: req.admin.id, session: active?._id } },
      upsert: true
    }
  }));

  await StudentAttendance.bulkWrite(ops);
  ok(res, { message: `Attendance marked for ${records.length} students` });
});

/* Get attendance for a class on a date */
export const getStudentAttendanceByDate = asyncHandler(async (req, res) => {
  const { date, program, section, session } = req.query;
  if (!date) { const e = new Error('date is required'); e.status = 400; throw e; }

  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  // Fetch students matching filter
  const stuFilter = { isActive: true };
  if (program) stuFilter.program = program;
  if (section) stuFilter.section = section;
  if (session) stuFilter.session = session;

  const students    = await Student.find(stuFilter, 'studentName program section rollNumber admissionNumber photoUrl').sort('studentName');
  const studentIds  = students.map(s => s._id);
  const attendance  = await StudentAttendance.find({ student: { $in: studentIds }, date: parsedDate });

  const attMap = {};
  attendance.forEach(a => { attMap[String(a.student)] = a; });

  const result = students.map(s => ({
    student:  { _id: s._id, studentName: s.studentName, program: s.program, section: s.section, rollNumber: s.rollNumber, admissionNumber: s.admissionNumber, photoUrl: s.photoUrl },
    status:   attMap[String(s._id)]?.status || 'Absent',
    remarks:  attMap[String(s._id)]?.remarks || '',
    recorded: !!attMap[String(s._id)]
  }));

  ok(res, { data: { date: parsedDate, records: result } });
});

/* Monthly summary for a student */
export const studentMonthlyAttendance = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { month, year } = req.query; // month: 1-12, year: 2024

  const y = Number(year || new Date().getFullYear());
  const m = Number(month || new Date().getMonth() + 1);
  const from = new Date(y, m - 1, 1);
  const to   = new Date(y, m, 0, 23, 59, 59);

  const records = await StudentAttendance.find({ student: studentId, date: { $gte: from, $lte: to } }).sort('date');
  const present = records.filter(r => r.status === 'Present').length;
  const absent  = records.filter(r => r.status === 'Absent').length;
  const late    = records.filter(r => r.status === 'Late').length;

  ok(res, { data: { records, present, absent, late, total: records.length } });
});

/* ═══════════════ TEACHER ATTENDANCE ══════════════════════════════ */

export const markTeacherAttendance = asyncHandler(async (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records) || !records.length) {
    const e = new Error('date and records[] are required'); e.status = 400; throw e;
  }
  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  const ops = records.map(r => ({
    updateOne: {
      filter: { teacher: r.teacher, date: parsedDate },
      update: { $set: { status: r.status || 'Absent', checkIn: r.checkIn, checkOut: r.checkOut, remarks: r.remarks || '', markedBy: req.admin.id } },
      upsert: true
    }
  }));

  await TeacherAttendance.bulkWrite(ops);
  ok(res, { message: `Teacher attendance marked for ${records.length} teachers` });
});

export const getTeacherAttendanceByDate = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) { const e = new Error('date is required'); e.status = 400; throw e; }
  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  const teachers   = await Teacher.find({ isActive: true }, 'name designation photoUrl').sort('name');
  const teacherIds = teachers.map(t => t._id);
  const attendance = await TeacherAttendance.find({ teacher: { $in: teacherIds }, date: parsedDate });

  const attMap = {};
  attendance.forEach(a => { attMap[String(a.teacher)] = a; });

  const result = teachers.map(t => ({
    teacher:  { _id: t._id, name: t.name, designation: t.designation, photoUrl: t.photoUrl },
    status:   attMap[String(t._id)]?.status || 'Absent',
    checkIn:  attMap[String(t._id)]?.checkIn || '',
    checkOut: attMap[String(t._id)]?.checkOut || '',
    remarks:  attMap[String(t._id)]?.remarks || '',
    recorded: !!attMap[String(t._id)]
  }));

  ok(res, { data: { date: parsedDate, records: result } });
});

export const teacherMonthlyAttendance = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const { month, year } = req.query;
  const y = Number(year || new Date().getFullYear());
  const m = Number(month || new Date().getMonth() + 1);
  const from = new Date(y, m - 1, 1);
  const to   = new Date(y, m, 0, 23, 59, 59);
  const records  = await TeacherAttendance.find({ teacher: teacherId, date: { $gte: from, $lte: to } }).sort('date');
  const present  = records.filter(r => r.status === 'Present').length;
  const absent   = records.filter(r => r.status === 'Absent').length;
  ok(res, { data: { records, present, absent, total: records.length } });
});

/* ═══════════════ HOLIDAYS ════════════════════════════════════════ */

export const listHolidays = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.session) filter.session = req.query.session;
  if (req.query.year) {
    const y = Number(req.query.year);
    filter.date = { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31) };
  }
  const { items, pagination } = await paginate(Holiday, filter, req.query);
  ok(res, { data: items, pagination });
});

export const createHoliday = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (!payload.session) {
    const active = await AcademicSession.findOne({ isActive: true });
    if (active) payload.session = active._id;
  }
  const doc = await Holiday.create(payload);
  ok(res, { status: 201, message: 'Holiday created', data: doc });
});

export const updateHoliday = asyncHandler(async (req, res) => {
  const doc = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!doc) { const e = new Error('Holiday not found'); e.status = 404; throw e; }
  ok(res, { message: 'Holiday updated', data: doc });
});

export const deleteHoliday = asyncHandler(async (req, res) => {
  const doc = await Holiday.findByIdAndDelete(req.params.id);
  if (!doc) { const e = new Error('Holiday not found'); e.status = 404; throw e; }
  ok(res, { message: 'Holiday deleted' });
});
