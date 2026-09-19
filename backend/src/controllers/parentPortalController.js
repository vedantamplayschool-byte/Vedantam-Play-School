import Student         from '../models/Student.js';
import StudentAttendance from '../models/StudentAttendance.js';
import FeePayment       from '../models/FeePayment.js';
import Homework         from '../models/Homework.js';
import Notice           from '../models/Notice.js';
import Event            from '../models/Event.js';
import Gallery          from '../models/Gallery.js';
import AcademicSession  from '../models/AcademicSession.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';

/* ── HELPERS ─────────────────────────────────────────────────────── */
const todayRange = () => {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setHours(23, 59, 59, 999);
  return { start: s, end: e };
};

/* ── DASHBOARD ───────────────────────────────────────────────────── */
export const parentDashboard = asyncHandler(async (req, res) => {
  const parent = req.parent;
  const { start, end } = todayRange();

  const studentIds = parent.students || [];
  const activeSession = await AcademicSession.findOne({ isActive: true }).lean();

  const [students, todayAtt, pendingFees, upcomingHomework, recentNotices] = await Promise.all([
    Student.find({ _id: { $in: studentIds }, isActive: true })
      .select('studentName program section admissionNumber photoUrl dateOfBirth status')
      .lean(),

    StudentAttendance.find({
      student: { $in: studentIds },
      date: { $gte: start, $lte: end }
    }).lean(),

    FeePayment.countDocuments({
      student: { $in: studentIds },
      status: { $in: ['Pending', 'Partial'] },
      balance: { $gt: 0 }
    }),

    Homework.find({
      program: { $in: [...new Set((await Student.find({ _id: { $in: studentIds } }, 'program').lean()).map(s => s.program))] },
      dueDate: { $gte: start },
      isActive: true
    }).sort('dueDate').limit(5).lean(),

    Notice.find({ isPublished: true }).sort('-createdAt').limit(5).lean()
  ]);

  // Build today's attendance map
  const attMap = {};
  todayAtt.forEach(a => { attMap[String(a.student)] = a.status; });

  const studentsWithAtt = students.map(s => ({
    ...s,
    todayAttendance: attMap[String(s._id)] || 'Not Marked'
  }));

  ok(res, {
    data: {
      parent: {
        fatherName: parent.fatherName,
        motherName: parent.motherName,
        fatherPhone: parent.fatherPhone,
        motherPhone: parent.motherPhone,
        address: parent.address,
        mustChangePassword: parent.mustChangePassword
      },
      activeSession,
      students: studentsWithAtt,
      pendingFees,
      upcomingHomework,
      recentNotices
    }
  });
});

/* ── MY STUDENTS ─────────────────────────────────────────────────── */
export const myStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({
    _id: { $in: req.parent.students },
    isActive: true
  })
    .select('studentName program section admissionNumber photoUrl dateOfBirth bloodGroup gender status address medicalNotes admissionDate emergencyContact')
    .lean();

  ok(res, { data: students });
});

/* ── ATTENDANCE ──────────────────────────────────────────────────── */
export const myChildAttendance = asyncHandler(async (req, res) => {
  const studentIds = req.parent.students || [];

  const filter = { student: { $in: studentIds } };
  if (req.query.from) filter.date = { ...filter.date, $gte: new Date(req.query.from) };
  if (req.query.to)   filter.date = { ...filter.date, $lte: new Date(req.query.to) };
  if (req.query.studentId && studentIds.map(String).includes(req.query.studentId)) {
    filter.student = req.query.studentId;
  }

  const records = await StudentAttendance.find(filter)
    .populate('student', 'studentName program section')
    .sort('-date')
    .limit(100)
    .lean();

  // Summary per student
  const summary = {};
  records.forEach(r => {
    const key = String(r.student?._id || r.student);
    if (!summary[key]) summary[key] = { Present: 0, Absent: 0, Late: 0, Leave: 0 };
    summary[key][r.status] = (summary[key][r.status] || 0) + 1;
  });

  ok(res, { data: records, summary });
});

/* ── HOMEWORK ────────────────────────────────────────────────────── */
export const myChildHomework = asyncHandler(async (req, res) => {
  const students = await Student.find({
    _id: { $in: req.parent.students }, isActive: true
  }, 'program section').lean();

  const programs = [...new Set(students.map(s => s.program))];

  const filter = { program: { $in: programs }, isActive: true };
  if (req.query.from) filter.dueDate = { ...filter.dueDate, $gte: new Date(req.query.from) };
  if (req.query.to)   filter.dueDate = { ...filter.dueDate, $lte: new Date(req.query.to) };

  const items = await Homework.find(filter)
    .populate('teacher', 'name designation')
    .populate('session', 'name')
    .sort('-dueDate')
    .limit(50)
    .lean();

  ok(res, { data: items });
});

/* ── FEE DETAILS ─────────────────────────────────────────────────── */
export const myChildFees = asyncHandler(async (req, res) => {
  const filter = { student: { $in: req.parent.students } };
  if (req.query.session) filter.session = req.query.session;
  if (req.query.status)  filter.status  = req.query.status;

  const payments = await FeePayment.find(filter)
    .populate('student', 'studentName admissionNumber program')
    .populate('session', 'name')
    .sort('-paymentDate')
    .limit(100)
    .lean();

  // Summary
  const totalPaid    = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + (p.amountPaid || 0), 0);
  const totalPending = payments.filter(p => ['Pending', 'Partial'].includes(p.status)).reduce((s, p) => s + (p.balance || 0), 0);

  ok(res, { data: payments, summary: { totalPaid, totalPending, totalRecords: payments.length } });
});

/* ── FEE RECEIPT (single record) ─────────────────────────────────── */
export const feeReceipt = asyncHandler(async (req, res) => {
  const payment = await FeePayment.findById(req.params.id)
    .populate('student', 'studentName admissionNumber program section')
    .populate('session', 'name')
    .lean();

  if (!payment) { const e = new Error('Receipt not found'); e.status = 404; throw e; }

  // Security: ensure this payment belongs to one of the parent's children
  const allowed = (req.parent.students || []).map(String);
  if (!allowed.includes(String(payment.student?._id || payment.student))) {
    const e = new Error('Access denied'); e.status = 403; throw e;
  }

  ok(res, { data: payment });
});

/* ── NOTICES ─────────────────────────────────────────────────────── */
export const schoolNotices = asyncHandler(async (req, res) => {
  const filter = {
    isPublished: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: new Date() } }]
  };
  if (req.query.priority) filter.priority = req.query.priority;

  const notices = await Notice.find(filter)
    .sort('-createdAt')
    .limit(30)
    .lean();

  ok(res, { data: notices });
});

/* ── EVENTS ──────────────────────────────────────────────────────── */
export const schoolEvents = asyncHandler(async (req, res) => {
  const filter = { isPublished: true };
  if (req.query.upcoming === 'true') filter.eventDate = { $gte: new Date() };

  const events = await Event.find(filter)
    .sort('eventDate')
    .limit(20)
    .lean();

  ok(res, { data: events });
});

/* ── GALLERY ─────────────────────────────────────────────────────── */
export const schoolGallery = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;

  const items = await Gallery.find(filter)
    .sort('-createdAt')
    .limit(50)
    .lean();

  ok(res, { data: items });
});
