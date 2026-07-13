import Student        from '../models/Student.js';
import Parent         from '../models/Parent.js';
import Admission      from '../models/Admission.js';
import AcademicSession from '../models/AcademicSession.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';
import { buildQuery, paginate } from '../utils/apiFeatures.js';
import { uploadImage }  from '../services/uploadService.js';
import { generateTempPassword, fallbackPortalEmail } from '../utils/generateCredentials.js';

/* ── Admission-number generator: VPS/2024/00001 ─────────────────── */
async function generateAdmissionNumber() {
  const year   = new Date().getFullYear();
  const prefix = `VPS/${year}/`;
  const last   = await Student.findOne(
    { admissionNumber: { $regex: `^${prefix}` } },
    { admissionNumber: 1 }
  ).sort({ admissionNumber: -1 });
  const seq = last ? parseInt(last.admissionNumber.split('/')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

/* ── LIST ────────────────────────────────────────────────────────── */
export const listStudents = asyncHandler(async (req, res) => {
  const filter = {
    ...buildQuery(req.query, ['studentName', 'parentName', 'phone', 'admissionNumber'])
  };
  if (req.query.program)   filter.program   = req.query.program;
  if (req.query.section)   filter.section   = req.query.section;
  if (req.query.status)    filter.status    = req.query.status;
  if (req.query.session)   filter.session   = req.query.session;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const { items, pagination } = await paginate(
    Student, filter, req.query,
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
  if (!payload.admissionNumber) payload.admissionNumber = await generateAdmissionNumber();
  if (req.file) {
    const uploaded = await uploadImage(req.file, 'vedantam/students', req);
    payload.photoUrl      = uploaded.url;
    payload.photoPublicId = uploaded.publicId;
  }
  if (!payload.session) {
    const active = await AcademicSession.findOne({ isActive: true });
    if (active) payload.session = active._id;
  }
  const doc = await Student.create(payload);
  if (doc.parent) await Parent.findByIdAndUpdate(doc.parent, { $addToSet: { students: doc._id } });
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
  const doc = await Student.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    .populate('parent session');
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
    const e = new Error('Admission already converted to a student'); e.status = 409; throw e;
  }
  const admNo  = await generateAdmissionNumber();
  const active = await AcademicSession.findOne({ isActive: true });
  const student = await Student.create({
    admission: adm._id, admissionNumber: admNo,
    studentName: adm.studentName, parentName: adm.parentName,
    phone: adm.phone, program: adm.program,
    dateOfBirth: adm.dateOfBirth, address: adm.address,
    gender: adm.gender, session: active?._id, admissionDate: new Date(),
    ...req.body
  });

  /* ── Auto-provision parent portal credentials ──────────────────────
     As soon as an admission becomes an enrolled student, the family
     gets parent-portal access automatically: reuse an existing Parent
     record for the same phone (so siblings share one login), otherwise
     create one and generate a temporary email/password pair. The
     credentials are returned once in this response and also kept on the
     Parent record (tempPasswordPlain) so admins can see them later in
     the Parent Portal Accounts screen until the parent changes them. */
  let parent = await Parent.findOne({
    $or: [{ fatherPhone: adm.phone }, { motherPhone: adm.phone }]
  });

  let parentCredentials = null;
  if (parent) {
    await Parent.findByIdAndUpdate(parent._id, { $addToSet: { students: student._id } });
  } else {
    const tempPassword = generateTempPassword();
    const portalEmail  = (adm.email && adm.email.trim()) ? adm.email.trim().toLowerCase() : fallbackPortalEmail(adm.phone);
    parent = await Parent.create({
      fatherName:  adm.parentName,
      fatherPhone: adm.phone,
      fatherEmail: adm.email || '',
      students:    [student._id],
      portalEmail,
      password:    tempPassword,
      mustChangePassword: true,
      isPortalActive: true,
      autoGenerated: true,
      tempPasswordPlain: tempPassword
    });
    parentCredentials = { portalEmail, password: tempPassword, isNew: true };
  }

  student.parent = parent._id;
  await student.save();

  adm.student = student._id;
  await adm.save();

  ok(res, {
    status: 201,
    message: 'Admission converted to student',
    data: student,
    parentCredentials
  });
});

/* ── ARCHIVE / RESTORE ───────────────────────────────────────────── */
export const archiveStudent = asyncHandler(async (req, res) => {
  const doc = await Student.findByIdAndUpdate(req.params.id, { isActive: false, status: 'Inactive' }, { new: true });
  if (!doc) { const e = new Error('Student not found'); e.status = 404; throw e; }
  ok(res, { message: 'Student archived', data: doc });
});

export const restoreStudent = asyncHandler(async (req, res) => {
  const doc = await Student.findByIdAndUpdate(req.params.id, { isActive: true, status: 'Active' }, { new: true });
  if (!doc) { const e = new Error('Student not found'); e.status = 404; throw e; }
  ok(res, { message: 'Student restored', data: doc });
});

/* ── ADD DOCUMENT ────────────────────────────────────────────────── */
export const addDocument = asyncHandler(async (req, res) => {
  if (!req.file) { const e = new Error('Document file is required'); e.status = 400; throw e; }
  const uploaded  = await uploadImage(req.file, 'vedantam/student-docs', req);
  const docEntry  = {
    category:  req.body.category || 'Other',
    docType:   req.body.docType  || 'Other',
    label:     req.body.label    || req.body.docType || 'Document',
    url:       uploaded.url,
    publicId:  uploaded.publicId,
    fileType:  req.file.mimetype?.includes('pdf') ? 'pdf' : 'image'
  };
  const doc = await Student.findByIdAndUpdate(
    req.params.id,
    { $push: { documents: docEntry } },
    { new: true }
  );
  if (!doc) { const e = new Error('Student not found'); e.status = 404; throw e; }
  ok(res, { message: 'Document added', data: doc });
});

/* ── DELETE DOCUMENT ─────────────────────────────────────────────── */
export const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Student.findByIdAndUpdate(
    req.params.id,
    { $pull: { documents: { _id: req.params.docId } } },
    { new: true }
  );
  if (!doc) { const e = new Error('Student not found'); e.status = 404; throw e; }
  ok(res, { message: 'Document removed', data: doc });
});

