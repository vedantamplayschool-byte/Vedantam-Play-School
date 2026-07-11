import Admission from '../models/Admission.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';
import { list, getOne, remove } from './factoryController.js';

export const createAdmission = asyncHandler(async (req, res) => {
  const doc = await Admission.create(req.body);
  ok(res, { status: 201, message: 'Admission enquiry submitted successfully', data: doc });
});

export const listAdmissions = list(Admission, ['studentName', 'parentName', 'phone']);
export const getAdmission   = getOne(Admission);
export const deleteAdmission = remove(Admission);

export const updateAdmissionStatus = asyncHandler(async (req, res) => {
  const { status, notes, waitingListNo } = req.body;

  const update = {
    status,
    ...(notes !== undefined ? { notes } : {}),
    reviewedBy: req.admin._id,
    reviewedAt: new Date()
  };

  // Assign waiting list number when status moves to Waiting
  if (status === 'Waiting' && waitingListNo) {
    update.waitingListNo = waitingListNo;
  }

  // If approving, auto-assign next waiting list number (if not already set)
  if (status === 'Waiting' && !waitingListNo) {
    const lastWaiting = await Admission.findOne({ status: 'Waiting' })
      .sort('-waitingListNo').select('waitingListNo').lean();
    update.waitingListNo = (lastWaiting?.waitingListNo || 0) + 1;
  }

  const doc = await Admission.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true
  }).populate('reviewedBy', 'name email');

  if (!doc) {
    const e = new Error('Admission not found'); e.status = 404; throw e;
  }
  ok(res, { message: `Admission status changed to ${status}`, data: doc });
});
