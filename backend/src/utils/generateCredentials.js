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
