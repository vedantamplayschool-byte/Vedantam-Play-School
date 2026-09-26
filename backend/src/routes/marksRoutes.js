import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listMarks, saveMark, deleteMark, listExams, createExam, updateExam,
  getExamSheet, saveExamSheet, deleteExamStudent, exportExamCsv, printExam,
  importFirstTermMarks
} from '../controllers/marksController.js';

const r = Router();
r.use(protect, authorize('super_admin', 'admin', 'principal', 'office_staff'));
r.get('/', listMarks);
r.post('/', saveMark);
r.get('/exams', listExams);
r.post('/exams', authorize('super_admin', 'admin', 'principal', 'office_staff'), createExam);
r.post('/import/first-term-2026-27', authorize('super_admin', 'admin', 'principal'), async (req, res, next) => {
  try {
    const result = await importFirstTermMarks();
    res.json({ success: true, message: 'First Term marks imported', data: result });
  } catch (error) {
    next(error);
  }
});
r.get('/exams/:examId/sheet', getExamSheet);
r.put('/exams/:examId/sheet', authorize('super_admin', 'admin', 'principal', 'office_staff'), saveExamSheet);
r.get('/exams/:examId/csv', exportExamCsv);
r.get('/exams/:examId/print', printExam);
r.patch('/exams/:examId', authorize('super_admin', 'admin', 'principal'), updateExam);
r.delete('/exams/:examId/students/:studentKey', authorize('super_admin', 'admin', 'principal'), deleteExamStudent);
r.delete('/:id', deleteMark);

export default r;