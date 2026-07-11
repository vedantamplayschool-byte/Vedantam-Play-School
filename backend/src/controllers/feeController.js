import FeeStructure from '../models/FeeStructure.js';
import FeePayment from '../models/FeePayment.js';
import Student from '../models/Student.js';
import AcademicSession from '../models/AcademicSession.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { buildQuery, paginate } from '../utils/apiFeatures.js';

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
  const payload = { ...req.body };
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
  const doc = await FeePayment.findByIdAndUpdate(req.params.id, req.body, {
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
