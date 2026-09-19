import FeeStructure from '../models/FeeStructure.js';
import FeePayment from '../models/FeePayment.js';
import Student from '../models/Student.js';
import AcademicSession from '../models/AcademicSession.js';
import ExcelJS from 'exceljs';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { buildQuery, paginate } from '../utils/apiFeatures.js';

const FEE_EXPORT_HEADERS = [
  'S NO.',
  'ADM. NO.',
  'STUDENT NAME',
  'CLASS',
  'DATE OF BIRTH',
  'PARENT/GUARDIAN',
  'MOBILE NUMBER',
  'REMARKS',
  'TOTAL FEES',
  'FEES PAID',
  'REGISTRATION FEE',
  'ADMISSION FEE',
  'TERM 1 FEE',
  'TERM 2 FEE',
  'TERM 3 FEE',
  'FEES DUE'
];

const CLASS_ORDER = ['PLAY GROUP', 'NURSERY', 'LKG', 'UKG'];

function classRank(program = '') {
  const idx = CLASS_ORDER.indexOf(String(program).trim().toUpperCase());
  return idx === -1 ? CLASS_ORDER.length : idx;
}

function formatDateForExport(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN');
}

function numberValue(value) {
  return Number(value || 0);
}

function normalizeFeePayload(payload) {
  if (payload.studentId && !payload.student) payload.student = payload.studentId;
  delete payload.studentId;
  ['month','transactionId','chequeNumber','discountReason','notes'].forEach(field => {
    if (payload[field] === '') delete payload[field];
  });
  ['baseAmount','amountPaid','discount','scholarship','lateFee','registrationFee','admissionFee','term1Fee','term2Fee','term3Fee','year'].forEach(field => {
    if (payload[field] === '') delete payload[field];
    else if (payload[field] !== undefined) payload[field] = Number(payload[field]);
  });
  if (payload.baseAmount !== undefined || payload.amountPaid !== undefined || payload.discount !== undefined || payload.scholarship !== undefined || payload.lateFee !== undefined) {
    const baseAmount = numberValue(payload.baseAmount);
    const discount = numberValue(payload.discount);
    const scholarship = numberValue(payload.scholarship);
    const lateFee = numberValue(payload.lateFee);
    const amountPaid = numberValue(payload.amountPaid);
    payload.totalAmount = baseAmount - discount - scholarship + lateFee;
    payload.balance = payload.totalAmount - amountPaid;
    if (payload.balance <= 0) payload.status = 'Paid';
    else if (amountPaid > 0) payload.status = 'Partial';
    else payload.status = 'Pending';
  }
  return payload;
}

function buildFeeExportRows(students, paymentsByStudent) {
  const sorted = [...students].sort((a, b) => {
    const classDiff = classRank(a.program) - classRank(b.program);
    if (classDiff) return classDiff;
    return String(a.studentName || '').localeCompare(String(b.studentName || ''), 'en', { sensitivity: 'base' });
  });

  return sorted.map((student, index) => {
    const payments = paymentsByStudent.get(String(student._id)) || [];
    const totals = payments.reduce((acc, payment) => {
      acc.totalFees += numberValue(payment.totalAmount);
      acc.feesPaid += numberValue(payment.amountPaid);
      acc.registrationFee += numberValue(payment.registrationFee);
      acc.admissionFee += numberValue(payment.admissionFee);
      acc.term1Fee += numberValue(payment.term1Fee);
      acc.term2Fee += numberValue(payment.term2Fee);
      acc.term3Fee += numberValue(payment.term3Fee);
      if (payment.notes) acc.remarks.push(payment.notes);
      return acc;
    }, {
      totalFees: 0,
      feesPaid: 0,
      registrationFee: 0,
      admissionFee: 0,
      term1Fee: 0,
      term2Fee: 0,
      term3Fee: 0,
      remarks: []
    });
    const feesDue = totals.totalFees - totals.feesPaid;

    return {
      'S NO.': index + 1,
      'ADM. NO.': student.admissionNumber || '',
      'STUDENT NAME': student.studentName || '',
      'CLASS': student.program || '',
      'DATE OF BIRTH': formatDateForExport(student.dateOfBirth),
      'PARENT/GUARDIAN': student.parentName || student.parent?.fatherName || student.parent?.motherName || student.guardianName || '',
      'MOBILE NUMBER': student.phone || student.parent?.fatherPhone || student.fatherPhone || student.motherPhone || student.guardianPhone || '',
      'REMARKS': [...new Set(totals.remarks)].join('; '),
      'TOTAL FEES': totals.totalFees,
      'FEES PAID': totals.feesPaid,
      'REGISTRATION FEE': totals.registrationFee,
      'ADMISSION FEE': totals.admissionFee,
      'TERM 1 FEE': totals.term1Fee,
      'TERM 2 FEE': totals.term2Fee,
      'TERM 3 FEE': totals.term3Fee,
      'FEES DUE': feesDue
    };
  });
}

