import mongoose from 'mongoose';

/* ------------------------------------------------------------------ */
/*  All new fields are optional or have defaults so existing documents  */
/*  in MongoDB Atlas are never broken.                                  */
/* ------------------------------------------------------------------ */

const documentSchema = new mongoose.Schema(
  {
    docType:   { type: String, trim: true }, // Aadhaar, Birth Certificate, TC, Medical, Other
    url:       String,
    publicId:  String,
    uploadedAt:{ type: Date, default: Date.now }
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    /* ── Identifiers ──────────────────────────────────────────────── */
    admissionNumber: { type: String, trim: true, unique: true, sparse: true, index: true },
    // sparse so existing docs without this field don't collide

    /* ── Existing fields (UNCHANGED) ─────────────────────────────── */
    admission:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
    studentName: { type: String, required: true, trim: true, index: true },
    parentName:  { type: String, required: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    program:     { type: String, required: true, enum: ['Play Group', 'Nursery', 'LKG', 'UKG'] },
    dateOfBirth: Date,
    address:     String,
    isActive:    { type: Boolean, default: true, index: true },

    /* ── New ERP fields ───────────────────────────────────────────── */
    parent:      { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' },
    session:     { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },

    // Demographics
    gender:      { type: String, enum: ['Male', 'Female', 'Other'] },
    bloodGroup:  { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },
    religion:    { type: String, trim: true },
    category:    { type: String, enum: ['General', 'OBC', 'SC', 'ST', 'Minority'] },
    nationality: { type: String, trim: true, default: 'Indian' },
    motherTongue:{ type: String, trim: true },

    // Academic placement
    section:    { type: String, trim: true },    // A, B, C
    rollNumber: { type: String, trim: true },
    admissionDate: { type: Date, default: Date.now },
    previousSchool:{ type: String, trim: true },

    // Photo
    photoUrl:   String,
    photoPublicId: String,

    // Health
    medicalNotes:  { type: String, trim: true, maxlength: 1000 },
    vaccinations:  { type: String, trim: true },

    // Emergency contact
    emergencyContact: {
      name:     { type: String, trim: true },
      phone:    { type: String, trim: true },
      relation: { type: String, trim: true }
    },

    // Documents
    documents: [documentSchema],

    // Status
    status: { type: String, enum: ['Active', 'Inactive', 'Transferred', 'Graduated', 'Dropped'], default: 'Active' },
    transferCertificateDate: Date,

    notes: { type: String, trim: true, maxlength: 1000 }
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ program: 1, section: 1 });

export default mongoose.model('Student', schema);
