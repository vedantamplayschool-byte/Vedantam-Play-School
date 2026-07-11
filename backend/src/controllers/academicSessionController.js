import AcademicSession from '../models/AcademicSession.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { paginate } from '../utils/apiFeatures.js';

export const listSessions = asyncHandler(async (req, res) => {
  const { items, pagination } = await paginate(AcademicSession, {}, req.query);
  ok(res, { data: items, pagination });
});

export const getSession = asyncHandler(async (req, res) => {
  const doc = await AcademicSession.findById(req.params.id);
  if (!doc) { const e = new Error('Session not found'); e.status = 404; throw e; }
  ok(res, { data: doc });
});

export const getActiveSession = asyncHandler(async (req, res) => {
  const doc = await AcademicSession.findOne({ isActive: true });
  ok(res, { data: doc });
});

export const createSession = asyncHandler(async (req, res) => {
  const doc = await AcademicSession.create(req.body);
  ok(res, { status: 201, message: 'Academic session created', data: doc });
});

export const updateSession = asyncHandler(async (req, res) => {
  const doc = await AcademicSession.findById(req.params.id);
  if (!doc) { const e = new Error('Session not found'); e.status = 404; throw e; }
  Object.assign(doc, req.body);
  await doc.save(); // triggers pre-save hook for isActive
  ok(res, { message: 'Session updated', data: doc });
});

export const deleteSession = asyncHandler(async (req, res) => {
  const doc = await AcademicSession.findByIdAndDelete(req.params.id);
  if (!doc) { const e = new Error('Session not found'); e.status = 404; throw e; }
  ok(res, { message: 'Session deleted' });
});
