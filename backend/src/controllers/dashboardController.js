import Admission       from '../models/Admission.js';
import Contact         from '../models/Contact.js';
import Newsletter      from '../models/Newsletter.js';
import Teacher         from '../models/Teacher.js';
import Gallery         from '../models/Gallery.js';
import Event           from '../models/Event.js';
import Notice          from '../models/Notice.js';
import Testimonial     from '../models/Testimonial.js';
import HeroSlide       from '../models/HeroSlide.js';
import Student         from '../models/Student.js';
import Enquiry         from '../models/Enquiry.js';
import Parent          from '../models/Parent.js';
import FeePayment      from '../models/FeePayment.js';
import AcademicSession from '../models/AcademicSession.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok }           from '../utils/apiResponse.js';

const count = (Model, filter = {}) => Model.countDocuments(filter);

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const monthStart = () => {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d;
};

export const dashboardStats = asyncHandler(async (req, res) => {
  const today = todayStart();
  const month = monthStart();

  // Active academic session
  const activeSession = await AcademicSession.findOne({ isActive: true }).lean();

  const [
    admissions,
    pendingAdmissions,
    approvedAdmissions,
    rejectedAdmissions,
    waitingAdmissions,
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
    parents,
    monthlyCollectionAgg,
    todayCollectionAgg,
    feeDueCount,
    recentAdmissions,
    recentContacts,
    recentStudents,
    recentEnquiries,
    recentNotices,
    recentFees,
    birthdaysToday
  ] = await Promise.all([
    count(Admission),
    count(Admission, { status: 'Pending' }),
    count(Admission, { status: 'Approved' }),
    count(Admission, { status: 'Rejected' }),
    count(Admission, { status: 'Waiting' }),
    count(Admission, { createdAt: { $gte: today } }),
    count(Enquiry,   { createdAt: { $gte: today } }),
    count(Contact,   { status: 'New' }),
    count(Newsletter,{ isActive: true }),
    count(Teacher,   { isActive: true }),
    count(Gallery),
    count(Event),
    count(Event, { eventDate: { $gte: new Date() }, isPublished: true }),
    count(Notice,    { isPublished: true }),
    count(Testimonial),
    count(HeroSlide),
    count(Student,   { isActive: true }),
    count(Enquiry),
    count(Parent,    { isActive: true }),

    // Monthly collection (paid payments this month)
    FeePayment.aggregate([
      { $match: { paymentDate: { $gte: month }, status: { $in: ['Paid', 'Partial'] } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]),

    // Today's collection
    FeePayment.aggregate([
      { $match: { paymentDate: { $gte: today }, status: { $in: ['Paid', 'Partial'] } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]),

    // Fee due count (balance > 0, not waived)
    count(FeePayment, { balance: { $gt: 0 }, status: { $nin: ['Waived'] } }),

    Admission.find().sort('-createdAt').limit(5).lean(),
    Contact.find().sort('-createdAt').limit(5).lean(),
    Student.find().sort('-createdAt').limit(5).lean(),
    Enquiry.find().sort('-createdAt').limit(5).lean(),
    Notice.find({ isPublished: true }).sort('-createdAt').limit(5).lean(),
    FeePayment.find({ status: { $in: ['Paid', 'Partial'] } })
      .sort('-paymentDate').limit(5)
      .populate('student', 'studentName admissionNumber')
      .lean(),

    // Birthdays today
    Student.find({
      isActive: true,
      dateOfBirth: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
        $lt:  new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1)
      }
    }, 'studentName program photoUrl dateOfBirth').lean()
  ]);

  // Activity feed
  const activityItems = [
    ...recentAdmissions.map(i => ({ type: 'admission', label: `New admission: ${i.studentName}`,   sub: i.program,     time: i.createdAt })),
    ...recentContacts  .map(i => ({ type: 'contact',   label: `Message from ${i.name}`,            sub: i.subject||'', time: i.createdAt })),
    ...recentStudents  .map(i => ({ type: 'student',   label: `Student enrolled: ${i.studentName}`,sub: i.program,     time: i.createdAt })),
    ...recentEnquiries .map(i => ({ type: 'enquiry',   label: `Enquiry from ${i.name}`,            sub: i.phone,       time: i.createdAt })),
    ...recentNotices   .map(i => ({ type: 'notice',    label: `Notice: ${i.title}`,                sub: i.priority||'',time: i.createdAt })),
    ...recentFees      .map(i => ({ type: 'fee',       label: `Fee paid: ${i.student?.studentName||''}`, sub: `₹${i.amountPaid}`, time: i.paymentDate }))
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 12);

  ok(res, {
    data: {
      // Admissions
      admissions, pendingAdmissions, approvedAdmissions, rejectedAdmissions, waitingAdmissions,
      todayAdmissions,
      // Communication
      todayEnquiries, unreadMessages, subscribers, enquiries,
      // Staff & content
      teachers, gallery, events, upcomingEvents, notices, testimonials, slides,
      // Students & parents
      students, parents,
      // Fees (v2.0)
      monthlyCollection: monthlyCollectionAgg[0]?.total || 0,
      todayCollection:   todayCollectionAgg[0]?.total   || 0,
      feeDue:            feeDueCount,
      // Academic session
      activeSession,
      // Notifications
      birthdaysToday,
      // Lists
      recentAdmissions,
      recentFees,
      activityFeed: activityItems
    }
  });
});
