import Student         from '../models/Student.js';
import TeacherAttendance from '../models/TeacherAttendance.js';
import StudentAttendance from '../models/StudentAttendance.js';
import Homework         from '../models/Homework.js';
import LeaveRequest     from '../models/LeaveRequest.js';
import AcademicSession  from '../models/AcademicSession.js';
import FeePayment       from '../models/FeePayment.js';
import Notice           from '../models/Notice.js';
import StudentRemark    from '../models/StudentRemark.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';
import { uploadImage }  from '../services/uploadService.js';

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
    recentStudents,
    todayNotices
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
    Student.find(studentFilter).sort('-createdAt').limit(5).lean(),

    // Today's / active notices for the quick-actions & notices widget
    Notice.find({
      isPublished: true,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: new Date() } }]
    }).sort('-createdAt').limit(5).lean()
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
      recentStudents,
      todayNotices
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

/* ── MARK/UPDATE STUDENT ATTENDANCE (teacher, own class only) ────── */
export const markStudentAttendance = asyncHandler(async (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records) || !records.length) {
    const e = new Error('date and records[] are required'); e.status = 400; throw e;
  }

  const teacher = req.teacher;
  const parsedDate = new Date(date);
  parsedDate.setHours(0, 0, 0, 0);

  // A teacher may only mark attendance for students in their own assigned class.
  const studentFilter = { isActive: true, _id: { $in: records.map(r => r.student) } };
  if (teacher.assignedProgram) studentFilter.program = teacher.assignedProgram;
  if (teacher.assignedSection) studentFilter.section = teacher.assignedSection;

  const allowedIds = new Set((await Student.find(studentFilter, '_id').lean()).map(s => String(s._id)));
  const filteredRecords = records.filter(r => allowedIds.has(String(r.student)));

  if (!filteredRecords.length) {
    const e = new Error('None of the given students belong to your assigned class'); e.status = 403; throw e;
  }

  const activeSession = await AcademicSession.findOne({ isActive: true }).lean();

  const ops = filteredRecords.map(r => ({
    updateOne: {
      filter: { student: r.student, date: parsedDate },
      update: {
        $set: {
          status: r.status || 'Absent',
          remarks: r.remarks || '',
          session: activeSession?._id
        },
        $unset: { markedBy: '' } // teacher-marked records aren't tied to an Admin id
      },
      upsert: true
    }
  }));

  await StudentAttendance.bulkWrite(ops);
  ok(res, { message: `Attendance marked for ${filteredRecords.length} students` });
});

/* ── NOTICE BOARD (view, same feed parents/admin see) ─────────────── */
export const teacherNotices = asyncHandler(async (req, res) => {
  const filter = {
    isPublished: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: new Date() } }]
  };
  if (req.query.priority) filter.priority = req.query.priority;

  const notices = await Notice.find(filter).sort('-createdAt').limit(30).lean();
  ok(res, { data: notices });
});

/* ── DAILY STUDENT REMARKS ─────────────────────────────────────────── */
export const upsertStudentRemark = asyncHandler(async (req, res) => {
  const teacher = req.teacher;
  const { remark, date } = req.body;
  if (!remark) { const e = new Error('remark is required'); e.status = 400; throw e; }

  // Confirm the student belongs to this teacher's class before allowing a remark.
  const studentFilter = { _id: req.params.id, isActive: true };
  if (teacher.assignedProgram) studentFilter.program = teacher.assignedProgram;
  if (teacher.assignedSection) studentFilter.section = teacher.assignedSection;
  const student = await Student.findOne(studentFilter).lean();
  if (!student) { const e = new Error('Student not found in your assigned class'); e.status = 404; throw e; }

  const parsedDate = date ? new Date(date) : new Date();
  parsedDate.setHours(0, 0, 0, 0);

  const doc = await StudentRemark.findOneAndUpdate(
    { student: req.params.id, date: parsedDate },
    { $set: { remark, teacher: teacher._id } },
    { new: true, upsert: true, runValidators: true }
  );

  ok(res, { message: 'Remark saved', data: doc });
});

export const listStudentRemarks = asyncHandler(async (req, res) => {
  const remarks = await StudentRemark.find({ student: req.params.id })
    .sort('-date')
    .limit(30)
    .populate('teacher', 'name')
    .lean();
  ok(res, { data: remarks });
});

/* ── HOMEWORK IMAGE ATTACHMENT ─────────────────────────────────────── */
export const uploadHomeworkImage = asyncHandler(async (req, res) => {
  if (!req.file) { const e = new Error('Image file is required'); e.status = 400; throw e; }
  const doc = await Homework.findOne({ _id: req.params.id, teacher: req.teacher._id });
  if (!doc) { const e = new Error('Homework not found'); e.status = 404; throw e; }

  const uploaded = await uploadImage(req.file, 'vedantam/homework', req);
  doc.imageUrl = uploaded.url;
  doc.imagePublicId = uploaded.publicId || '';
  await doc.save();

  ok(res, { message: 'Homework image attached', data: doc });
});
