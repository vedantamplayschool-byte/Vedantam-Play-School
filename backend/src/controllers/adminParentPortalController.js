/**
 * Admin management of Parent Portal profiles and access.
 * Profile/contact data is managed first; credentials are activated second.
 */
import Parent from '../models/Parent.js';
import Student from '../models/Student.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';

const PROFILE_FIELDS = [
  'fatherName', 'fatherPhone', 'fatherWhatsApp', 'fatherEmail', 'fatherOccupation',
  'motherName', 'motherPhone', 'motherWhatsApp', 'motherEmail', 'motherOccupation',
  'guardianName', 'guardianPhone', 'guardianRelation',
  'address', 'city', 'state', 'pincode', 'annualIncome', 'notes', 'isActive'
];

function primaryParentName(parent) {
  return parent.fatherName || parent.motherName || parent.guardianName || '';
}

function primaryPhone(parent) {
  return parent.fatherPhone || parent.motherPhone || parent.guardianPhone || '';
}

function primaryEmail(parent) {
  return parent.fatherEmail || parent.motherEmail || parent.portalEmail || '';
}


async function refreshParentStudentList(parentId) {
  const linkedStudents = await Student.find({ parent: parentId }).select('_id').lean();
  await Parent.findByIdAndUpdate(parentId, { students: linkedStudents.map(s => s._id) }, { runValidators: true });
}

async function syncStudentParentSnapshot(student, parent) {
  student.parent = parent._id;
  student.fatherName = parent.fatherName || student.fatherName;
  student.fatherPhone = parent.fatherPhone || student.fatherPhone;
  student.fatherOccupation = parent.fatherOccupation || student.fatherOccupation;
  student.motherName = parent.motherName || student.motherName;
  student.motherPhone = parent.motherPhone || student.motherPhone;
  student.motherOccupation = parent.motherOccupation || student.motherOccupation;
  student.guardianName = parent.guardianName || student.guardianName;
  student.guardianPhone = parent.guardianPhone || student.guardianPhone;
  student.guardianRelation = parent.guardianRelation || student.guardianRelation;
  student.parentName = primaryParentName(parent) || student.parentName;
  student.phone = primaryPhone(parent) || student.phone;
  student.address = parent.address || student.address;
  await student.save({ validateBeforeSave: false });
}

function profileCompletion(parent) {
  const missing = [];
  if (!primaryParentName(parent)) missing.push('PARENT/GUARDIAN NAME');
  if (!primaryPhone(parent)) missing.push('MOBILE NUMBER');
  if (!parent.address) missing.push('ADDRESS');
  const students = parent.students || [];
  if (!students.length) missing.push('LINKED STUDENT');
  students.forEach((s, i) => {
    if (!s?._id) missing.push(`STUDENT ${i + 1} INTERNAL ID`);
    if (!s?.studentName) missing.push(`STUDENT ${i + 1} NAME`);
    if (!s?.program) missing.push(`STUDENT ${i + 1} CLASS`);
  });
  return { isComplete: missing.length === 0, missingFields: missing };
}

async function syncParentFromLinkedStudents(parentDoc) {
  await parentDoc.populate('students', 'studentName parentName phone program section admissionNumber address fatherName fatherPhone fatherOccupation motherName motherPhone motherOccupation guardianName guardianPhone guardianRelation isActive status');
  const student = (parentDoc.students || [])[0];
  if (!student) return parentDoc;

  let changed = false;
  const pairs = [
    ['fatherName', student.fatherName || student.parentName], ['fatherPhone', student.fatherPhone || student.phone], ['fatherOccupation', student.fatherOccupation],
    ['motherName', student.motherName], ['motherPhone', student.motherPhone], ['motherOccupation', student.motherOccupation],
    ['guardianName', student.guardianName], ['guardianPhone', student.guardianPhone], ['guardianRelation', student.guardianRelation],
    ['address', student.address]
  ];
  pairs.forEach(([key, value]) => {
    if (value !== undefined && value !== null && parentDoc[key] !== value) {
      parentDoc[key] = value;
      changed = true;
    }
  });
  if (changed) await parentDoc.save({ validateBeforeSave: false });
  return parentDoc;
}

