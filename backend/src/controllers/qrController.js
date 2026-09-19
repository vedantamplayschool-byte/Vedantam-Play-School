import QRCode  from 'qrcode';
import Student  from '../models/Student.js';
import Teacher  from '../models/Teacher.js';
import Settings from '../models/Settings.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env }          from '../config/env.js';

const baseUrl = () => env.publicApiUrl || 'http://localhost:5000';

/* ── STUDENT QR (data URL) ───────────────────────────────────────── */
export const studentQR = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).lean();
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const qrData = JSON.stringify({
    admissionNumber: student.admissionNumber,
    name:   student.studentName,
    program: student.program,
    emergency: student.emergencyContact?.phone || student.phone,
    profile: `${baseUrl()}/students/${student._id}`
  });

  const dataUrl = await QRCode.toDataURL(qrData, {
    width: 300,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' }
  });

  res.json({ success: true, data: { qrDataUrl: dataUrl, student } });
});

/* ── TEACHER QR (data URL) ───────────────────────────────────────── */
export const teacherQR = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id).lean();
  if (!teacher) { const e = new Error('Teacher not found'); e.status = 404; throw e; }

  const qrData = JSON.stringify({
    employeeId: teacher.employeeId,
    name:   teacher.name,
    designation: teacher.designation,
    phone:  teacher.phone
  });

  const dataUrl = await QRCode.toDataURL(qrData, {
    width: 300,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' }
  });

  res.json({ success: true, data: { qrDataUrl: dataUrl, teacher } });
});

