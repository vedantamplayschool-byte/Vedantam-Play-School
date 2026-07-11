import TeacherAttendance from '../models/TeacherAttendance.js';
import { asyncHandler }  from '../utils/asyncHandler.js';
import { ok }            from '../utils/apiResponse.js';

/* School timings — adjust via env if needed */
const EXPECTED_CHECK_IN_HOUR   = Number(process.env.SCHOOL_START_HOUR   || 8);   // 08:00
const EXPECTED_CHECK_IN_MINUTE = Number(process.env.SCHOOL_START_MINUTE || 30);  // 08:30
const EXPECTED_CHECK_OUT_HOUR  = Number(process.env.SCHOOL_END_HOUR     || 14);  // 14:00
const EXPECTED_CHECK_OUT_MINUTE= Number(process.env.SCHOOL_END_MINUTE   || 0);

const todayStart = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const todayEnd   = () => { const d = new Date(); d.setHours(23,59,59,999); return d; };

const getDeviceInfo = (req) => {
  const ua = req.headers['user-agent'] || '';
  return ua.substring(0, 300);
};

/* ── CHECK-IN ────────────────────────────────────────────────────── */
export const checkIn = asyncHandler(async (req, res) => {
  const teacher = req.teacher;
  const now = new Date();

  // Check if already checked in today
  const existing = await TeacherAttendance.findOne({
    teacher: teacher._id,
    date: { $gte: todayStart(), $lte: todayEnd() }
  });

  if (existing?.checkInAt) {
    const e = new Error('Already checked in today'); e.status = 409; throw e;
  }

  // Determine if late
  const expected = new Date(now);
  expected.setHours(EXPECTED_CHECK_IN_HOUR, EXPECTED_CHECK_IN_MINUTE, 0, 0);
  const isLate = now > expected;

  // Format time string for backward compat with admin UI
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const gpsLat = req.body.gpsLat ? parseFloat(req.body.gpsLat) : undefined;
  const gpsLng = req.body.gpsLng ? parseFloat(req.body.gpsLng) : undefined;

  const dateOnly = new Date(now);
  dateOnly.setHours(0, 0, 0, 0);

  const attendance = await TeacherAttendance.findOneAndUpdate(
    { teacher: teacher._id, date: dateOnly },
    {
      $set: {
        checkInAt:    now,
        checkIn:      timeStr,
        lateEntry:    isLate,
        status:       isLate ? 'Late' : 'Present',
        source:       'self',
        deviceInfo:   getDeviceInfo(req),
        ipAddress:    req.ip || '',
        ...(gpsLat !== undefined ? { gpsLat } : {}),
        ...(gpsLng !== undefined ? { gpsLng } : {}),
        // future-ready — always null (Module 3 spec)
        checkInImageUrl: null
      }
    },
    { upsert: true, new: true, runValidators: true }
  );

  ok(res, {
    message: isLate ? `Checked in — Late by ${Math.round((now - expected) / 60000)} min` : 'Checked in successfully ✓',
    data: {
      checkInAt:  attendance.checkInAt,
      checkIn:    attendance.checkIn,
      lateEntry:  attendance.lateEntry,
      status:     attendance.status
    }
  });
});

/* ── CHECK-OUT ───────────────────────────────────────────────────── */
export const checkOut = asyncHandler(async (req, res) => {
  const teacher = req.teacher;
  const now = new Date();

  const existing = await TeacherAttendance.findOne({
    teacher: teacher._id,
    date: { $gte: todayStart(), $lte: todayEnd() }
  });

  if (!existing?.checkInAt) {
    const e = new Error('You have not checked in today'); e.status = 400; throw e;
  }
  if (existing.checkOutAt) {
    const e = new Error('Already checked out today'); e.status = 409; throw e;
  }

  const expected = new Date(now);
  expected.setHours(EXPECTED_CHECK_OUT_HOUR, EXPECTED_CHECK_OUT_MINUTE, 0, 0);
  const isEarlyExit = now < expected;

  const workingMs   = now - existing.checkInAt;
  const workingHrs  = Math.round((workingMs / 3600000) * 100) / 100;

  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const gpsLat = req.body.gpsLat ? parseFloat(req.body.gpsLat) : undefined;
  const gpsLng = req.body.gpsLng ? parseFloat(req.body.gpsLng) : undefined;

  const updated = await TeacherAttendance.findByIdAndUpdate(
    existing._id,
    {
      checkOutAt:   now,
      checkOut:     timeStr,
      workingHours: workingHrs,
      earlyExit:    isEarlyExit,
      // future-ready
      checkOutImageUrl: null,
      ...(gpsLat !== undefined ? { gpsLat } : {}),
      ...(gpsLng !== undefined ? { gpsLng } : {})
    },
    { new: true }
  );

  ok(res, {
    message: isEarlyExit ? `Checked out early — ${workingHrs}h` : `Checked out — Total ${workingHrs}h`,
    data: {
      checkOutAt:   updated.checkOutAt,
      checkOut:     updated.checkOut,
      workingHours: updated.workingHours,
      earlyExit:    updated.earlyExit
    }
  });
});

/* ── TODAY STATUS ────────────────────────────────────────────────── */
export const todayStatus = asyncHandler(async (req, res) => {
  const record = await TeacherAttendance.findOne({
    teacher: req.teacher._id,
    date:    { $gte: todayStart(), $lte: todayEnd() }
  }).lean();

  ok(res, { data: record || null });
});

/* ── HISTORY (teacher) ───────────────────────────────────────────── */
export const myAttendanceHistory = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || 1));
  const limit = Math.min(50, parseInt(req.query.limit || 30));
  const skip  = (page - 1) * limit;

  const filter = { teacher: req.teacher._id };
  if (req.query.month && req.query.year) {
    const y = parseInt(req.query.year);
    const m = parseInt(req.query.month) - 1;
    filter.date = {
      $gte: new Date(y, m, 1),
      $lt:  new Date(y, m + 1, 1)
    };
  }

  const [items, total] = await Promise.all([
    TeacherAttendance.find(filter).sort('-date').skip(skip).limit(limit).lean(),
    TeacherAttendance.countDocuments(filter)
  ]);

  ok(res, { data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

/* ── ADMIN: LIST ALL CHECKINS FOR A DATE ────────────────────────── */
export const adminCheckInList = asyncHandler(async (req, res) => {
  const dateParam = req.query.date ? new Date(req.query.date) : new Date();
  dateParam.setHours(0, 0, 0, 0);
  const dateEnd = new Date(dateParam); dateEnd.setHours(23, 59, 59, 999);

  const items = await TeacherAttendance.find({
    date: { $gte: dateParam, $lte: dateEnd },
    source: 'self'
  })
    .populate('teacher', 'name employeeId designation photoUrl')
    .sort('checkInAt')
    .lean();

  ok(res, { data: items });
});
