import Admission from '../models/Admission.js';
import Enquiry   from '../models/Enquiry.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';
import { list, getOne, remove } from './factoryController.js';

/**
 * Public form submission — creates a full Admission record AND a
 * lightweight Enquiry record so both the Admissions tab and the
 * Enquiries tab in the admin panel are populated.
 */
export const createAdmission = asyncHandler(async (req, res) => {
  const doc = await Admission.create(req.body);

  // Mirror a simplified enquiry record so the admin Enquiries section
  // shows website submissions.  We use findOneAndUpdate (upsert on phone)
  // so repeat submissions from the same number don't create duplicates.
  Enquiry.findOneAndUpdate(
    { phone: req.body.phone },
    {
      name:    `${req.body.studentName} / ${req.body.parentName}`,
      phone:   req.body.phone,
      email:   req.body.email  || '',
      program: req.body.program || 'General',
      message: req.body.message || '',
      status:  'New'
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).catch(() => {});   // fire-and-forget — never block the main response

  ok(res, { status: 201, message: 'Admission enquiry submitted successfully', data: doc });
});

export const listAdmissions    = list(Admission, ['studentName', 'parentName', 'phone']);
export const getAdmission      = getOne(Admission);
export const deleteAdmission   = remove(Admission);

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

  // Auto-assign next waiting list number when none is provided
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
