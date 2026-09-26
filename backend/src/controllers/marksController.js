import mongoose from 'mongoose';
import StudentMark from '../models/StudentMark.js';
import Student from '../models/Student.js';
import AcademicSession from '../models/AcademicSession.js';
import Exam from '../models/Exam.js';
import { FIRST_TERM_MARKS } from '../data/firstTermMarks.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';

const invalid = message => {
  const e = new Error(message);
  e.status = 422;
  return e;
};

const notFound = message => {
  const e = new Error(message);
  e.status = 404;
  return e;
};

const normalizeName = value => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const reviewAliases = new Map([
  ['anha vaidya', 'angha vaidya'],
  ['gaurav sen', 'gourav sen'],
  ['manvi ghoshi', 'manvi ghosi'],
  ['rimjim ahirwar', 'rimjhim ahirwal'],
  ['renuka ahirwar', 'renuka ahirwal'],
  ['sounav sen', 'sourav sen'],
  ['taniska rajpoot', 'tanishka singh rajpoot'],
  ['chinmay jain', 'chinmayi jain']
]);

const safeKey = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
const numberOrNull = value => value == null || value === '' ? null : Number(value);
const isObjectId = value => mongoose.isValidObjectId(value);

function examSubjects(input) {
  if (!Array.isArray(input) || !input.length) throw invalid('At least one subject is required');
  const seen = new Set();
  return input.map((subject, index) => {
    const name = String(subject.name || subject.label || '').trim();
    const key = safeKey(subject.key || name);
    const maxMarks = Number(subject.maxMarks);
    if (!name || !key || seen.has(key)) throw invalid('Subjects must have unique names');
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) throw invalid(`Invalid maximum marks for ${name}`);
    seen.add(key);
    return { key, name, maxMarks, order: Number(subject.order ?? index) };
  });
}

function rowKey(row) {
  return row.student?._id
    ? `student:${row.student._id}`
    : row.student
      ? `student:${row.student}`
      : `name:${normalizeName(row.studentNameSnapshot || row.studentName)}`;
}

function marksTotal(subjects, marksByKey) {
  return subjects.reduce((total, subject) => {
    const value = marksByKey[subject.key]?.marks;
    return value == null ? total : total + Number(value);
  }, 0);
}

function totalMismatch(recordedTotal, calculatedTotal) {
  return recordedTotal != null && Math.abs(Number(recordedTotal) - Number(calculatedTotal)) > 0.001;
}

const addExamTotals = exam => {
  if (!exam) return exam;
  exam.maxTotal = (exam.subjects || []).reduce((sum, subject) => sum + Number(subject.maxMarks || 0), 0);
  return exam;
};

async function findOrCreateSession(sessionName) {
  let session = await AcademicSession.findOne({ name: sessionName });
  if (!session) {
    session = await AcademicSession.create({
      name: sessionName,
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T23:59:59.000Z'),
      isActive: false
    });
  }
  return session;
}

