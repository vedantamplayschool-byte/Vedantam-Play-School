import Student         from '../models/Student.js';
import TeacherAttendance from '../models/TeacherAttendance.js';
import StudentAttendance from '../models/StudentAttendance.js';
import Homework         from '../models/Homework.js';
import LeaveRequest     from '../models/LeaveRequest.js';
import AcademicSession  from '../models/AcademicSession.js';
import FeePayment       from '../models/FeePayment.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';

const todayRange = () => {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setHours(23, 59, 59, 999);
  return { start: s, end: e };
};

/* ── TEACHER DASHBOARD ───────────────────────────────────────────── */
export const teacherDashboard = asyncHandler(async (req, res) => {
  const teacher = req.teacher;
  const { start, end } = todayRange();

  const activeSession = await AcademicSession.findOne({ isActive: true }).lean();

  // Base student filter for this teacher's class
  const studentFilter = { isActive: true };
  if (teacher.assignedProgram) studentFilter.program = teacher.assignedProgram;
  if (teacher.assignedSection) studentFilter.section = teacher.assignedSection;
  if (activeSession) studentFilter.session = activeSession._id;

  const [
    totalStudents,
    todayTA,
    pendingLeaves,
    todayHomework,
    myTodayAttendance,
    recentStudents
  ] = await Promise.all([
    Student.countDocuments(studentFilter),

    // Today's student attendance summary
    StudentAttendance.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),

    // My pending leave requests
    LeaveRequest.countDocuments({ teacher: teacher._id, status: 'Pending' }),

    // Today's homework
    Homework.countDocuments({
      teacher: teacher._id,
      dueDate: { $gte: start, $lte: end },
      isActive: true
    }),

    // My own attendance today
    TeacherAttendance.findOne({ teacher: teacher._id, date: { $gte: start, $lte: end } }).lean(),

    // Recent students
    Student.find(studentFilter).sort('-createdAt').limit(5).lean()
  ]);

  // Summarise attendance
  const attSummary = { Present: 0, Absent: 0, Late: 0, Leave: 0, Holiday: 0 };
  todayTA.forEach(r => { if (attSummary[r._id] !== undefined) attSummary[r._id] = r.count; });

  ok(res, {
    data: {
      teacher: {
        name: teacher.name,
        employeeId: teacher.employeeId,
        designation: teacher.designation,
        photoUrl: teacher.photoUrl,
        assignedProgram: teacher.assignedProgram,
        assignedSection: teacher.assignedSection,
        mustChangePassword: teacher.mustChangePassword
      },
      activeSession,
      totalStudents,
      todayAttendance:    attSummary,
      pendingLeaves,
      todayHomework,
      myTodayAttendance,
      recentStudents
    }
  });
});

/* ── MY STUDENTS ─────────────────────────────────────────────────── */
export const myStudents = asyncHandler(async (req, res) => {
  const teacher = req.teacher;
  const activeSession = await AcademicSession.findOne({ isActive: true }).lean();

  const filter = { isActive: true };
  if (teacher.assignedProgram) filter.program = teacher.assignedProgram;
  if (teacher.assignedSection) filter.section = teacher.assignedSection;
  if (activeSession) filter.session = activeSession._id;

  const students = await Student.find(filter)
    .sort('rollNumber studentName')
    .select('studentName parentName phone program section rollNumber admissionNumber photoUrl dateOfBirth bloodGroup emergencyContact')
    .lean();

  ok(res, { data: students });
});

/* ── HOMEWORK ─────────────────────────────────────────────────────── */
export const listHomework = asyncHandler(async (req, res) => {
  const filter = { teacher: req.teacher._id, isActive: true };
  if (req.query.program) filter.program = req.query.program;

  const items = await Homework.find(filter)
    .sort('-dueDate')
    .limit(50)
    .populate('session', 'name')
    .lean();

  ok(res, { data: items });
});

export const createHomework = asyncHandler(async (req, res) => {
  const activeSession = await AcademicSession.findOne({ isActive: true }).lean();
  const doc = await Homework.create({
    ...req.body,
    teacher: req.teacher._id,
    session: activeSession?._id
  });
  ok(res, { status: 201, message: 'Homework created', data: doc });
});

export const updateHomework = asyncHandler(async (req, res) => {
  const doc = await Homework.findOneAndUpdate(
    { _id: req.params.id, teacher: req.teacher._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!doc) { const e = new Error('Homework not found'); e.status = 404; throw e; }
  ok(res, { message: 'Homework updated', data: doc });
});

export const deleteHomework = asyncHandler(async (req, res) => {
  const doc = await Homework.findOneAndDelete({ _id: req.params.id, teacher: req.teacher._id });
  if (!doc) { const e = new Error('Homework not found'); e.status = 404; throw e; }
  ok(res, { message: 'Homework deleted' });
});

/* ── LEAVE REQUESTS ──────────────────────────────────────────────── */
export const listMyLeaveRequests = asyncHandler(async (req, res) => {
  const items = await LeaveRequest.find({ teacher: req.teacher._id })
    .sort('-date')
    .limit(50)
    .populate('approvedBy', 'name')
    .lean();
  ok(res, { data: items });
});

export const createLeaveRequest = asyncHandler(async (req, res) => {
  const doc = await LeaveRequest.create({ ...req.body, teacher: req.teacher._id });
  ok(res, { status: 201, message: 'Leave request submitted', data: doc });
});

/* ── TODAY'S STUDENT ATTENDANCE (view only for teacher) ──────────── */
export const todayStudentAttendance = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();
  const teacher = req.teacher;
  const activeSession = await AcademicSession.findOne({ isActive: true }).lean();

  const studentFilter = { isActive: true };
  if (teacher.assignedProgram) studentFilter.program = teacher.assignedProgram;
  if (teacher.assignedSection) studentFilter.section = teacher.assignedSection;
  if (activeSession) studentFilter.session = activeSession._id;

  const students = await Student.find(studentFilter)
    .select('studentName admissionNumber program section rollNumber photoUrl')
    .sort('rollNumber studentName')
    .lean();

  const attendance = await StudentAttendance.find({
    student: { $in: students.map(s => s._id) },
    date: { $gte: start, $lte: end }
  }).lean();

  const attMap = {};
  attendance.forEach(a => { attMap[String(a.student)] = a.status; });

  const result = students.map(s => ({
    ...s,
    attendanceStatus: attMap[String(s._id)] || null
  }));

  ok(res, { data: result });
});
