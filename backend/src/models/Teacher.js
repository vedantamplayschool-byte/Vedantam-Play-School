import mongoose from 'mongoose';

/* ------------------------------------------------------------------ */
/*  All new fields are optional so existing Teacher documents are safe. */
/* ------------------------------------------------------------------ */

const documentSchema = new mongoose.Schema(
  {
    docType:  { type: String, trim: true }, // Degree, Aadhaar, PAN, Experience Letter, etc.
    url:      String,
    publicId: String,
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    /* ── Existing fields (UNCHANGED) ─────────────────────────────── */
    name:          { type: String, required: true, trim: true, index: true },
    photoUrl:      String,
    qualification: { type: String, required: true, trim: true },
    experience:    { type: String, trim: true },
    description:   { type: String, trim: true, maxlength: 1200 },
    socialLinks:   { facebook: String, instagram: String, linkedin: String },
    isActive:      { type: Boolean, default: true, index: true },
    displayOrder:  { type: Number, default: 0, index: true },

    /* ── New ERP fields ───────────────────────────────────────────── */
    employeeId:  { type: String, trim: true, unique: true, sparse: true },
    designation: { type: String, trim: true },  // Class Teacher, Subject Teacher, etc.
    department:  { type: String, trim: true },

    // Contact
    phone:   { type: String, trim: true, index: true },
    email:   { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },

    // Personal
    gender:      { type: String, enum: ['Male', 'Female', 'Other'] },
    dateOfBirth: Date,
    bloodGroup:  { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },

    // Employment
    joiningDate: Date,
    salary:      { type: Number, min: 0 },
    salaryType:  { type: String, enum: ['Monthly', 'Daily', 'Contract'], default: 'Monthly' },

    // Photo + docs
    photoPublicId: String,
    documents: [documentSchema],

    // Emergency contact
    emergencyContact: {
      name:     { type: String, trim: true },
      phone:    { type: String, trim: true },
      relation: { type: String, trim: true }
    },

    subjects:   [{ type: String, trim: true }], // subjects they teach
    notes:      { type: String, trim: true, maxlength: 1000 }
  },
  { timestamps: true }
);

export default mongoose.model('Teacher', schema);
