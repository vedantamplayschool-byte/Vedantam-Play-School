import Student from '../models/Student.js';
import AcademicSession from '../models/AcademicSession.js';
import ExamConfiguration from '../models/ExamConfiguration.js';
import StudentResult from '../models/StudentResult.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';

const exams = [
  '1st Term',
  '2nd Term',
  '3rd Term',
  'Final/Annual Examination'
];

const fail = (message, status = 400) => {
  const e = new Error(message);
  e.status = status;
  throw e;
};

const context = async ({ session, program, examination }) => {
  if (!session || !program || !examination) {
    fail('Academic session, class and examination are required');
  }

  if (!['Play Group', 'Nursery', 'LKG', 'UKG'].includes(program)) {
    fail('Invalid class');
  }

  if (!exams.includes(examination)) {
    fail('Invalid examination');
  }

  const [sessionDoc, configuration] = await Promise.all([
    AcademicSession.findById(session),
    ExamConfiguration.findOne({
      session,
      program,
      examination
    })
  ]);

  if (!sessionDoc) {
    fail('Academic session not found', 404);
  }

  return {
    sessionDoc,
    configuration
  };
};

const normalizedSubjects = (subjects) =>
  (subjects || []).map((s, index) => ({
    ...(s._id ? { _id: s._id } : {}),
    name: String(s.name || '').trim(),
    order: index,
    components: (s.components || []).map((c) => ({
      ...(c._id ? { _id: c._id } : {}),
      name: String(c.name || '').trim(),
      maxMarks: Number(c.maxMarks)
    }))
  }));

const maxFor = (subject) =>
  subject.components?.length
    ? subject.components.reduce((n, c) => n + c.maxMarks, 0)
    : subject.maxMarks;

export const listExaminations = asyncHandler(async (_req, res) => {
  ok(res, { data: exams });
});

export const getConfiguration = asyncHandler(async (req, res) => {
  const { configuration } = await context(req.query);

  ok(res, {
    data: configuration || { subjects: [] }
  });
});

export const saveConfiguration = asyncHandler(async (req, res) => {
  const {
    session,
    program,
    examination,
    subjects
  } = req.body;

  const { configuration } = await context({
    session,
    program,
    examination
  });

  const clean = normalizedSubjects(subjects);

  if (!clean.length) {
    fail('Add at least one subject');
  }

  clean.forEach((subject) => {
    if (
      !subject.name ||
      (
        !subject.components.length &&
        (
          !Number.isFinite(Number(subject.maxMarks)) ||
          Number(subject.maxMarks) <= 0
        )
      )
    ) {
      fail(
        'Every subject needs a name and positive maximum marks'
      );
    }

    subject.components.forEach((component) => {
      if (
        !component.name ||
        !Number.isFinite(component.maxMarks) ||
        component.maxMarks <= 0
      ) {
        fail(
          'Each assessment component needs a name and positive maximum'
        );
      }
    });
  });

  if (configuration) {
    const resultCount = await StudentResult.countDocuments({
      session,
      program,
      examination
    });

    const priorIds = new Set(
      configuration.subjects.map((s) => String(s._id))
    );

    const sentIds = new Set(
      clean
        .filter((s) => s._id)
        .map((s) => String(s._id))
    );

    if (
      resultCount &&
      [...priorIds].some((id) => !sentIds.has(id))
    ) {
      fail(
        'A subject with saved marks cannot be removed. Keep it or clear the saved results first.',
        409
      );
    }

    if (
      resultCount &&
      configuration.subjects.some((oldSubject) => {
        const replacement = clean.find(
          (s) => String(s._id) === String(oldSubject._id)
        );

        const oldComponents = oldSubject.components || [];

        const nextComponents = new Set(
          (replacement?.components || [])
            .filter((c) => c._id)
            .map((c) => String(c._id))
        );

        return oldComponents.some(
          (component) =>
            !nextComponents.has(String(component._id))
        );
      })
    ) {
      fail(
        'An assessment component with saved marks cannot be removed.',
        409
      );
    }

    configuration.subjects = clean;
    await configuration.save();

    return ok(res, {
      message: 'Assessment configuration saved',
      data: configuration
    });
  }

  const created = await ExamConfiguration.create({
    session,
    program,
    examination,
    subjects: clean
  });

  ok(res, {
    status: 201,
    message: 'Assessment configuration saved',
    data: created
  });
});

