import multer from 'multer';

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES   = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

export const upload = multer({
  storage,
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

