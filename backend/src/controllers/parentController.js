import Parent from '../models/Parent.js';
import Student from '../models/Student.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { buildQuery, paginate } from '../utils/apiFeatures.js';
import { uploadImage } from '../services/uploadService.js';

/* ── LIST ────────────────────────────────────────────────────────── */
export const listParents = asyncHandler(async (req, res) => {
  const filter = buildQuery(req.query, ['fatherName', 'motherName', 'fatherPhone', 'motherPhone', 'fatherEmail']);
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const { items, pagination } = await paginate(
    Parent, filter, req.query,
    [{ path: 'students', select: 'studentName program section admissionNumber isActive' }]
  );
  ok(res, { data: items, pagination });
});

/* ── GET ONE ─────────────────────────────────────────────────────── */
export const getParent = asyncHandler(async (req, res) => {
  const doc = await Parent.findById(req.params.id)
    .populate('students', 'studentName program section admissionNumber isActive dateOfBirth photoUrl');
  if (!doc) { const e = new Error('Parent not found'); e.status = 404; throw e; }
  ok(res, { data: doc });
});

/* ── CREATE ──────────────────────────────────────────────────────── */
export const createParent = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  // Photo upload: field name 'fatherPhoto' or 'motherPhoto'
  if (req.files?.fatherPhoto?.[0]) {
    const up = await uploadImage(req.files.fatherPhoto[0], 'vedantam/parents', req);
    payload.fatherPhotoUrl      = up.url;
    payload.fatherPhotoPublicId = up.publicId;
  }
  if (req.files?.motherPhoto?.[0]) {
    const up = await uploadImage(req.files.motherPhoto[0], 'vedantam/parents', req);
    payload.motherPhotoUrl      = up.url;
    payload.motherPhotoPublicId = up.publicId;
  }
  const doc = await Parent.create(payload);
  ok(res, { status: 201, message: 'Parent created successfully', data: doc });
});

/* ── UPDATE ──────────────────────────────────────────────────────── */
export const updateParent = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (req.files?.fatherPhoto?.[0]) {
    const up = await uploadImage(req.files.fatherPhoto[0], 'vedantam/parents', req);
    payload.fatherPhotoUrl      = up.url;
    payload.fatherPhotoPublicId = up.publicId;
  }
  if (req.files?.motherPhoto?.[0]) {
    const up = await uploadImage(req.files.motherPhoto[0], 'vedantam/parents', req);
    payload.motherPhotoUrl      = up.url;
    payload.motherPhotoPublicId = up.publicId;
  }
  const doc = await Parent.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    .populate('students', 'studentName program section');
  if (!doc) { const e = new Error('Parent not found'); e.status = 404; throw e; }
  ok(res, { message: 'Parent updated', data: doc });
});

/* ── DELETE ──────────────────────────────────────────────────────── */
export const deleteParent = asyncHandler(async (req, res) => {
  const doc = await Parent.findByIdAndDelete(req.params.id);
  if (!doc) { const e = new Error('Parent not found'); e.status = 404; throw e; }
  // Unlink parent from students
  await Student.updateMany({ parent: doc._id }, { $unset: { parent: '' } });
  ok(res, { message: 'Parent deleted' });
});

/* ── LINK STUDENT to PARENT ──────────────────────────────────────── */
export const linkStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  const parent  = await Parent.findById(req.params.id);
  if (!parent) { const e = new Error('Parent not found'); e.status = 404; throw e; }
  const student = await Student.findById(studentId);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  await Parent.findByIdAndUpdate(req.params.id, { $addToSet: { students: studentId } });
  await Student.findByIdAndUpdate(studentId, { parent: req.params.id, parentName: parent.fatherName || parent.motherName });

  ok(res, { message: 'Student linked to parent' });
});
