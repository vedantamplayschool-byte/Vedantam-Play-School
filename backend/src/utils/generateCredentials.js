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
