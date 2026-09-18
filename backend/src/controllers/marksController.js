import StudentMark     from '../models/StudentMark.js';
import Student         from '../models/Student.js';
import AcademicSession from '../models/AcademicSession.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';

const invalid = message => {
  const e = new Error(message);
  e.status = 422;
  return e;
};

export const listMarks = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.examName?.trim()) filter.examName = req.query.examName.trim();
  if (req.query.subject?.trim()) filter.subject = req.query.subject.trim();

  const activeSession = await AcademicSession.findOne({ isActive: true }).lean();
  if (activeSession) filter.session = activeSession._id;

  const marks = await StudentMark.find(filter)
    .populate('student', 'studentName admissionNumber rollNumber program section')
    .sort('student rollNumber')
    .lean();
  ok(res, { data: marks });
});

export const saveMark = asyncHandler(async (req, res) => {
  const { student, examName, subject, marks, maxMarks = 100, remarks = '' } = req.body;
  if (!student || !examName?.trim() || !subject?.trim()) {
    throw invalid('Student, exam name and subject are required');
  }

  const numericMarks = Number(marks);
  const numericMax = Number(maxMarks);
  if (!Number.isFinite(numericMarks) || !Number.isFinite(numericMax) ||
      numericMax <= 0 || numericMarks < 0 || numericMarks > numericMax) {
    throw invalid('Marks must be between 0 and the maximum marks');
  }

  const studentExists = await Student.exists({ _id: student });
  if (!studentExists) {
    const e = new Error('Student not found');
    e.status = 404;
    throw e;
  }

  const activeSession = await AcademicSession.findOne({ isActive: true }).lean();
  const key = {
    student,
    session: activeSession?._id,
    examName: examName.trim(),
    subject: subject.trim()
  };
  const doc = await StudentMark.findOneAndUpdate(
    key,
    {
      $set: {
        marks: numericMarks,
        maxMarks: numericMax,
        remarks: String(remarks).trim()
      }
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  ok(res, { message: 'Marks saved', data: doc });
});

export const deleteMark = asyncHandler(async (req, res) => {
  const doc = await StudentMark.findByIdAndDelete(req.params.id);
  if (!doc) {
    const e = new Error('Mark record not found');
    e.status = 404;
    throw e;
  }
  ok(res, { message: 'Marks deleted' });
});