async function upsertExam({ program, academicSession, examName, schoolName, subjects, session }) {
  return Exam.findOneAndUpdate(
    { program, academicSession, examName },
    { $set: { schoolName, subjects, session: session?._id } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

function chooseStudent(sourceName, students) {
  const source = normalizeName(sourceName);
  const alias = reviewAliases.get(source) || source;
  const exact = students.find(student => normalizeName(student.studentName) === alias);
  if (exact) {
    return { student: exact, needsReview: alias !== source, matchMethod: alias !== source ? 'spelling-review' : 'exact' };
  }
  return { student: null, needsReview: true, matchMethod: 'unmatched' };
}

async function saveImportedRows(exam, classConfig, students) {
  const subjectConfigs = classConfig.subjects.map(([key, name], order) => ({
    key, name, maxMarks: 50, order
  }));
  const result = { importedStudents: 0, matchedStudents: 0, unmatchedStudents: [], reviewStudents: [], mismatchStudents: [] };

  for (const values of classConfig.rows) {
    const sourceName = values[0];
    const recordedTotal = Number(values[values.length - 1]);
    const valuesBySubject = values.slice(1, -1);
    const match = chooseStudent(sourceName, students);
    const base = {
      exam: exam._id,
      examName: exam.examName,
      session: exam.session,
      sessionName: exam.academicSession,
      program: exam.program,
      studentNameSnapshot: sourceName,
      rollNumber: match.student?.rollNumber,
      source: 'imported',
      needsReview: match.needsReview,
      recordedTotal
    };
    if (match.student) base.student = match.student._id;
    const numericMarks = {};
    const operations = subjectConfigs.map((subject, index) => {
      const raw = valuesBySubject[index];
      const absent = String(raw).toUpperCase() === 'AB';
      const marks = absent ? null : Number(raw);
      if (!absent && (!Number.isFinite(marks) || marks < 0 || marks > subject.maxMarks)) {
        throw invalid(`Invalid imported mark for ${sourceName} - ${subject.name}`);
      }
      if (!absent) numericMarks[subject.key] = { marks };
      const filter = {
        exam: exam._id,
        subjectKey: subject.key,
        ...(match.student
          ? { student: match.student._id }
          : { studentNameSnapshot: sourceName })
      };
      return {
        updateOne: {
          filter,
          update: {
            $set: {
              ...base,
              subject: subject.name,
              subjectKey: subject.key,
              maxMarks: subject.maxMarks,
              marks,
              markStatus: absent ? 'Absent' : 'Present',
              calculatedTotal: null,
              totalMismatch: false
            }
          },
          upsert: true
        }
      };
    });
    await StudentMark.bulkWrite(operations, { ordered: true });
    const calculatedTotal = marksTotal(subjectConfigs, numericMarks);
    await StudentMark.updateMany(
      { exam: exam._id, subjectKey: { $in: subjectConfigs.map(subject => subject.key) }, ...(match.student ? { student: match.student._id } : { studentNameSnapshot: sourceName }) },
      { $set: { calculatedTotal, totalMismatch: totalMismatch(recordedTotal, calculatedTotal) } }
    );

    result.importedStudents += 1;
    if (match.student) result.matchedStudents += 1;
    else result.unmatchedStudents.push(sourceName);
    if (match.needsReview) result.reviewStudents.push({ sourceName, matchMethod: match.matchMethod, linkedStudent: match.student?.studentName || null });
    if (totalMismatch(recordedTotal, calculatedTotal)) result.mismatchStudents.push({ sourceName, recordedTotal, calculatedTotal });
  }
  return result;
}

export async function importFirstTermMarks() {
  // The original subject-level index was not partial. Unlinked imported rows
  // would otherwise collide because several records have no student ObjectId.
  try {
    const indexes = await StudentMark.collection.indexes();
    const legacy = indexes.find(index => index.name === 'student_1_session_1_examName_1_subject_1');
    if (legacy) await StudentMark.collection.dropIndex(legacy.name);
    await StudentMark.createIndexes();
  } catch (_) {
    // Retrying the import should remain safe; real write errors still surface.
  }
  const session = await findOrCreateSession(FIRST_TERM_MARKS.academicSession);
  const result = {
    academicSession: FIRST_TERM_MARKS.academicSession,
    examName: FIRST_TERM_MARKS.examName,
    classes: [],
    importedStudents: 0,
    matchedStudents: 0,
    unmatchedStudents: [],
    reviewStudents: [],
    mismatchStudents: []
  };

  for (const [program, classConfig] of Object.entries(FIRST_TERM_MARKS.classes)) {
    const subjects = classConfig.subjects.map(([key, name], order) => ({ key, name, maxMarks: 50, order }));
    const exam = await upsertExam({
      program,
      academicSession: FIRST_TERM_MARKS.academicSession,
      examName: FIRST_TERM_MARKS.examName,
      schoolName: FIRST_TERM_MARKS.schoolName,
      subjects,
      session
    });
    const students = await Student.find({ program, isActive: { $ne: false } })
      .sort({ rollNumber: 1, studentName: 1 })
      .lean();
    const classResult = await saveImportedRows(exam, classConfig, students);
    classResult.program = program;
    classResult.examId = exam._id;
    result.classes.push(classResult);
    for (const key of ['importedStudents', 'matchedStudents']) result[key] += classResult[key];
    result.unmatchedStudents.push(...classResult.unmatchedStudents);
    result.reviewStudents.push(...classResult.reviewStudents);
    result.mismatchStudents.push(...classResult.mismatchStudents);
    await Exam.updateOne({ _id: exam._id }, { $set: { importedAt: new Date() } });
  }
  return result;
}

async function getSheetRows(exam) {
  const [marks, students] = await Promise.all([
    StudentMark.find({ exam: exam._id })
      .populate('student', 'studentName admissionNumber rollNumber program section')
      .sort({ rollNumber: 1, studentNameSnapshot: 1 })
      .lean(),
    Student.find({ program: exam.program, isActive: { $ne: false } })
      .sort({ rollNumber: 1, studentName: 1 })
      .lean()
  ]);

  const grouped = new Map();
  const ensure = (key, data) => {
    if (!grouped.has(key)) grouped.set(key, {
      student: data.student?._id || data.student || null,
      studentName: data.studentNameSnapshot || data.studentName || data.student?.studentName || 'Unnamed student',
      linkedStudentName: data.student?.studentName || null,
      admissionNumber: data.student?.admissionNumber || data.admissionNumber || '',
      rollNumber: data.rollNumber || data.student?.rollNumber || '',
      program: data.program || data.student?.program || exam.program,
      section: data.student?.section || '',
      needsReview: Boolean(data.needsReview),
      marks: {},
      recordedTotal: data.recordedTotal ?? null,
      calculatedTotal: data.calculatedTotal ?? null,
      totalMismatch: Boolean(data.totalMismatch)
    });
    return grouped.get(key);
  };

  students.forEach(student => ensure(`student:${student._id}`, { student }));
  marks.forEach(mark => {
    const row = ensure(rowKey(mark), mark);
    row.needsReview ||= Boolean(mark.needsReview);
    row.marks[mark.subjectKey || safeKey(mark.subject)] = {
      marks: mark.marks,
      markStatus: mark.markStatus || 'Present',
      remarks: mark.remarks || '',
      id: mark._id
    };
    if (mark.recordedTotal != null) row.recordedTotal = mark.recordedTotal;
    if (mark.calculatedTotal != null) row.calculatedTotal = mark.calculatedTotal;
    row.totalMismatch ||= Boolean(mark.totalMismatch);
  });

  return [...grouped.values()].map(row => {
    row.calculatedTotal = marksTotal(exam.subjects, row.marks);
    row.percentage = exam.maxTotal ? Number(((row.calculatedTotal / exam.maxTotal) * 100).toFixed(2)) : 0;
    row.totalMismatch = totalMismatch(row.recordedTotal, row.calculatedTotal);
    return row;
  }).sort((a, b) => String(a.rollNumber || '9999').localeCompare(String(b.rollNumber || '9999'), undefined, { numeric: true }) || a.studentName.localeCompare(b.studentName));
}

export const listExams = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.program) filter.program = req.query.program;
  if (req.query.academicSession) filter.academicSession = req.query.academicSession;
  if (req.query.examName) filter.examName = req.query.examName;
  const exams = (await Exam.find(filter).sort({ academicSession: -1, examName: 1, program: 1 }).lean()).map(addExamTotals);
  ok(res, { data: exams });
});

