import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date:        { type: Date, required: true, index: true },
    endDate:     { type: Date },          // for multi-day holidays; null = single day
    type:        { type: String, enum: ['National', 'State', 'School', 'Other'], default: 'School' },
    session:     { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' }
  },
  { timestamps: true }
);

export default mongoose.model('Holiday', schema);
