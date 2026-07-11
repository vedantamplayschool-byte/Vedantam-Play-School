import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

/* ------------------------------------------------------------------
   All new fields are optional so existing Teacher documents are safe.
   v2.5 adds teacher portal authentication fields.
   ------------------------------------------------------------------ */

const documentSchema = new mongoose.Schema(
  {
    docType:    { type: String, trim: true },
    label:      { type: String, trim: true },
    url:        String,
    publicId:   String,
    fileType:   { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: true }
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

    /* ── ERP fields ───────────────────────────────────────────────── */
    employeeId:  { type: String, trim: true, unique: true, sparse: true },
    designation: { type: String, trim: true },
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

    photoPublicId: String,
    documents:     [documentSchema],

    emergencyContact: {
      name:     { type: String, trim: true },
      phone:    { type: String, trim: true },
      relation: { type: String, trim: true }
    },

    subjects: [{ type: String, trim: true }],
    notes:    { type: String, trim: true, maxlength: 1000 },

    /* ── v2.5: Teacher Portal Auth ────────────────────────────────── */
    // Password is set by admin when creating teacher portal access.
    // null means teacher portal access not yet activated.
    password:          { type: String, select: false },
    mustChangePassword:{ type: Boolean, default: true },
    lastLoginAt:       { type: Date },
    teacherRole:       {
      type: String,
      enum: ['class_teacher', 'subject_teacher', 'coordinator', 'staff'],
      default: 'class_teacher'
    },
    // Which program/section this teacher manages
    assignedProgram: { type: String, enum: ['Play Group', 'Nursery', 'LKG', 'UKG'] },
    assignedSection: { type: String, trim: true }
  },
  { timestamps: true }
);

/* ── Password hashing ──────────────────────────────────────────────── */
schema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

schema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Teacher', schema);
