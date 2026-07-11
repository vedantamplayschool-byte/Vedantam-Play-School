/**
 * Admin-facing routes to manage teacher portal access:
 *  - Set / reset a teacher's password so they can log in
 *  - List leave requests and approve/reject them
 *  - View all homework entries
 */
import { Router }             from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Teacher                from '../models/Teacher.js';
import LeaveRequest           from '../models/LeaveRequest.js';
import Homework               from '../models/Homework.js';
import { asyncHandler }       from '../utils/asyncHandler.js';
import { ok }                 from '../utils/apiResponse.js';

const r = Router();
r.use(protect, authorize('super_admin', 'admin', 'principal'));

/* ── SET / RESET TEACHER PORTAL PASSWORD ─────────────────────────── */
r.put('/:id/portal-access', asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    const e = new Error('Password must be at least 6 characters'); e.status = 400; throw e;
  }
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) { const e = new Error('Teacher not found'); e.status = 404; throw e; }
  teacher.password = password;
  teacher.mustChangePassword = true;
  await teacher.save();
  ok(res, { message: 'Teacher portal access updated. Teacher must change password on first login.' });
}));

/* ── REVOKE PORTAL ACCESS ────────────────────────────────────────── */
r.delete('/:id/portal-access', asyncHandler(async (req, res) => {
  await Teacher.findByIdAndUpdate(req.params.id, {
    $unset: { password: 1 },
    mustChangePassword: true
  });
  ok(res, { message: 'Teacher portal access revoked' });
}));

/* ── LIST ALL LEAVE REQUESTS ─────────────────────────────────────── */
r.get('/leave-requests', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status)  filter.status  = req.query.status;
  if (req.query.teacher) filter.teacher = req.query.teacher;

  const items = await LeaveRequest.find(filter)
    .sort('-date')
    .limit(100)
    .populate('teacher', 'name employeeId designation photoUrl')
    .populate('approvedBy', 'name')
    .lean();

  ok(res, { data: items });
}));

/* ── APPROVE / REJECT LEAVE REQUEST ─────────────────────────────── */
r.patch('/leave-requests/:id', asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    const e = new Error('Status must be Approved or Rejected'); e.status = 400; throw e;
  }
  const doc = await LeaveRequest.findByIdAndUpdate(
    req.params.id,
    { status, remarks, approvedBy: req.admin._id, approvedAt: new Date() },
    { new: true }
  ).populate('teacher', 'name');
  if (!doc) { const e = new Error('Leave request not found'); e.status = 404; throw e; }
  ok(res, { message: `Leave request ${status.toLowerCase()}`, data: doc });
}));

/* ── LIST ALL HOMEWORK ───────────────────────────────────────────── */
r.get('/homework', asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.teacher) filter.teacher = req.query.teacher;
  if (req.query.program) filter.program = req.query.program;
  const items = await Homework.find(filter)
    .sort('-dueDate')
    .limit(100)
    .populate('teacher', 'name employeeId')
    .populate('session', 'name')
    .lean();
  ok(res, { data: items });
}));

export default r;