/* ── Receipt-number generator: VPS-2024-00001 ────────────────────── */
async function generateReceiptNumber() {
  const year   = new Date().getFullYear();
  const prefix = `VPS-${year}-`;
  const last   = await FeePayment.findOne(
    { receiptNumber: { $regex: `^${prefix}` } },
    { receiptNumber: 1 }
  ).sort({ receiptNumber: -1 });
  const seq = last ? parseInt(last.receiptNumber.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

/* ═══════════════ FEE STRUCTURE ═══════════════════════════════════ */

export const listFeeStructures = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.session) filter.session  = req.query.session;
  if (req.query.program) filter.program  = req.query.program;
  if (req.query.feeType) filter.feeType  = req.query.feeType;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const { items, pagination } = await paginate(
    FeeStructure, filter, req.query,
    [{ path: 'session', select: 'name' }]
  );
  ok(res, { data: items, pagination });
});

export const getFeeStructure = asyncHandler(async (req, res) => {
  const doc = await FeeStructure.findById(req.params.id).populate('session', 'name');
  if (!doc) { const e = new Error('Fee structure not found'); e.status = 404; throw e; }
  ok(res, { data: doc });
});

export const createFeeStructure = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (!payload.session) {
    const active = await AcademicSession.findOne({ isActive: true });
    if (active) payload.session = active._id;
  }
  const doc = await FeeStructure.create(payload);
  ok(res, { status: 201, message: 'Fee structure created', data: doc });
});

export const updateFeeStructure = asyncHandler(async (req, res) => {
  const doc = await FeeStructure.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true
  });
  if (!doc) { const e = new Error('Fee structure not found'); e.status = 404; throw e; }
  ok(res, { message: 'Fee structure updated', data: doc });
});

export const deleteFeeStructure = asyncHandler(async (req, res) => {
  const doc = await FeeStructure.findByIdAndDelete(req.params.id);
  if (!doc) { const e = new Error('Fee structure not found'); e.status = 404; throw e; }
  ok(res, { message: 'Fee structure deleted' });
});

/* ═══════════════ FEE PAYMENTS ════════════════════════════════════ */

export const listFeePayments = asyncHandler(async (req, res) => {
  const filter = buildQuery(req.query, []);
  if (req.query.student)  filter.student  = req.query.student;
  if (req.query.session)  filter.session  = req.query.session;
  if (req.query.status)   filter.status   = req.query.status;
  if (req.query.feeType)  filter.feeType  = req.query.feeType;
  if (req.query.month)    filter.month    = req.query.month;
  if (req.query.year)     filter.year     = Number(req.query.year);

  const { items, pagination } = await paginate(
    FeePayment, filter, req.query,
    [
      { path: 'student', select: 'studentName admissionNumber program section' },
      { path: 'session', select: 'name' },
      { path: 'paidBy',  select: 'name email' }
    ]
  );
  ok(res, { data: items, pagination });
});

export const getFeePayment = asyncHandler(async (req, res) => {
  const doc = await FeePayment.findById(req.params.id)
    .populate('student', 'studentName admissionNumber program section parentName phone')
    .populate('parent', 'fatherName motherName fatherPhone')
    .populate('session', 'name')
    .populate('paidBy', 'name email');
  if (!doc) { const e = new Error('Fee payment not found'); e.status = 404; throw e; }
  ok(res, { data: doc });
});

