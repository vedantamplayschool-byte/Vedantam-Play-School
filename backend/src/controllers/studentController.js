import Student        from '../models/Student.js';
import Parent         from '../models/Parent.js';
import Admission      from '../models/Admission.js';
import AcademicSession from '../models/AcademicSession.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';
import { buildQuery, paginate } from '../utils/apiFeatures.js';
import { uploadImage }  from '../services/uploadService.js';
import { fallbackPortalEmail, assignAlphabeticalRollNumbers } from '../utils/generateCredentials.js';

/* ── Student ID generator: VPS2026001 ─────────────────────────────
   VPS = Vedantam Play School, YYYY = admission/session year, and the
   final 3 digits mirror the generated admission sequence. */
async function generateAdmissionNumber(sessionId, admissionDate) {
  let year = admissionDate ? new Date(admissionDate).getFullYear() : new Date().getFullYear();

  if (sessionId) {
    const session = await AcademicSession.findById(sessionId).lean();
    const sessionYear = session?.startDate ? new Date(session.startDate).getFullYear() : parseInt(String(session?.name || '').match(/\d{4}/)?.[0], 10);
    if (sessionYear) year = sessionYear;
  }

  const prefix = `VPS${year}`;
  const last = await Student.findOne(
    { admissionNumber: { $regex: `^${prefix}\\d{3}$` } },
    { admissionNumber: 1 }
  ).sort({ admissionNumber: -1 }).lean();
  const seq = last ? parseInt(last.admissionNumber.slice(-3), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

function assertAdminParentPassword(password) {
  if (!password || String(password).length < 6) {
    const e = new Error('Parent portal password must be set by admin and be at least 6 characters');
    e.status = 400; throw e;
  }
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

  if (!payload.session) {
    const active = await AcademicSession.findOne({ isActive: true });
    if (active) payload.session = active._id;
  }

  // Always auto-generate Student ID / admission number; admins never enter it manually.
  payload.admissionNumber = await generateAdmissionNumber(payload.session, payload.admissionDate);

  // Roll number will be assigned after create via alphabetical reorder
  delete payload.rollNumber;

  if (req.file) {
    const uploaded = await uploadImage(req.file, 'vedantam/students', req);
    payload.photoUrl      = uploaded.url;
    payload.photoPublicId = uploaded.publicId;
  }

  /* ── Auto-create / link Parent record with admin-set portal password ─ */
  const parentPassword = payload.parentPassword;
  delete payload.parentPassword;
  let parentCredentials = null;
  if (!payload.parent) {
    const fPhone = (payload.fatherPhone || '').trim();
    const mPhone = (payload.motherPhone || '').trim();

    if (fPhone || mPhone) {
      const phoneOrClauses = [];
      if (fPhone) phoneOrClauses.push({ fatherPhone: fPhone });
      if (mPhone) phoneOrClauses.push({ motherPhone: mPhone });

      let parent = await Parent.findOne({ $or: phoneOrClauses }).select('+password');

      if (!parent) {
        assertAdminParentPassword(parentPassword);
        parent = await Parent.create({
          fatherName:       payload.fatherName       || undefined,
          fatherPhone:      fPhone                   || undefined,
          fatherOccupation: payload.fatherOccupation || undefined,
          motherName:       payload.motherName       || undefined,
          motherPhone:      mPhone                   || undefined,
          motherOccupation: payload.motherOccupation || undefined,
          guardianName:     payload.guardianName     || undefined,
          guardianPhone:    payload.guardianPhone     || undefined,
          guardianRelation: payload.guardianRelation  || undefined,
          portalEmail:       fallbackPortalEmail(fPhone || mPhone),
          password:          parentPassword,
          mustChangePassword: false,
          isPortalActive:    true,
          autoGenerated:     false
        });

        parentCredentials = {
          isNew: true,
          studentId: payload.admissionNumber,
          password: parentPassword,
          loginNote: 'Parent Portal username is the Student ID. Password is set and reset only by admin.'
        };
      } else if (parentPassword) {
        parent.password = parentPassword;
        parent.mustChangePassword = false;
        parent.isPortalActive = true;
        parent.autoGenerated = false;
        await parent.save();
      }

      payload.parent = parent._id;
    }
  }

  const doc = await Student.create(payload);

  // Link student to parent
  if (doc.parent) {
    await Parent.findByIdAndUpdate(doc.parent, { $addToSet: { students: doc._id } });
  }

  // Re-assign roll numbers alphabetically for the entire class
  if (doc.program) await assignAlphabeticalRollNumbers(Student, doc.program, doc.section || '');
  const updatedDoc = await Student.findById(doc._id).populate('parent session');

  ok(res, {
    status: 201,
    message: 'Student created successfully',
    data: updatedDoc,
    ...(parentCredentials ? { parentCredentials } : {})
  });
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
  // Re-sort roll numbers if name or class changed
  const nameChanged    = payload.studentName && payload.studentName !== old.studentName;
  const programChanged = payload.program     && payload.program     !== old.program;
  if (nameChanged || programChanged) {
    await assignAlphabeticalRollNumbers(Student, doc.program, doc.section || '');
    if (programChanged) await assignAlphabeticalRollNumbers(Student, old.program, old.section || '');
  }
  const refreshed = await Student.findById(doc._id).populate('parent session');
  ok(res, { message: 'Student updated', data: refreshed });
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
  const { parentPassword, admissionNumber: _ignoredAdmissionNumber, ...studentOverrides } = req.body;
  const active = await AcademicSession.findOne({ isActive: true });
  const admNo  = await generateAdmissionNumber(active?._id, adm.admissionDate || adm.createdAt);
  const program = studentOverrides.program || adm.program;

  const student = await Student.create({
    admission: adm._id, admissionNumber: admNo,
    studentName: adm.studentName, parentName: adm.parentName,
    phone: adm.phone, program,
    dateOfBirth: adm.dateOfBirth, address: adm.address,
    gender: adm.gender, session: active?._id, admissionDate: new Date(),
    status: 'Active',
    ...studentOverrides,
    admissionNumber: admNo
  });

  // Re-assign roll numbers alphabetically for the enrolled class
  await assignAlphabeticalRollNumbers(Student, program, req.body.section || '');

  /* ── Provision parent portal credentials from admin-supplied password ─
     Parent Portal username is the Student ID (student.admissionNumber). */
  let parent = await Parent.findOne({
    $or: [{ fatherPhone: adm.phone }, { motherPhone: adm.phone }]
  }).select('+password');

  let parentCredentials = null;
  if (parent) {
    if (parentPassword) {
      parent.password = parentPassword;
      parent.mustChangePassword = false;
      parent.isPortalActive = true;
      parent.autoGenerated = false;
      await parent.save();
    }
    await Parent.findByIdAndUpdate(parent._id, { $addToSet: { students: student._id } });
  } else {
    assertAdminParentPassword(parentPassword);
    parent = await Parent.create({
      fatherName:  adm.fatherName || adm.parentName,
      fatherPhone: adm.fatherPhone || adm.phone,
      fatherEmail: adm.email || '',
      motherName:  adm.motherName,
      motherPhone: adm.motherPhone,
      students:    [student._id],
      portalEmail: (adm.email && adm.email.trim()) ? adm.email.trim().toLowerCase() : fallbackPortalEmail(adm.phone),
      password:    parentPassword,
      mustChangePassword: false,
      isPortalActive: true,
      autoGenerated: false
    });
    parentCredentials = { studentId: admNo, password: parentPassword, isNew: true };
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