async function getSyncedParent(id) {
  const parent = await Parent.findById(id);
  if (!parent) { const e = new Error('Parent not found'); e.status = 404; throw e; }
  await syncParentFromLinkedStudents(parent);
  await parent.populate('students', 'studentName parentName phone program section admissionNumber address fatherName fatherPhone fatherEmail motherName motherPhone motherEmail guardianName guardianPhone guardianRelation isActive status');
  return parent;
}

/* ── LIST PARENTS WITH PROFILE + PORTAL STATUS ──────────────────── */
export const listPortalParents = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.isPortalActive !== undefined) filter.isPortalActive = req.query.isPortalActive === 'true';
  if (req.query.search) {
    const q = req.query.search.trim();
    filter.$or = [
      { fatherName: new RegExp(q, 'i') }, { motherName: new RegExp(q, 'i') }, { guardianName: new RegExp(q, 'i') },
      { fatherPhone: new RegExp(q, 'i') }, { motherPhone: new RegExp(q, 'i') }, { guardianPhone: new RegExp(q, 'i') },
      { portalEmail: new RegExp(q, 'i') }
    ];
  }

  const parents = await Parent.find(filter)
    .populate('students', 'studentName parentName phone program section admissionNumber address isActive status')
    .select('fatherName motherName guardianName fatherPhone motherPhone guardianPhone fatherEmail motherEmail address city state pincode portalEmail isPortalActive isActive lastLoginAt mustChangePassword autoGenerated students')
    .sort('fatherName motherName guardianName')
    .lean();

  ok(res, { data: parents.map(p => ({ ...p, primaryParentName: primaryParentName(p), primaryPhone: primaryPhone(p), profileCompletion: profileCompletion(p) })) });
});

/* ── GET / UPDATE PROFILE ───────────────────────────────────────── */
export const getParentProfile = asyncHandler(async (req, res) => {
  const parent = await getSyncedParent(req.params.id);
  const data = parent.toObject();
  delete data.password;
  ok(res, { data: { ...data, primaryParentName: primaryParentName(data), primaryPhone: primaryPhone(data), primaryEmail: primaryEmail(data), profileCompletion: profileCompletion(data) } });
});

export const updateParentProfileByAdmin = asyncHandler(async (req, res) => {
  const payload = {};
  PROFILE_FIELDS.forEach(k => { if (req.body[k] !== undefined) payload[k] = req.body[k]; });

  const parent = await Parent.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!parent) { const e = new Error('Parent not found'); e.status = 404; throw e; }

  await parent.populate('students', '_id');
  const firstStudentId = parent.students?.[0]?._id || parent.students?.[0];
  if (firstStudentId) {
    await Student.findByIdAndUpdate(firstStudentId, {
      fatherName: parent.fatherName, fatherPhone: parent.fatherPhone, fatherOccupation: parent.fatherOccupation,
      motherName: parent.motherName, motherPhone: parent.motherPhone, motherOccupation: parent.motherOccupation,
      guardianName: parent.guardianName, guardianPhone: parent.guardianPhone, guardianRelation: parent.guardianRelation,
      parentName: primaryParentName(parent), phone: primaryPhone(parent), address: parent.address
    }, { runValidators: true });
  }

  const synced = await getSyncedParent(req.params.id);
  const data = synced.toObject();
  delete data.password;
  ok(res, { message: 'Parent profile saved', data: { ...data, profileCompletion: profileCompletion(data) } });
});

