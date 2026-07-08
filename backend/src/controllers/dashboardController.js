import Admission from '../models/Admission.js';
import Contact from '../models/Contact.js';
import Newsletter from '../models/Newsletter.js';
import Teacher from '../models/Teacher.js';
import Gallery from '../models/Gallery.js';
import Event from '../models/Event.js';
import Notice from '../models/Notice.js';
import Testimonial from '../models/Testimonial.js';
import HeroSlide from '../models/HeroSlide.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';

const count = (Model, filter = {}) => Model.countDocuments(filter);
export const dashboardStats = asyncHandler(async (req, res) => {
  const [admissions, pendingAdmissions, approvedAdmissions, rejectedAdmissions, unreadMessages, subscribers, teachers, gallery, events, notices, testimonials, slides, recentAdmissions, recentContacts] = await Promise.all([
    count(Admission), count(Admission, { status: 'Pending' }), count(Admission, { status: 'Approved' }), count(Admission, { status: 'Rejected' }), count(Contact, { status: 'New' }), count(Newsletter, { isActive: true }), count(Teacher), count(Gallery), count(Event), count(Notice), count(Testimonial), count(HeroSlide),
    Admission.find().sort('-createdAt').limit(5).lean(), Contact.find().sort('-createdAt').limit(5).lean()
  ]);
  ok(res, { data: { admissions, pendingAdmissions, approvedAdmissions, rejectedAdmissions, unreadMessages, subscribers, teachers, gallery, events, notices, testimonials, slides, recentAdmissions, recentContacts } });
});
