import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    teacher:     { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    session:     { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', index: true },
    program:     { type: String, enum: ['Play Group', 'Nursery', 'LKG', 'UKG'], required: true, index: true },
    section:     { type: String, trim: true },
    subject:     { type: String, required: true, trim: true },
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    dueDate:     { type: Date, required: true, index: true },
    isActive:    { type: Boolean, default: true, index: true },

    // Optional image attachment (worksheet scan, reference photo, etc.)
    imageUrl:      String,
    imagePublicId: String
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });

export default mongoose.model('Homework', schema);
