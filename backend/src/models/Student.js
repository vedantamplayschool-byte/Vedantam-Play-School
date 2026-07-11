import mongoose from 'mongoose';

/* ------------------------------------------------------------------
   All new fields are optional or have defaults so existing documents
   in MongoDB Atlas are never broken.
   ------------------------------------------------------------------ */

const documentSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['Photo', 'Identity', 'Medical', 'Academic', 'Other'],
      default: 'Other'
    },
    docType: {
      type: String,
      enum: [
        'Student Photo', 'Father Photo', 'Mother Photo', 'Guardian Photo',
        'Birth Certificate', 'Student Aadhaar', 'Father Aadhaar', 'Mother Aadhaar',
        'PAN Card', 'Samagra ID', 'Medical Report', 'Vaccination Record',
        'Transfer Certificate', 'Character Certificate', 'Other'
      ],
      default: 'Other'
    },
    label:       { type: String, trim: true },       // custom label
    url:         String,
    publicId:    String,                              // Cloudinary publicId
    fileType:    { type: String, trim: true },        // 'image' | 'pdf'
    isVerified:  { type: Boolean, default: false },
    uploadedAt:  { type: Date, default: Date.now }
  },
  { _id: true }  // _id:true so each doc has an id for delete/replace
);

const schema = new mongoose.Schema(
  {
    /* ── Identifiers ──────────────────────────────────────────────── */
    admissionNumber: { type: String, trim: true, unique: true, sparse: true, index: true },

    /* ── Existing fields (UNCHANGED) ─────────────────────────────── */
    admission:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
    studentName: { type: String, required: true, trim: true, index: true },
    parentName:  { type: String, required: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    program:     { type: String, required: true, enum: ['Play Group', 'Nursery', 'LKG', 'UKG'] },
    dateOfBirth: Date,
    address:     String,
    isActive:    { type: Boolean, default: true, index: true },

    /* ── ERP fields ───────────────────────────────────────────────── */
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
    section:    { type: String, trim: true },
    rollNumber: { type: String, trim: true },
    admissionDate: { type: Date, default: Date.now },
    previousSchool:{ type: String, trim: true },

    // Student photo
    photoUrl:      String,
    photoPublicId: String,

    // Parent photos (Module 1 — v2.5)
    fatherName:          { type: String, trim: true },
    fatherPhone:         { type: String, trim: true },
    fatherOccupation:    { type: String, trim: true },
    fatherPhotoUrl:      String,
    fatherPhotoPublicId: String,

    motherName:          { type: String, trim: true },
    motherPhone:         { type: String, trim: true },
    motherOccupation:    { type: String, trim: true },
    motherPhotoUrl:      String,
    motherPhotoPublicId: String,

    guardianName:          { type: String, trim: true },
    guardianPhone:         { type: String, trim: true },
    guardianRelation:      { type: String, trim: true },
    guardianPhotoUrl:      String,
    guardianPhotoPublicId: String,

    // Health
    medicalNotes:  { type: String, trim: true, maxlength: 1000 },
    vaccinations:  { type: String, trim: true },

    // Emergency contact
    emergencyContact: {
      name:     { type: String, trim: true },
      phone:    { type: String, trim: true },
      relation: { type: String, trim: true }
    },

    // Documents (v2.5: enhanced schema with category & label)
    documents: [documentSchema],

    // Status
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Transferred', 'Graduated', 'Dropped'],
      default: 'Active'
    },
    transferCertificateDate: Date,

    notes: { type: String, trim: true, maxlength: 1000 }
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });
schema.index({ program: 1, section: 1 });

export default mongoose.model('Student', schema);