export const createExam = asyncHandler(async (req, res) => {
  const { examName, academicSession, program, schoolName, sessionId, subjects, notes } = req.body;
  if (!examName?.trim() || !academicSession?.trim() || !program) throw invalid('Exam name, academic session and class are required');
  const normalizedSubjects = examSubjects(subjects);
  const session = sessionId && isObjectId(sessionId)
    ? await AcademicSession.findById(sessionId)
    : await AcademicSession.findOne({ name: academicSession.trim() });
  const exam = await Exam.create({
    examName: examName.trim(),
    academicSession: academicSession.trim(),
    program,
    schoolName: schoolName?.trim() || undefined,
    session: session?._id,
    subjects: normalizedSubjects,
    notes: notes?.trim()
  });
  ok(res, { status: 201, message: 'Exam created', data: exam });
});

export const updateExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.examId);
  if (!exam) throw notFound('Exam not found');
  if (req.body.examName != null) exam.examName = String(req.body.examName).trim();
  if (req.body.academicSession != null) exam.academicSession = String(req.body.academicSession).trim();
  if (req.body.notes != null) exam.notes = String(req.body.notes).trim();
  if (req.body.subjects) exam.subjects = examSubjects(req.body.subjects);
  await exam.save();
  ok(res, { message: 'Exam updated', data: exam });
});

export const getExamSheet = asyncHandler(async (req, res) => {
  const exam = addExamTotals(await Exam.findById(req.params.examId).lean());
  if (!exam) throw notFound('Exam not found');
  let rows = await getSheetRows(exam);
  const search = normalizeName(req.query.search);
  if (search) {
    rows = rows.filter(row => normalizeName(`${row.studentName} ${row.admissionNumber} ${row.rollNumber}`).includes(search));
  }
  ok(res, { data: { exam, rows } });
});