export const createFeePayment = asyncHandler(async (req, res) => {
  const payload = normalizeFeePayload({ ...req.body });
  payload.receiptNumber = await generateReceiptNumber();
  payload.paidBy        = req.admin.id;

  if (!payload.session) {
    const active = await AcademicSession.findOne({ isActive: true });
    if (active) payload.session = active._id;
  }

  // Fetch parent from student if not provided
  if (!payload.parent && payload.student) {
    const stu = await Student.findById(payload.student, 'parent');
    if (stu?.parent) payload.parent = stu.parent;
  }

  const doc = await FeePayment.create(payload);
  ok(res, { status: 201, message: 'Payment recorded', data: doc });
});

export const updateFeePayment = asyncHandler(async (req, res) => {
  const existing = await FeePayment.findById(req.params.id).lean();
  if (!existing) { const e = new Error('Fee payment not found'); e.status = 404; throw e; }
  const payload = normalizeFeePayload({ ...existing, ...req.body });
  delete payload._id;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.__v;
  const doc = await FeePayment.findByIdAndUpdate(req.params.id, payload, {
    new: true, runValidators: true
  });
  if (!doc) { const e = new Error('Fee payment not found'); e.status = 404; throw e; }
  ok(res, { message: 'Fee payment updated', data: doc });
});

export const deleteFeePayment = asyncHandler(async (req, res) => {
  const doc = await FeePayment.findByIdAndDelete(req.params.id);
  if (!doc) { const e = new Error('Fee payment not found'); e.status = 404; throw e; }
  ok(res, { message: 'Fee payment deleted' });
});

/* ── SUMMARY: dues for a student ────────────────────────────────── */
export const studentFeeSummary = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const payments = await FeePayment.find({ student: studentId })
    .populate('session', 'name')
    .sort('-createdAt');

  const totalPaid    = payments.filter(p => ['Paid','Partial'].includes(p.status)).reduce((s, p) => s + p.amountPaid, 0);
  const totalBalance = payments.reduce((s, p) => s + (p.balance || 0), 0);

  ok(res, { data: { payments, totalPaid, totalBalance } });
});

/* ── MONTHLY COLLECTION SUMMARY ─────────────────────────────────── */
export const monthlyCollection = asyncHandler(async (req, res) => {
  const year    = Number(req.query.year || new Date().getFullYear());
  const session = req.query.session;
  const filter  = { year, status: { $in: ['Paid', 'Partial'] } };
  if (session) filter.session = session;

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const agg = await FeePayment.aggregate([
    { $match: filter },
    { $group: { _id: '$month', total: { $sum: '$amountPaid' }, count: { $sum: 1 } } }
  ]);

  const result = months.map(m => {
    const found = agg.find(a => a._id === m);
    return { month: m, total: found?.total || 0, count: found?.count || 0 };
  });

  ok(res, { data: result });
});

export const exportFees = asyncHandler(async (req, res) => {
  const studentFilter = { isActive: true };
  if (req.query.program && req.query.program !== 'All Classes') {
    studentFilter.program = req.query.program;
  }

  const students = await Student.find(
    studentFilter,
    'admissionNumber studentName program dateOfBirth parentName phone fatherPhone motherPhone guardianName guardianPhone'
  )
    .populate('parent', 'fatherName motherName fatherPhone')
    .lean();

  const payments = await FeePayment.find(
    { student: { $in: students.map(student => student._id) } },
    'student totalAmount amountPaid registrationFee admissionFee term1Fee term2Fee term3Fee notes'
  ).lean();

  const paymentsByStudent = payments.reduce((map, payment) => {
    const key = String(payment.student);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(payment);
    return map;
  }, new Map());

  const rows = buildFeeExportRows(students, paymentsByStudent);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Vedantam Play School ERP';
  const worksheet = workbook.addWorksheet('Fees Report');
  worksheet.columns = FEE_EXPORT_HEADERS.map(header => ({ header, key: header, width: Math.max(header.length + 2, 14) }));
  rows.forEach(row => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  const today = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Fees_Report_${today}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});
