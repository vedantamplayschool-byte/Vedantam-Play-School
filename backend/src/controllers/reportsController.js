import Student from '../models/Student.js';
import Admission from '../models/Admission.js';
import FeePayment from '../models/FeePayment.js';
import Teacher from '../models/Teacher.js';
import StudentAttendance from '../models/StudentAttendance.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/* ── CSV helper ─────────────────────────────────────────────────── */
function toCSV(headers, rows) {
  const hdr  = headers.join(',');
  const body = rows.map(r =>
    headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  return `${hdr}\n${body}`;
}

/* ── STUDENTS REPORT ─────────────────────────────────────────────── */
export const studentsReport = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.program) filter.program = req.query.program;
  if (req.query.session) filter.session = req.query.session;

  const students = await Student.find(filter)
    .populate('parent', 'fatherName motherName fatherPhone')
    .sort('studentName')
    .lean();

  const rows = students.map(s => ({
    admissionNumber: s.admissionNumber || '',
    studentName:     s.studentName,
    gender:          s.gender || '',
    program:         s.program,
    section:         s.section || '',
    rollNumber:      s.rollNumber || '',
    dateOfBirth:     s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-IN') : '',
    bloodGroup:      s.bloodGroup || '',
    fatherName:      s.parent?.fatherName || s.parentName,
    motherName:      s.parent?.motherName || '',
    parentPhone:     s.parent?.fatherPhone || s.phone,
    address:         s.address || '',
    admissionDate:   s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('en-IN') : '',
    status:          s.status || s.isActive ? 'Active' : 'Inactive'
  }));

  const headers = ['admissionNumber','studentName','gender','program','section','rollNumber',
    'dateOfBirth','bloodGroup','fatherName','motherName','parentPhone','address','admissionDate','status'];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="students-${Date.now()}.csv"`);
  res.send(toCSV(headers, rows));
});

/* ── ADMISSIONS REPORT ───────────────────────────────────────────── */
export const admissionsReport = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status)  filter.status  = req.query.status;
  if (req.query.program) filter.program = req.query.program;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to)   filter.createdAt.$lte = new Date(req.query.to);
  }

  const admissions = await Admission.find(filter).sort('-createdAt').lean();

  const rows = admissions.map(a => ({
    studentName: a.studentName,
    parentName:  a.parentName,
    phone:       a.phone,
    email:       a.email || '',
    age:         a.age,
    program:     a.program,
    status:      a.status,
    date:        new Date(a.createdAt).toLocaleDateString('en-IN'),
    notes:       a.notes || ''
  }));

  const headers = ['studentName','parentName','phone','email','age','program','status','date','notes'];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="admissions-${Date.now()}.csv"`);
  res.send(toCSV(headers, rows));
});

/* ── FEE REPORT ─────────────────────────────────────────────────── */
export const feesReport = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.session) filter.session = req.query.session;
  if (req.query.status)  filter.status  = req.query.status;
  if (req.query.month)   filter.month   = req.query.month;
  if (req.query.year)    filter.year    = Number(req.query.year);

  const payments = await FeePayment.find(filter)
    .populate('student', 'studentName admissionNumber program')
    .sort('-paymentDate')
    .lean();

  const rows = payments.map(p => ({
    receiptNumber: p.receiptNumber || '',
    studentName:   p.student?.studentName || '',
    admissionNo:   p.student?.admissionNumber || '',
    program:       p.student?.program || '',
    feeType:       p.feeType,
    month:         p.month || '',
    year:          p.year || '',
    baseAmount:    p.baseAmount,
    discount:      p.discount || 0,
    lateFee:       p.lateFee || 0,
    totalAmount:   p.totalAmount,
    amountPaid:    p.amountPaid,
    balance:       p.balance || 0,
    status:        p.status,
    paymentMode:   p.paymentMode || '',
    paymentDate:   p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : ''
  }));

  const headers = ['receiptNumber','studentName','admissionNo','program','feeType','month','year',
    'baseAmount','discount','lateFee','totalAmount','amountPaid','balance','status','paymentMode','paymentDate'];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="fees-${Date.now()}.csv"`);
  res.send(toCSV(headers, rows));
});

/* ── TEACHERS REPORT ─────────────────────────────────────────────── */
export const teachersReport = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find({ isActive: true }).sort('name').lean();

  const rows = teachers.map(t => ({
    employeeId:    t.employeeId || '',
    name:          t.name,
    designation:   t.designation || '',
    qualification: t.qualification,
    experience:    t.experience || '',
    phone:         t.phone || '',
    email:         t.email || '',
    joiningDate:   t.joiningDate ? new Date(t.joiningDate).toLocaleDateString('en-IN') : '',
    salary:        t.salary || '',
    bloodGroup:    t.bloodGroup || ''
  }));

  const headers = ['employeeId','name','designation','qualification','experience','phone','email','joiningDate','salary','bloodGroup'];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="teachers-${Date.now()}.csv"`);
  res.send(toCSV(headers, rows));
});

/* ── ATTENDANCE REPORT ───────────────────────────────────────────── */
export const attendanceReport = asyncHandler(async (req, res) => {
  const { from, to, program, section } = req.query;
  if (!from || !to) { const e = new Error('from and to dates are required'); e.status = 400; throw e; }

  const stuFilter = { isActive: true };
  if (program) stuFilter.program = program;
  if (section) stuFilter.section = section;
  const students = await Student.find(stuFilter, 'studentName admissionNumber program section').lean();

  const attFilter = {
    student: { $in: students.map(s => s._id) },
    date:    { $gte: new Date(from), $lte: new Date(to) }
  };
  const records = await StudentAttendance.find(attFilter).lean();

  // Build map: studentId → { Present, Absent, Late }
  const map = {};
  records.forEach(r => {
    const key = String(r.student);
    if (!map[key]) map[key] = { Present: 0, Absent: 0, Late: 0, Leave: 0 };
    map[key][r.status] = (map[key][r.status] || 0) + 1;
  });

  const rows = students.map(s => ({
    admissionNumber: s.admissionNumber || '',
    studentName:     s.studentName,
    program:         s.program,
    section:         s.section || '',
    present:         map[String(s._id)]?.Present || 0,
    absent:          map[String(s._id)]?.Absent  || 0,
    late:            map[String(s._id)]?.Late    || 0,
    leave:           map[String(s._id)]?.Leave   || 0
  }));

  const headers = ['admissionNumber','studentName','program','section','present','absent','late','leave'];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-${Date.now()}.csv"`);
  res.send(toCSV(headers, rows));
});