export const saveExamSheet = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.examId);
  if (!exam) throw notFound('Exam not found');
  if (!Array.isArray(req.body.records)) throw invalid('Records must be an array');
  const subjectMap = new Map(exam.subjects.map(subject => [subject.key, subject]));
  const savedKeys = [];

  for (const record of req.body.records) {
    const student = record.student && isObjectId(record.student) ? await Student.findById(record.student).lean() : null;
    const studentNameSnapshot = String(record.studentName || student?.studentName || '').trim();
    if (!student && !studentNameSnapshot) throw invalid('Every marks row needs a student');
    const marksByKey = record.subjects || {};
    for (const subject of exam.subjects) {
      const input = marksByKey[subject.key] || {};
      const status = String(input.status || input.markStatus || '').toLowerCase() === 'absent' || String(input.marks ?? '').toUpperCase() === 'AB'
        ? 'Absent'
        : 'Present';
      const raw = input.marks ?? input.value;
      const marks = status === 'Absent' || raw === '' || raw == null ? null : Number(raw);
      const originalStudentName = String(record.originalStudentName || studentNameSnapshot).trim();
      const filter = {
        exam: exam._id,
        subjectKey: subject.key,
        ...(student ? { student: student._id } : { studentNameSnapshot: originalStudentName })
      };
      if (marks == null && status === 'Present') {
        await StudentMark.deleteOne(filter);
        continue;
      }
      if (status === 'Present' && (!Number.isFinite(marks) || marks < 0 || marks > subject.maxMarks)) {
        throw invalid(`${subject.name}: enter a number from 0 to ${subject.maxMarks}, or AB`);
      }
      const existing = await StudentMark.findOne(filter).lean();
      await StudentMark.findOneAndUpdate(
        filter,
        {
          $set: {
            exam: exam._id,
            student: student?._id,
            studentNameSnapshot,
            studentName: undefined,
            examName: exam.examName,
            session: exam.session,
            sessionName: exam.academicSession,
            program: exam.program,
            rollNumber: student?.rollNumber || record.rollNumber || '',
            subject: subject.name,
            maxMarks: subject.maxMarks,
            marks: status === 'Absent' ? null : marks,
            markStatus: status,
            remarks: String(input.remarks || '').trim(),
            source: 'manual',
            needsReview: false,
            recordedTotal: existing?.recordedTotal ?? null
          }
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
      savedKeys.push(filter);
    }
  }

  const rows = await getSheetRows(exam);
  for (const row of rows) {
    const filter = { exam: exam._id, ...(row.student ? { student: row.student } : { studentNameSnapshot: row.studentName }) };
    await StudentMark.updateMany(filter, {
      $set: {
        calculatedTotal: row.calculatedTotal,
        totalMismatch: totalMismatch(row.recordedTotal, row.calculatedTotal)
      }
    });
  }
  ok(res, { message: `Marks saved for ${req.body.records.length} student row(s)`, data: { saved: savedKeys.length, rows } });
});

export const deleteExamStudent = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.examId);
  if (!exam) throw notFound('Exam not found');
  const filter = isObjectId(req.params.studentKey)
    ? { exam: exam._id, student: req.params.studentKey }
    : { exam: exam._id, studentNameSnapshot: decodeURIComponent(req.params.studentKey) };
  const result = await StudentMark.deleteMany(filter);
  if (!result.deletedCount) throw notFound('Exam student record not found');
  ok(res, { message: 'Student marks deleted from this exam' });
});

export const exportExamCsv = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.examId).lean();
  if (!exam) throw notFound('Exam not found');
  addExamTotals(exam);
  const rows = await getSheetRows(exam);
  const csv = [
    ['School', 'Academic Session', 'Exam', 'Class', 'Student', 'Linked Student', 'Roll Number',
      ...exam.subjects.map(subject => subject.name), 'Calculated Total', 'Percentage'].map(csvCell).join(','),
    ...rows.map(row => [
      exam.schoolName, exam.academicSession, exam.examName, exam.program, row.studentName,
      row.linkedStudentName || '', row.rollNumber,
      ...exam.subjects.map(subject => row.marks[subject.key]?.markStatus === 'Absent' ? 'AB' : row.marks[subject.key]?.marks ?? ''),
       row.calculatedTotal, `${row.percentage}%`
    ].map(csvCell).join(','))
  ].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeKey(exam.program)}-${safeKey(exam.examName)}.csv"`);
  res.send(`\uFEFF${csv}`);
});

const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

const htmlEscape = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

