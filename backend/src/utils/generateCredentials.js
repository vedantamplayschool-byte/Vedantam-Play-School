import crypto from 'crypto';

/**
 * Generate a short, easy-to-share temporary password for parent portal
 * accounts. Avoids ambiguous characters (0/O, 1/l/I) so it's easy to read
 * off a screen and type on a phone.
 */
export function generateTempPassword(length = 8) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/**
 * Build a fallback portal login email from a phone number when no real
 * email is on file, e.g. "9876543210" -> "9876543210@parent.vedantam.school".
 */
export function fallbackPortalEmail(phone) {
  const digits = String(phone || '').replace(/\D/g, '') || crypto.randomBytes(4).toString('hex');
  return `${digits}@parent.vedantam.school`;
}

/**
 * Auto-generate a teacher employee ID in the format VPS/T/YYYY/NNN.
 * Pass the Teacher mongoose model so this utility stays model-agnostic.
 */
export async function generateEmployeeId(TeacherModel) {
  const year   = new Date().getFullYear();
  const prefix = `VPS/T/${year}/`;
  const last   = await TeacherModel.findOne(
    { employeeId: { $regex: `^${prefix.replace(/\//g, '\\/')}` } },
    { employeeId: 1 }
  ).sort({ employeeId: -1 });
  const seq = last ? parseInt(last.employeeId.split('/').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

/**
 * Auto-generate a roll number for a student, e.g. PG/A/001 or NUR/001.
 * Pass the Student mongoose model.
 */
export async function generateRollNumber(StudentModel, program, section) {
  const codes = { 'Play Group': 'PG', Nursery: 'NUR', LKG: 'LKG', UKG: 'UKG' };
  const code  = codes[program] || (program || 'STU').slice(0, 3).toUpperCase();
  const sec   = section ? `/${String(section).toUpperCase()}` : '';
  const prefix = `${code}${sec}/`;
  const escaped = prefix.replace(/\//g, '\\/');
  const last  = await StudentModel.findOne(
    { rollNumber: { $regex: `^${escaped}` } },
    { rollNumber: 1 }
  ).sort({ rollNumber: -1 });
  const seq = last ? parseInt(last.rollNumber.split('/').pop(), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

/**
 * Auto-generate the next plain sequential roll number for a class, used by
 * the admission-enrollment flow: "1", "2", "3"... independently per class
 * (Nursery, LKG, UKG each start at 1), unrelated to the PG/A/001-style
 * `generateRollNumber()` above used by manual student creation.
 *
 * Scoped by `program` (the class) only, since Sections don't exist yet.
 * Pass a `section` once Sections ship and this will additionally scope
 * the sequence per section without needing a schema/index migration --
 * just start passing the student's section through.
 */
export async function generateNextClassRollNumber(StudentModel, program, section) {
  const filter = {
    program,
    rollNumber: { $regex: /^\d+$/ }
  };
  if (section) filter.section = section;

  const existing = await StudentModel.find(filter, { rollNumber: 1 }).lean();
  const maxSeq = existing.reduce((max, s) => Math.max(max, parseInt(s.rollNumber, 10) || 0), 0);
  return String(maxSeq + 1);
}

/**
 * Re-assign roll numbers for all active students in a class, sorted
 * alphabetically A→Z by studentName. Roll numbers become 1, 2, 3 …
 * Call this after any student is created, enrolled, renamed, or
 * transferred into/out of a class so the ordering stays consistent.
 */
export async function assignAlphabeticalRollNumbers(StudentModel, program, section) {
  if (!program) return 0;
  const filter = { program, isActive: { $ne: false }, status: { $nin: ['Inactive', 'Transferred'] } };
  if (section) filter.section = section;

  const students = await StudentModel.find(filter, { _id: 1, studentName: 1 }).lean();
  students.sort((a, b) =>
    (a.studentName || '').localeCompare(b.studentName || '', 'en', { sensitivity: 'base' })
  );

  if (!students.length) return 0;
  const ops = students.map((s, i) => ({
    updateOne: { filter: { _id: s._id }, update: { $set: { rollNumber: String(i + 1) } } }
  }));
  await StudentModel.bulkWrite(ops);
  return students.length;
}
