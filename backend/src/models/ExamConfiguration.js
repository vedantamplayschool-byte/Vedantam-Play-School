import mongoose from 'mongoose';

const componentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  maxMarks: { type: Number, required: true, min: 0 }
}, { _id: true });

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  maxMarks: { type: Number, min: 0 },
  components: { type: [componentSchema], default: [] },
  order: { type: Number, default: 0 }
}, { _id: true });

const schema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', required: true },
  program: { type: String, enum: ['Play Group', 'Nursery', 'LKG', 'UKG'], required: true },
  examination: { type: String, enum: ['1st Term', '2nd Term', '3rd Term', 'Final/Annual Examination'], required: true },
  subjects: { type: [subjectSchema], default: [] }
}, { timestamps: true });

schema.index({ session: 1, program: 1, examination: 1 }, { unique: true });
export default mongoose.model('ExamConfiguration', schema);
