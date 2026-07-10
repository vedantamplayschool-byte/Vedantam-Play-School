import Admission from '../models/Admission.js';
import Contact from '../models/Contact.js';
import Newsletter from '../models/Newsletter.js';
import Teacher from '../models/Teacher.js';
import Gallery from '../models/Gallery.js';
import Event from '../models/Event.js';
import Notice from '../models/Notice.js';
import Testimonial from '../models/Testimonial.js';
import HeroSlide from '../models/HeroSlide.js';
import Student from '../models/Student.js';
import Enquiry from '../models/Enquiry.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';

const count = (Model, filter = {}) => Model.countDocuments(filter);

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const dashboardStats = asyncHandler(async (req, res) => {
  const today = todayStart();

  const [
    admissions,
    pendingAdmissions,
    approvedAdmissions,
    rejectedAdmissions,
    todayAdmissions,
    todayEnquiries,
    unreadMessages,
    subscribers,
    teachers,
    gallery,
    events,
    upcomingEvents,
    notices,
    testimonials,
    slides,
    students,
    enquiries,
    recentAdmissions,
    recentContacts,
    recentStudents,
    recentEnquiries,
    recentNotices
  ] = await Promise.all([
    count(Admission),
    count(Admission, { status: 'Pending' }),
    count(Admission, { status: 'Approved' }),
    count(Admission, { status: 'Rejected' }),
    count(Admission, { createdAt: { $gte: today } }),
    count(Enquiry, { createdAt: { $gte: today } }),
    count(Contact, { status: 'New' }),
    count(Newsletter, { isActive: true }),
    count(Teacher, { isActive: true }),
    count(Gallery),
    count(Event),
    count(Event, { eventDate: { $gte: new Date() }, isPublished: true }),
    count(Notice, { isPublished: true }),
    count(Testimonial),
    count(HeroSlide),
    count(Student, { isActive: true }),
    count(Enquiry),
    Admission.find().sort('-createdAt').limit(5).lean(),
    Contact.find().sort('-createdAt').limit(5).lean(),
    Student.find().sort('-createdAt').limit(5).lean(),
    Enquiry.find().sort('-createdAt').limit(5).lean(),
    Notice.find({ isPublished: true }).sort('-createdAt').limit(5).lean()
  ]);

  // Build a chronological recent-activity feed
  const activityItems = [
    ...recentAdmissions.map(i => ({ type: 'admission', label: `New admission: ${i.studentName}`, sub: i.program, time: i.createdAt })),
    ...recentContacts.map(i => ({ type: 'contact', label: `Contact message from ${i.name}`, sub: i.subject || '', time: i.createdAt })),
    ...recentStudents.map(i => ({ type: 'student', label: `Student enrolled: ${i.studentName}`, sub: i.program, time: i.createdAt })),
    ...recentEnquiries.map(i => ({ type: 'enquiry', label: `Enquiry from ${i.name}`, sub: i.phone, time: i.createdAt })),
    ...recentNotices.map(i => ({ type: 'notice', label: `Notice published: ${i.title}`, sub: i.priority || '', time: i.createdAt }))
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10);

  ok(res, {
    data: {
      admissions,
      pendingAdmissions,
      approvedAdmissions,
      rejectedAdmissions,
      todayAdmissions,
      todayEnquiries,
      unreadMessages,
      subscribers,
      teachers,
      gallery,
      events,
      upcomingEvents,
      notices,
      testimonials,
      slides,
      students,
      enquiries,
      recentAdmissions,
      recentContacts,
      activityFeed: activityItems
    }
  });
});
