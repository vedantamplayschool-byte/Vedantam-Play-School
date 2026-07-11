import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import Admission from '../models/Admission.js';
import AcademicSession from '../models/AcademicSession.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { buildQuery, paginate } from '../utils/apiFeatures.js';
import { uploadImage } from '../services/uploadService.js';

/* ── Admission-number generator: VPS/2024/00001 ─────────────────── */
async function generateAdmissionNumber() {
  const year   = new Date().getFullYear();
  const prefix = `VPS/${year}/`;
  const last   = await Student.findOne(
    { admissionNumber: { $regex: `^${prefix}` } },
    { admissionNumber: 1 }
  ).sort({ admissionNumber: -1 });
  const seq = last
    ? parseInt(last.admissionNumber.split('/')[2], 10) + 1
    : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

/* ── LIST ────────────────────────────────────────────────────────── */
export const listStudents = asyncHandler(async (req, res) => {
  const filter = {
    ...buildQuery(req.query, ['studentName', 'parentName', 'phone', 'admissionNumber'])
  };

  // Extra filters
  if (req.query.program)   filter.program   = req.query.program;
  if (req.query.section)   filter.section   = req.query.section;
  if (req.query.status)    filter.status    = req.query.status;
  if (req.query.session)   filter.session   = req.query.session;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const { items, pagination } = await paginate(
    Student,
    filter,
    req.query,
    [{ path: 'parent', select: 'fatherName motherName fatherPhone motherPhone' },
     { path: 'session', select: 'name' }]
  );
  ok(res, { data: items, pagination });
});

/* ── GET ONE ─────────────────────────────────────────────────────── */
export const getStudent = asyncHandler(async (req, res) => {
  const doc = await Student.findById(req.params.id)
    .populate('parent')
    .populate('session', 'name')
    .populate('admission', 'status createdAt');
  if (!doc) { const e = new Error('Student not found'); e.status = 404; throw e; }
  ok(res, { data: doc });
});

/* ── CREATE ──────────────────────────────────────────────────────── */
export const createStudent = asyncHandler(async (req, res) => {
  const payload = { ...req.body };

  // Auto-generate admission number
  if (!payload.admissionNumber) {
    payload.admissionNumber = await generateAdmissionNumber();
  }

  // Handle photo upload
  if (req.file) {
    const uploaded = await uploadImage(req.file, 'vedantam/students', req);
    payload.photoUrl       = uploaded.url;
    payload.photoPublicId  = uploaded.publicId;
  }

  // Set session to active session if not provided
  if (!payload.session) {
    const active = await AcademicSession.findOne({ isActive: true });
    if (active) payload.session = active._id;
  }

  const doc = await Student.create(payload);

  // Link student to parent record
  if (doc.parent) {
    await Parent.findByIdAndUpdate(doc.parent, { $addToSet: { students: doc._id } });
  }

  ok(res, { status: 201, message: 'Student created successfully', data: doc });
});

/* ── UPDATE ──────────────────────────────────────────────────────── */
export const updateStudent = asyncHandler(async (req, res) => {
  const payload = { ...req.body };

  if (req.file) {
    const uploaded = await uploadImage(req.file, 'vedantam/students', req);
    payload.photoUrl      = uploaded.url;
    payload.photoPublicId = uploaded.publicId;
  }

  const old = await Student.findById(req.params.id);
  if (!old) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const doc = await Student.findByIdAndUpdate(req.params.id, payload, {
    new: true, runValidators: true
  }).populate('parent session');

  // Update parent link if changed
  if (payload.parent && String(payload.parent) !== String(old.parent)) {
    if (old.parent) await Parent.findByIdAndUpdate(old.parent, { $pull: { students: doc._id } });
    await Parent.findByIdAndUpdate(payload.parent, { $addToSet: { students: doc._id } });
  }

  ok(res, { message: 'Student updated', data: doc });
});

/* ── DELETE ──────────────────────────────────────────────────────── */
export const deleteStudent = asyncHandler(async (req, res) => {
  const doc = await Student.findByIdAndDelete(req.params.id);
  if (!doc) { const e = new Error('Student not found'); e.status = 404; throw e; }
  if (doc.parent) await Parent.findByIdAndUpdate(doc.parent, { $pull: { students: doc._id } });
  ok(res, { message: 'Student deleted' });
});

/* ── CONVERT ADMISSION → STUDENT ─────────────────────────────────── */
export const convertAdmission = asyncHandler(async (req, res) => {
  const adm = await Admission.findById(req.params.admissionId);
  if (!adm) { const e = new Error('Admission not found'); e.status = 404; throw e; }
  if (adm.status !== 'Approved') {
    const e = new Error('Admission must be Approved before converting to student');
    e.status = 400; throw e;
  }
  if (adm.student) {
    const e = new Error('Admission already converted to a student');
    e.status = 409; throw e;
  }

  const admNo = await generateAdmissionNumber();
  const active = await AcademicSession.findOne({ isActive: true });

  const student = await Student.create({
    admission:       adm._id,
    admissionNumber: admNo,
    studentName:     adm.studentName,
    parentName:      adm.parentName,
    phone:           adm.phone,
    program:         adm.program,
    dateOfBirth:     adm.dateOfBirth,
    address:         adm.address,
    gender:          adm.gender,
    session:         active?._id,
    admissionDate:   new Date(),
    ...req.body      // allow extra fields from request
  });

  adm.student = student._id;
  adm.status  = 'Approved'; // keep approved
  await adm.save();

  ok(res, { status: 201, message: 'Admission converted to student', data: student });
});

/* ── ARCHIVE / RESTORE ───────────────────────────────────────────── */
export const archiveStudent = asyncHandler(async (req, res) => {
  const doc = await Student.findByIdAndUpdate(
    req.params.id,
    { isActive: false, status: 'Inactive' },
    { new: true }
  );
  if (!doc) { const e = new Error('Student not found'); e.status = 404; throw e; }
  ok(res, { message: 'Student archived', data: doc });
});

export const restoreStudent = asyncHandler(async (req, res) => {
  const doc = await Student.findByIdAndUpdate(
    req.params.id,
    { isActive: true, status: 'Active' },
    { new: true }
  );
  if (!doc) { const e = new Error('Student not found'); e.status = 404; throw e; }
  ok(res, { message: 'Student restored', data: doc });
});

/* ── ADD DOCUMENT ────────────────────────────────────────────────── */
export const addDocument = asyncHandler(async (req, res) => {
  if (!req.file) { const e = new Error('Document file is required'); e.status = 400; throw e; }
  const uploaded = await uploadImage(req.file, 'vedantam/student-docs', req);
  const doc = await Student.findByIdAndUpdate(
    req.params.id,
    { $push: { documents: { docType: req.body.docType || 'Other', url: uploaded.url, publicId: uploaded.publicId } } },
    { new: true }
  );
  if (!doc) { const e = new Error('Student not found'); e.status = 404; throw e; }
  ok(res, { message: 'Document added', data: doc });
});