/* ── STUDENT ID CARD HTML (print-ready) ─────────────────────────── */
export const studentIdCard = asyncHandler(async (req, res) => {
  const [student, settings] = await Promise.all([
    Student.findById(req.params.id).lean(),
    Settings.findOne().lean()
  ]);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const qrData = JSON.stringify({
    admissionNumber: student.admissionNumber,
    name: student.studentName,
    emergency: student.emergencyContact?.phone || student.phone
  });
  const qrDataUrl = await QRCode.toDataURL(qrData, { width: 120, margin: 1 });

  const school = settings?.schoolName || 'Vedantam Play School';
  const logo   = settings?.logoUrl    || '';
  const phone  = settings?.phone      || '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ID Card — ${student.studentName}</title>
<style>
  @page { size: 85.6mm 53.98mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
  body { background: #f0f4ff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .card {
    width: 85.6mm; height: 53.98mm;
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    border-radius: 8px; overflow: hidden; position: relative;
    display: flex; flex-direction: column;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    color: #fff;
  }
  .header {
    background: rgba(255,255,255,0.15); backdrop-filter: blur(4px);
    padding: 5px 10px; display: flex; align-items: center; gap: 6px;
    border-bottom: 1px solid rgba(255,255,255,0.2);
  }
  .logo { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; background: #fff; }
  .school-name { font-size: 8px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
  .tagline { font-size: 6px; opacity: 0.85; }
  .body { flex: 1; display: flex; padding: 6px 10px; gap: 8px; }
  .photo {
    width: 30mm; height: 30mm; border-radius: 6px; object-fit: cover;
    border: 2px solid rgba(255,255,255,0.6);
    background: rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-size: 20px;
  }
  .photo img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
  .info { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 3px; }
  .name { font-size: 11px; font-weight: 700; line-height: 1.2; }
  .program { font-size: 8px; background: rgba(255,255,255,0.2); display: inline-block; padding: 1px 5px; border-radius: 3px; margin-top: 2px; }
  .row { font-size: 7.5px; display: flex; gap: 4px; align-items: center; opacity: 0.9; }
  .row span:first-child { opacity: 0.7; min-width: 40px; }
  .qr { width: 20mm; height: 20mm; align-self: flex-end; }
  .qr img { width: 100%; height: 100%; }
  .footer {
    background: rgba(0,0,0,0.2); padding: 3px 10px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 6.5px; opacity: 0.9;
  }
  @media print { body { background: none; margin: 0; } }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    ${logo ? `<img class="logo" src="${logo}" alt="Logo">` : '<div class="logo" style="display:flex;align-items:center;justify-content:center;font-size:12px;">🏫</div>'}
    <div>
      <div class="school-name">${school}</div>
      <div class="tagline">Play · Learn · Grow</div>
    </div>
    <div style="margin-left:auto;font-size:7px;opacity:0.8;text-align:right">STUDENT<br>ID CARD</div>
  </div>
  <div class="body">
    <div class="photo">
      ${student.photoUrl ? `<img src="${student.photoUrl}" alt="${student.studentName}">` : '🧒'}
    </div>
    <div class="info">
      <div class="name">${student.studentName}</div>
      <div class="program">${student.program}</div>
      <div class="row"><span>Adm No.</span><span>${student.admissionNumber || '—'}</span></div>
      ${student.dateOfBirth ? `<div class="row"><span>DOB</span><span>${new Date(student.dateOfBirth).toLocaleDateString('en-IN')}</span></div>` : ''}
      ${student.gender ? `<div class="row"><span>Gender</span><span>${student.gender}</span></div>` : ''}
      ${student.bloodGroup ? `<div class="row"><span>Blood</span><span>${student.bloodGroup}</span></div>` : ''}
      ${student.section ? `<div class="row"><span>Section</span><span>${student.section}</span></div>` : ''}
      <div class="row"><span>Parent</span><span>${student.parentName}</span></div>
      <div class="row"><span>Ph.</span><span>${student.emergencyContact?.phone || student.phone}</span></div>
    </div>
    <div class="qr"><img src="${qrDataUrl}" alt="QR"></div>
  </div>
  <div class="footer">
    <span>${phone}</span>
    <span>Session ${new Date().getFullYear()}–${String(new Date().getFullYear() + 1).slice(-2)}</span>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/* ── TEACHER ID CARD HTML ────────────────────────────────────────── */
export const teacherIdCard = asyncHandler(async (req, res) => {
  const [teacher, settings] = await Promise.all([
    Teacher.findById(req.params.id).lean(),
    Settings.findOne().lean()
  ]);
  if (!teacher) { const e = new Error('Teacher not found'); e.status = 404; throw e; }

  const qrData = JSON.stringify({ employeeId: teacher.employeeId, name: teacher.name });
  const qrDataUrl = await QRCode.toDataURL(qrData, { width: 120, margin: 1 });

  const school = settings?.schoolName || 'Vedantam Play School';
  const logo   = settings?.logoUrl    || '';
  const phone  = settings?.phone      || '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ID Card — ${teacher.name}</title>
<style>
  @page { size: 85.6mm 53.98mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
  body { background: #f0f4ff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .card {
    width: 85.6mm; height: 53.98mm;
    background: linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%);
    border-radius: 8px; overflow: hidden; position: relative;
    display: flex; flex-direction: column;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3); color: #fff;
  }
  .header { background: rgba(255,255,255,0.15); padding: 5px 10px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid rgba(255,255,255,0.2); }
  .logo { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; background: #fff; }
  .school-name { font-size: 8px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
  .tagline { font-size: 6px; opacity: 0.85; }
  .body { flex: 1; display: flex; padding: 6px 10px; gap: 8px; }
  .photo { width: 30mm; height: 30mm; border-radius: 6px; object-fit: cover; border: 2px solid rgba(255,255,255,0.6); background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px; }
  .photo img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
  .info { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 3px; }
  .name { font-size: 11px; font-weight: 700; }
  .designation { font-size: 8px; background: rgba(255,255,255,0.2); display: inline-block; padding: 1px 5px; border-radius: 3px; margin-top: 2px; }
  .row { font-size: 7.5px; display: flex; gap: 4px; opacity: 0.9; }
  .row span:first-child { opacity: 0.7; min-width: 40px; }
  .qr { width: 20mm; height: 20mm; align-self: flex-end; }
  .qr img { width: 100%; height: 100%; }
  .footer { background: rgba(0,0,0,0.2); padding: 3px 10px; display: flex; justify-content: space-between; font-size: 6.5px; opacity: 0.9; align-items: center; }
  @media print { body { background: none; margin: 0; } }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    ${logo ? `<img class="logo" src="${logo}" alt="">` : '<div class="logo" style="display:flex;align-items:center;justify-content:center;font-size:12px;">🏫</div>'}
    <div>
      <div class="school-name">${school}</div>
      <div class="tagline">Play · Learn · Grow</div>
    </div>
    <div style="margin-left:auto;font-size:7px;opacity:0.8;text-align:right">STAFF<br>ID CARD</div>
  </div>
  <div class="body">
    <div class="photo">${teacher.photoUrl ? `<img src="${teacher.photoUrl}" alt="${teacher.name}">` : '👩‍🏫'}</div>
    <div class="info">
      <div class="name">${teacher.name}</div>
      <div class="designation">${teacher.designation || teacher.qualification}</div>
      ${teacher.employeeId ? `<div class="row"><span>Emp ID</span><span>${teacher.employeeId}</span></div>` : ''}
      ${teacher.qualification ? `<div class="row"><span>Qual.</span><span>${teacher.qualification}</span></div>` : ''}
      ${teacher.phone ? `<div class="row"><span>Phone</span><span>${teacher.phone}</span></div>` : ''}
      ${teacher.bloodGroup ? `<div class="row"><span>Blood</span><span>${teacher.bloodGroup}</span></div>` : ''}
      ${teacher.joiningDate ? `<div class="row"><span>Joined</span><span>${new Date(teacher.joiningDate).toLocaleDateString('en-IN')}</span></div>` : ''}
    </div>
    <div class="qr"><img src="${qrDataUrl}" alt="QR"></div>
  </div>
  <div class="footer">
    <span>${phone}</span>
    <span>AUTHORISED SIGNATORY</span>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});