export const printExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.examId).lean();
  if (!exam) throw notFound('Exam not found');
  addExamTotals(exam);
  const rows = await getSheetRows(exam);
  const tableRows = rows.map((row, index) => `<tr>
    <td>${index + 1}</td><td class="student">${htmlEscape(row.studentName)}</td>
    ${exam.subjects.map(subject => `<td>${row.marks[subject.key]?.markStatus === 'Absent' ? 'AB' : htmlEscape(row.marks[subject.key]?.marks ?? '')}</td>`).join('')}
     <td>${row.calculatedTotal}</td><td>${row.percentage}%</td>
  </tr>`).join('');
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>${htmlEscape(exam.examName)} - ${htmlEscape(exam.program)}</title>
  <style>
    @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111}
    h1{font-size:20px;text-align:center;margin:0 0 3px}h2{font-size:15px;text-align:center;margin:0 0 12px;font-weight:400}
    table{border-collapse:collapse;width:100%;font-size:9px}th,td{border:1px solid #333;padding:4px 3px;text-align:center}th{background:#eef2f7;font-weight:700}
    td.student,th.student{text-align:left;min-width:105px}td small{display:block;color:#a15c00;font-size:7px}.warning{color:#a15c00}
    .meta{display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px}
    .print{display:block;margin:14px auto;padding:8px 18px;border:0;background:#16803a;color:#fff;border-radius:5px;cursor:pointer}
    @media print{.print{display:none}}
  </style></head><body>
  <h1>${htmlEscape(exam.schoolName)}</h1><h2>${htmlEscape(exam.examName)} · ${htmlEscape(exam.program)} · ${htmlEscape(exam.academicSession)}</h2>
  <div class="meta"><span>Maximum Total: ${exam.subjects.reduce((sum, subject) => sum + subject.maxMarks, 0)}</span><span>Printed: ${new Date().toLocaleDateString('en-IN')}</span></div>
    <table><thead><tr><th>#</th><th class="student">Student</th>${exam.subjects.map(subject => `<th>${htmlEscape(subject.name)}<br><small>/${subject.maxMarks}</small></th>`).join('')}<th>Calculated<br>Total</th><th>%</th></tr></thead><tbody>${tableRows}</tbody></table>
  <button class="print" onclick="window.print()">Print / Save PDF</button></body></html>`);
});

/* Existing subject-level API retained for older clients. */
export const listMarks = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.examName?.trim()) filter.examName = req.query.examName.trim();
  if (req.query.subject?.trim()) filter.subject = req.query.subject.trim();
  if (req.query.program?.trim()) filter.program = req.query.program.trim();
  if (req.query.sessionName?.trim()) filter.sessionName = req.query.sessionName.trim();
  const activeSession = await AcademicSession.findOne({ isActive: true }).lean();
  if (activeSession && !req.query.sessionName) filter.session = activeSession._id;
  const marks = await StudentMark.find(filter)
    .populate('student', 'studentName admissionNumber rollNumber program section')
    .populate('exam', 'examName academicSession program subjects')
    .sort('student rollNumber')
    .lean();
  ok(res, { data: marks });
});

export const saveMark = asyncHandler(async (req, res) => {
  const { student, examName, subject, marks, maxMarks = 100, remarks = '', status } = req.body;
  if (!student || !examName?.trim() || !subject?.trim()) throw invalid('Student, exam name and subject are required');
  const numericMax = Number(maxMarks);
  const absent = String(status || '').toLowerCase() === 'absent' || String(marks).toUpperCase() === 'AB';
  const numericMarks = absent ? null : Number(marks);
  if (!Number.isFinite(numericMax) || numericMax <= 0 || (!absent && (!Number.isFinite(numericMarks) || numericMarks < 0 || numericMarks > numericMax))) {
    throw invalid('Marks must be between 0 and the maximum marks');
  }
  if (!await Student.exists({ _id: student })) throw notFound('Student not found');
  const activeSession = await AcademicSession.findOne({ isActive: true }).lean();
  const key = { student, session: activeSession?._id, examName: examName.trim(), subject: subject.trim() };
  const doc = await StudentMark.findOneAndUpdate(key, {
    $set: { marks: numericMarks, markStatus: absent ? 'Absent' : 'Present', maxMarks: numericMax, remarks: String(remarks).trim() }
  }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }).lean();
  ok(res, { message: 'Marks saved', data: doc });
});

export const deleteMark = asyncHandler(async (req, res) => {
  const doc = await StudentMark.findByIdAndDelete(req.params.id);
  if (!doc) throw notFound('Mark record not found');
  ok(res, { message: 'Marks deleted' });
});