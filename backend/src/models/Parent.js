import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

/* ------------------------------------------------------------------
   Enterprise v3.0 — Parent Portal auth fields added.
   All new fields are optional so existing documents are safe.
   ------------------------------------------------------------------ */

const schema = new mongoose.Schema(
  {
    // Father
    fatherName:       { type: String, trim: true },
    fatherPhone:      { type: String, trim: true, index: true },
    fatherWhatsApp:   { type: String, trim: true },
    fatherEmail:      { type: String, trim: true, lowercase: true },
    fatherOccupation: { type: String, trim: true },
    fatherPhotoUrl:   String,
    fatherPhotoPublicId: String,

    // Mother
    motherName:       { type: String, trim: true },
    motherPhone:      { type: String, trim: true, index: true },
    motherWhatsApp:   { type: String, trim: true },
    motherEmail:      { type: String, trim: true, lowercase: true },
    motherOccupation: { type: String, trim: true },
    motherPhotoUrl:   String,
    motherPhotoPublicId: String,

    // Guardian (optional alternate contact)
    guardianName:     { type: String, trim: true },
    guardianPhone:    { type: String, trim: true },
    guardianRelation: { type: String, trim: true },

    // Address
    address: { type: String, trim: true },
    city:    { type: String, trim: true },
    state:   { type: String, trim: true, default: 'Telangana' },
    pincode: { type: String, trim: true },

    // Socioeconomic
    annualIncome: { type: Number },

    // Linked children (populated by Student model)
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],

    isActive: { type: Boolean, default: true, index: true },
    notes:    { type: String, trim: true, maxlength: 1000 },

    /* ── v3.0: Parent Portal Auth ─────────────────────────────────── */
    // portalEmail is the login credential for the parent portal.
    // Admin sets this when activating portal access.
    portalEmail:        { type: String, trim: true, lowercase: true, sparse: true, index: true },
    password:           { type: String, select: false },
    mustChangePassword: { type: Boolean, default: true },
    lastLoginAt:        { type: Date },
    isPortalActive:     { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

// Full-text search helper index
schema.index({ fatherName: 'text', motherName: 'text', fatherPhone: 1, motherPhone: 1 });

/* ── Password hashing ─────────────────────────────────────────────── */
schema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

schema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Parent', schema);