/* ── ACTIVATE / SET CREDENTIALS ─────────────────────────────────── */
export const activatePortal = asyncHandler(async (req, res) => {
  const { portalEmail, password } = req.body;
  if (!password || password.length < 6) {
    const e = new Error('Password must be at least 6 characters'); e.status = 400; throw e;
  }

  const parent = await getSyncedParent(req.params.id);
  const completion = profileCompletion(parent);
  if (!completion.isComplete) {
    const e = new Error('Please complete the Parent Profile before setting Parent Portal access.');
    e.status = 400; e.errors = completion.missingFields.map(field => ({ field, message: 'Required before portal access activation' })); throw e;
  }

  if (portalEmail) {
    const existing = await Parent.findOne({ portalEmail: portalEmail.toLowerCase().trim(), _id: { $ne: req.params.id } });
    if (existing) { const e = new Error('This email is already used for another parent portal'); e.status = 400; throw e; }
    parent.portalEmail = portalEmail.toLowerCase().trim();
  } else if (!parent.portalEmail && primaryEmail(parent)) {
    parent.portalEmail = primaryEmail(parent).toLowerCase().trim();
  }

  parent.password = password;
  parent.mustChangePassword = true;
  parent.isPortalActive = true;
  parent.autoGenerated = false;
  await parent.save();

  ok(res, { message: 'Parent portal activated successfully', data: { isPortalActive: true, studentIds: parent.students.map(s => s._id || s), username: parent.students[0]?.admissionNumber } });
});

export const deactivatePortal = asyncHandler(async (req, res) => {
  const parent = await Parent.findByIdAndUpdate(req.params.id, { isPortalActive: false }, { new: true });
  if (!parent) { const e = new Error('Parent not found'); e.status = 404; throw e; }
  ok(res, { message: 'Parent portal deactivated' });
});

export const resetParentPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) { const e = new Error('New password must be at least 6 characters'); e.status = 400; throw e; }
  const parent = await Parent.findById(req.params.id);
  if (!parent) { const e = new Error('Parent not found'); e.status = 404; throw e; }
  parent.password = newPassword;
  parent.mustChangePassword = true;
  await parent.save();
  ok(res, { message: 'Password reset successfully. Parent must change password on next login.' });
});


/* ── REPAIR LINKED CHILDREN ─────────────────────────────────────── */
export const linkStudentToParentByAdmin = asyncHandler(async (req, res) => {
  const { studentId, admissionNumber } = req.body;
  const parent = await Parent.findById(req.params.id);
  if (!parent) { const e = new Error('Parent not found'); e.status = 404; throw e; }

  const student = studentId
    ? await Student.findById(studentId)
    : await Student.findOne({ admissionNumber: String(admissionNumber || '').trim() });
  if (!student) { const e = new Error('Student not found. Enter a valid Student ID or Admission Number.'); e.status = 404; throw e; }

  const oldParentId = student.parent && String(student.parent) !== String(parent._id) ? student.parent : null;
  if (oldParentId) await Parent.findByIdAndUpdate(oldParentId, { $pull: { students: student._id } });
  await syncStudentParentSnapshot(student, parent);
  await refreshParentStudentList(parent._id);

  const synced = await getSyncedParent(parent._id);
  const data = synced.toObject();
  delete data.password;
  ok(res, { message: 'Student linked to selected parent', data: { ...data, profileCompletion: profileCompletion(data) } });
});

export const unlinkStudentFromParentByAdmin = asyncHandler(async (req, res) => {
  const parent = await Parent.findById(req.params.id);
  if (!parent) { const e = new Error('Parent not found'); e.status = 404; throw e; }

  const student = await Student.findById(req.params.studentId);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }
  if (String(student.parent || '') === String(parent._id)) {
    student.parent = undefined;
    await student.save({ validateBeforeSave: false });
  }
  await refreshParentStudentList(parent._id);

  const synced = await getSyncedParent(parent._id);
  const data = synced.toObject();
  delete data.password;
  ok(res, { message: 'Student unlinked from this parent', data: { ...data, profileCompletion: profileCompletion(data) } });
});
