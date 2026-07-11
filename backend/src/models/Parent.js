import mongoose from 'mongoose';

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
    notes:    { type: String, trim: true, maxlength: 1000 }
  },
  { timestamps: true }
);

// Full-text search helper index
schema.index({ fatherName: 'text', motherName: 'text', fatherPhone: 1, motherPhone: 1 });

export default mongoose.model('Parent', schema);
