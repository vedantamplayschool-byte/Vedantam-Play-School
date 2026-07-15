import multer from 'multer';
import { env } from '../config/env.js';

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES   = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

export const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    /* Document fields accept PDFs + images; all other fields (photo, etc.) are image-only */
    const isDocField = ['document', 'file', 'attachment'].includes(file.fieldname);
    const allowed    = isDocField ? ALLOWED_DOC_TYPES : ALLOWED_IMAGE_TYPES;
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error(isDocField
        ? 'Only image files and PDFs are allowed for documents'
        : 'Only image files are allowed'));
    }
    cb(null, true);
  }
});

/* Documents (student/teacher ID proofs, certificates, etc.) are capped at
   200KB regardless of the general MAX_FILE_SIZE_MB setting — these are
   scanned identity/medical papers, not photos, so they should stay small. */
export const MAX_DOCUMENT_SIZE_BYTES = 200 * 1024;

export const uploadDocument = multer({
  storage,
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_DOC_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only image files and PDFs are allowed for documents'));
    }
    cb(null, true);
  }
});