function calculate(configuration, supplied) {
  const definitions = new Map();
  let maximumTotal = 0;

  configuration.subjects.forEach((subject) => {
    maximumTotal += maxFor(subject);

    if (subject.components?.length) {
      subject.components.forEach((component) => {
        definitions.set(
          `${subject._id}:${component._id}`,
          component.maxMarks
        );
      });
    } else {
      definitions.set(
        `${subject._id}:`,
        subject.maxMarks
      );
    }
  });

  const marks = [];
  let totalObtained = 0;
  let isComplete = true;

  for (const row of supplied || []) {
    const subject = String(row.subject || '');
    const component = row.component
      ? String(row.component)
      : '';

    const maximum = definitions.get(
      `${subject}:${component}`
    );

    if (maximum === undefined) {
      fail(
        'A submitted assessment does not belong to this examination'
      );
    }

    const status =
      row.status ||
      (
        row.value === '' ||
        row.value == null
          ? 'pending'
          : 'entered'
      );

    if (!['entered', 'absent', 'pending'].includes(status)) {
      fail('Invalid mark status');
    }

    if (status === 'entered') {
      const value = Number(row.value);

      if (
        !Number.isFinite(value) ||
        value < 0 ||
        value > maximum
      ) {
        fail(
          `Marks must be between 0 and ${maximum}`
        );
      }

      totalObtained += value;

      marks.push({
        subject,
        ...(component ? { component } : {}),
        value,
        status
      });
    } else {
      isComplete = false;

      marks.push({
        subject,
        ...(component ? { component } : {}),
        status
      });
    }
  }

  if (marks.length !== definitions.size) {
    isComplete = false;
  }

  return {
    marks,
    totalObtained,
    maximumTotal,
    percentage: maximumTotal
      ? Number(
          (
            (totalObtained / maximumTotal) *
            100
          ).toFixed(2)
        )
      : 0,
    isComplete
  };
}

export const marksGrid = asyncHandler(async (req, res) => {
  const {
    session,
    program,
    examination
  } = req.query;

  const { configuration } = await context(req.query);

  const students = await Student.find({
    program,
    isActive: true,
    status: 'Active'
  })
    .select(
      'studentName admissionNumber program'
    )
    .sort('studentName')
    .lean();

  const results = await StudentResult.find({
    session,
    program,
    examination,
    student: {
      $in: students.map((s) => s._id)
    }
  }).lean();

  ok(res, {
    data: {
      configuration:
        configuration || { subjects: [] },
      students,
      results
    }
  });
});

export const saveMarks = asyncHandler(async (req, res) => {
  const {
    session,
    program,
    examination,
    records
  } = req.body;

  const { configuration } = await context({
    session,
    program,
    examination
  });

  if (!configuration?.subjects?.length) {
    fail(
      'Configure subjects before entering marks'
    );
  }

  if (!Array.isArray(records)) {
    fail('Marks records are required');
  }

  for (const record of records) {
    const student = await Student.findOne({
      _id: record.student,
      program,
      isActive: true,
      status: 'Active'
    });

    if (!student) {
      fail(
        'Student does not belong to the selected current class',
        403
      );
    }

    const computed = calculate(
      configuration,
      record.marks
    );

    const existing = await StudentResult.findOne({
      student: student._id,
      session,
      program,
      examination
    });

    if (
      existing?.status === 'published' &&
      !req.body.confirmPublishedEdit
    ) {
      fail(
        'Confirm the correction of published marks before saving',
        409
      );
    }

    const doc =
      existing ||
      new StudentResult({
        student: student._id,
        session,
        program,
        examination
      });

    Object.assign(
      doc,
      computed,
      {
        status: existing?.status || 'draft'
      }
    );

    doc.audit.push({
      by: req.admin._id,
      action:
        existing?.status === 'published'
          ? 'corrected_published_marks'
          : 'saved_draft'
    });

    await doc.save();
  }

  ok(res, {
    message: 'Draft marks saved'
  });
});

export const publishMarks = asyncHandler(async (req, res) => {
  const {
    session,
    program,
    examination
  } = req.body;

  const { configuration } = await context({
    session,
    program,
    examination
  });

  if (!configuration?.subjects?.length) {
    fail(
      'Configure subjects before publishing'
    );
  }

  const students = await Student.find({
    program,
    isActive: true,
    status: 'Active'
  })
    .select('_id')
    .lean();

  const results = await StudentResult.find({
    session,
    program,
    examination,
    student: {
      $in: students.map((s) => s._id)
    }
  });

  if (
    !students.length ||
    results.length !== students.length ||
    results.some((r) => !r.isComplete)
  ) {
    fail(
      'Every active student must have all required numeric marks before publishing'
    );
  }

  await Promise.all(
    results.map((result) => {
      result.status = 'published';
      result.publishedAt = new Date();
      result.publishedBy = req.admin._id;

      result.audit.push({
        by: req.admin._id,
        action: 'published'
      });

      return result.save();
    })
  );

  ok(res, {
    message: 'Results published for parents'
  });
});

export const parentResults = asyncHandler(
  async (req, res) => {
    const results = await StudentResult.find({
      student: {
        $in: req.parent.students
      },
      status: 'published'
    })
      .populate(
        'student',
        'studentName admissionNumber program'
      )
      .populate(
        'session',
        'name'
      )
      .sort('-publishedAt')
      .lean();

    const detailed = await Promise.all(
      results.map(async (result) => ({
        ...result,
        configuration:
          await ExamConfiguration.findOne({
            session:
              result.session?._id ||
              result.session,
            program: result.program,
            examination: result.examination
          }).lean()
      }))
    );

    ok(res, {
      data: detailed
    });
  }
);