/* ── REPLACE DOCUMENT ────────────────────────────────────────────── */
export const replaceDocument = asyncHandler(async (req, res) => {
  if (!req.file) { const e = new Error('Replacement file is required'); e.status = 400; throw e; }
  const uploaded = await uploadImage(req.file, 'vedantam/student-docs', req);
  const doc = await Student.findOneAndUpdate(
    { _id: req.params.id, 'documents._id': req.params.docId },
    {
      $set: {
        'documents.$.url':      uploaded.url,
        'documents.$.publicId': uploaded.publicId,
        'documents.$.fileType': req.file.mimetype?.includes('pdf') ? 'pdf' : 'image',
        'documents.$.uploadedAt': new Date(),
        ...(req.body.label    ? { 'documents.$.label':    req.body.label }    : {}),
        ...(req.body.category ? { 'documents.$.category': req.body.category } : {}),
        ...(req.body.docType  ? { 'documents.$.docType':  req.body.docType }  : {})
      }
    },
    { new: true }
  );
  if (!doc) { const e = new Error('Student or document not found'); e.status = 404; throw e; }
  ok(res, { message: 'Document replaced', data: doc });
});

/* ── UPLOAD PARENT PHOTO ─────────────────────────────────────────── */
export const uploadParentPhoto = asyncHandler(async (req, res) => {
  const parentType = req.params.parentType; // 'father' | 'mother' | 'guardian'
  const allowed    = ['father', 'mother', 'guardian'];
  if (!allowed.includes(parentType)) {
    const e = new Error('Invalid parent type. Use: father, mother, guardian'); e.status = 400; throw e;
  }
  if (!req.file) { const e = new Error('Photo file is required'); e.status = 400; throw e; }
  const uploaded = await uploadImage(req.file, `vedantam/student-docs/${parentType}`, req);
  const update = {
    [`${parentType}PhotoUrl`]:      uploaded.url,
    [`${parentType}PhotoPublicId`]: uploaded.publicId
  };
  const doc = await Student.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!doc) { const e = new Error('Student not found'); e.status = 404; throw e; }
  ok(res, { message: `${parentType.charAt(0).toUpperCase() + parentType.slice(1)} photo updated`, data: { photoUrl: uploaded.url } });
});
