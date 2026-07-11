/**
 * Admin management of Parent Portal access.
 * Allows admin to activate/deactivate portal, set credentials, reset passwords.
 */
import Parent from '../models/Parent.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';

/* ── LIST PARENTS WITH PORTAL STATUS ────────────────────────────── */
export const listPortalParents = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.isPortalActive !== undefined) filter.isPortalActive = req.query.isPortalActive === 'true';
  if (req.query.search) {
    const q = req.query.search.trim();
    filter.$or = [
      { fatherName: new RegExp(q, 'i') },
      { motherName: new RegExp(q, 'i') },
      { fatherPhone: new RegExp(q, 'i') },
      { motherPhone: new RegExp(q, 'i') },
      { portalEmail: new RegExp(q, 'i') }
    ];
  }

  const parents = await Parent.find(filter)
    .populate('students', 'studentName program section admissionNumber')
    .select('fatherName motherName fatherPhone motherPhone portalEmail isPortalActive isActive lastLoginAt mustChangePassword students')
    .sort('fatherName')
    .lean();

  ok(res, { data: parents });
});

/* ── ACTIVATE / SET CREDENTIALS ─────────────────────────────────── */
export const activatePortal = asyncHandler(async (req, res) => {
  const { portalEmail, password } = req.body;
  if (!portalEmail || !password) {
    const e = new Error('portalEmail and password are required'); e.status = 400; throw e;
  }
  if (password.length < 6) {
    const e = new Error('Password must be at least 6 characters'); e.status = 400; throw e;
  }

  // Check uniqueness of portalEmail
  const existing = await Parent.findOne({ portalEmail: portalEmail.toLowerCase().trim(), _id: { $ne: req.params.id } });
  if (existing) {
    const e = new Error('This email is already used for another parent portal'); e.status = 400; throw e;
  }

  const parent = await Parent.findById(req.params.id);
  if (!parent) { const e = new Error('Parent not found'); e.status = 404; throw e; }

  parent.portalEmail        = portalEmail.toLowerCase().trim();
  parent.password           = password;
  parent.mustChangePassword = true;
  parent.isPortalActive     = true;
  await parent.save();

  ok(res, { message: 'Parent portal activated successfully', data: { portalEmail: parent.portalEmail, isPortalActive: true } });
});

/* ── DEACTIVATE PORTAL ───────────────────────────────────────────── */
export const deactivatePortal = asyncHandler(async (req, res) => {
  const parent = await Parent.findByIdAndUpdate(
    req.params.id,
    { isPortalActive: false },
    { new: true }
  );
  if (!parent) { const e = new Error('Parent not found'); e.status = 404; throw e; }
  ok(res, { message: 'Parent portal deactivated' });
});

/* ── RESET PASSWORD ──────────────────────────────────────────────── */
export const resetParentPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    const e = new Error('New password must be at least 6 characters'); e.status = 400; throw e;
  }

  const parent = await Parent.findById(req.params.id);
  if (!parent) { const e = new Error('Parent not found'); e.status = 404; throw e; }

  parent.password           = newPassword;
  parent.mustChangePassword = true;
  await parent.save();

  ok(res, { message: 'Password reset successfully. Parent must change password on next login.' });
});
