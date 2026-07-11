import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import Teacher from '../models/Teacher.js';
import Admission from '../models/Admission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';

export const globalSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    const e = new Error('Search query must be at least 2 characters'); e.status = 400; throw e;
  }
  const regex = { $regex: q.trim(), $options: 'i' };

  const [students, parents, teachers, admissions] = await Promise.all([
    Student.find(
      { isActive: true, $or: [{ studentName: regex }, { admissionNumber: regex }, { phone: regex }] },
      'studentName admissionNumber program section photoUrl phone'
    ).limit(5),

    Parent.find(
      { isActive: true, $or: [{ fatherName: regex }, { motherName: regex }, { fatherPhone: regex }, { motherPhone: regex }, { fatherEmail: regex }] },
      'fatherName motherName fatherPhone motherPhone'
    ).limit(5).populate('students', 'studentName program'),

    Teacher.find(
      { isActive: true, $or: [{ name: regex }, { phone: regex }, { email: regex }, { employeeId: regex }] },
      'name designation photoUrl phone employeeId'
    ).limit(5),

    Admission.find(
      { $or: [{ studentName: regex }, { phone: regex }, { email: regex }] },
      'studentName parentName phone program status createdAt'
    ).limit(5)
  ]);

  ok(res, {
    data: {
      students:   students.map(s => ({ ...s.toObject(), _type: 'student' })),
      parents:    parents.map(p => ({ ...p.toObject(), _type: 'parent' })),
      teachers:   teachers.map(t => ({ ...t.toObject(), _type: 'teacher' })),
      admissions: admissions.map(a => ({ ...a.toObject(), _type: 'admission' })),
      total: students.length + parents.length + teachers.length + admissions.length
    }
  });
});
