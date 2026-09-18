import mongoose from 'mongoose';

const markSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, required: true },
  component: { type: mongoose.Schema.Types.ObjectId },
  value: { type: Number, min: 0 },
  status: { type: String, enum: ['entered', 'absent', 'pending'], default: 'pending' }
}, { _id: false });

const schema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', required: true },
  program: { type: String, enum: ['Play Group', 'Nursery', 'LKG', 'UKG'], required: true },
  examination: { type: String, required: true },
  marks: { type: [markSchema], default: [] },
  totalObtained: { type: Number, default: 0 },
  maximumTotal: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  isComplete: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  publishedAt: Date,
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  audit: { type: [{ at: { type: Date, default: Date.now }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }, action: String }], default: [] }
}, { timestamps: true });

schema.index({ student: 1, session: 1, program: 1, examination: 1 }, { unique: true });
export default mongoose.model('StudentResult', schema);
