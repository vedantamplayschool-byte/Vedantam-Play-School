import QRCode  from 'qrcode';
import Student  from '../models/Student.js';
import Teacher  from '../models/Teacher.js';
import Settings from '../models/Settings.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env }          from '../config/env.js';

const baseUrl = () => env.publicApiUrl || 'http://localhost:5000';

/* ── Shared premium ID card renderer (CR80, 85.6 × 54 mm) ──────────
   Ported from the id-cards/id-cards.html design mockup so the real
   print route actually produces this design instead of the older
   plain gradient card. `kind` is 'student' or 'teacher' and only
   changes accent colours / badge text; layout stays identical. */
function renderIdCard({ kind, name, fields, photoUrl, qrDataUrl, logoUrl, schoolName }) {
  const isStudent = kind === 'student';
  const topBar = isStudent
    ? 'linear-gradient(90deg, #EF4EA2 0%, #F7941D 18%, #FFCF01 35%, #4DB848 52%, #00B5AD 68%, #29ABE2 84%, #7B2D8B 100%)'
    : 'linear-gradient(90deg, #4DB848 0%, #00B5AD 25%, #29ABE2 50%, #7B2D8B 75%, #4DB848 100%)';
  const badgeBg = isStudent
    ? 'linear-gradient(135deg, #F7941D, #EF4EA2)'
    : 'linear-gradient(135deg, #00B5AD, #4DB848)';
  const badgeShadow = isStudent ? 'rgba(247,148,29,0.4)' : 'rgba(0,181,173,0.4)';
  const badgeText = isStudent ? 'Student ID' : 'Teacher ID';
  const photoBorder = isStudent
    ? 'linear-gradient(135deg, #F7941D, #EF4EA2, #FFCF01) border-box'
    : 'linear-gradient(135deg, #00B5AD, #4DB848, #29ABE2) border-box';
  const nameLine = isStudent ? 'linear-gradient(90deg, #F7941D, #EF4EA2)' : 'linear-gradient(90deg, #00B5AD, #4DB848)';
  const tagline2Color = isStudent ? '#7B2D8B' : '#00B5AD';
  const waveGrad1 = ['#4DB848', '#29ABE2'];
  const waveGrad2 = ['#00B5AD', '#7B2D8B'];
  const bubbleColors = isStudent
    ? ['#FFCF01', '#F7941D', '#EF4EA2', '#FFCF01', '#F7941D']
    : ['#29ABE2', '#00B5AD', '#4DB848', '#7B2D8B', '#29ABE2'];

  const fieldsHtml = fields.filter(f => f.value).map(f => `
      <div class="s-field" style="${f.marginTop ? 'margin-top:4px' : ''}">
        <div class="s-field-label">${f.label}</div>
        <div class="s-field-value" style="${f.mono ? `font-family:monospace;font-size:13px;color:${f.color || (isStudent ? '#4DB848' : '#00B5AD')};font-weight:700` : (f.small ? 'font-size:11.5px' : '')}">${f.value}</div>
      </div>`).join('');

  const uid = Math.random().toString(36).slice(2, 9);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ID Card — ${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }
  @page { size: 90mm 58mm; margin: 0; }
  body { background: #DDE3EF; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .card {
    width: 685px; height: 432px;
    border-radius: 20px; position: relative; overflow: hidden;
    background: #ffffff; flex-shrink: 0;
    box-shadow: 0 30px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9);
  }
  .s-topbar { position: absolute; top: 0; left: 0; right: 0; height: 5px; background: ${topBar}; }
  .s-bubbles { position: absolute; top: -30px; right: -30px; width: 200px; height: 200px; }
  .s-wave { position: absolute; bottom: -1px; left: -1px; }
  .s-header { position: absolute; top: 16px; left: 20px; display: flex; align-items: center; gap: 10px; z-index: 10; }
  .s-logo { width: 52px; height: 52px; border-radius: 12px; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.12); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; font-size: 24px; }
  .s-logo img { width: 48px; height: 48px; object-fit: contain; }
  .s-school-name { line-height: 1.15; }
  .s-school-name .s1 { font-size: 13.5px; font-weight: 800; color: #1a2340; letter-spacing: 0.2px; }
  .s-school-name .s2 { font-size: 9.5px; font-weight: 500; color: ${tagline2Color}; letter-spacing: 1.5px; text-transform: uppercase; }
  .s-badge { position: absolute; top: 20px; right: 22px; padding: 4px 12px; border-radius: 20px; font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; z-index: 10; background: ${badgeBg}; color: #fff; box-shadow: 0 3px 12px ${badgeShadow}; }
  .s-divider { position: absolute; top: 80px; left: 20px; right: 22px; height: 1px; background: linear-gradient(90deg, #e0e0e0 60%, transparent 100%); z-index: 5; }
  .s-photo { position: absolute; top: 94px; left: 22px; width: 148px; height: 188px; border-radius: 14px; overflow: hidden; z-index: 5; box-shadow: 0 6px 24px rgba(0,0,0,0.14); border: 3px solid transparent; background: linear-gradient(#fff,#fff) padding-box, ${photoBorder}; }
  .s-photo img { width: 100%; height: 100%; object-fit: cover; }
  .s-photo .photo-inner { width: 100%; height: 100%; background: linear-gradient(160deg, #f5f5f5, #e8ecf5); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
  .photo-icon { width: 52px; height: 52px; border-radius: 50%; background: #dde3f0; display: flex; align-items: center; justify-content: center; }
  .photo-icon svg { width: 28px; height: 28px; fill: #b0b8d0; }
  .photo-label { font-size: 9px; font-weight: 500; color: #b0b8d0; letter-spacing: 1px; }
  .s-info { position: absolute; top: 94px; left: 188px; right: 22px; z-index: 5; }
  .s-name { font-size: 18px; font-weight: 800; color: #1a2340; line-height: 1.2; margin-bottom: 6px; max-width: 100%; word-break: break-word; }
  .s-name-line { width: 32px; height: 3px; border-radius: 4px; margin-bottom: 14px; background: ${nameLine}; }
  .s-field { margin-bottom: 9px; }
  .s-field-label { font-size: 7.5px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #9aa3b8; margin-bottom: 2px; }
  .s-field-value { font-size: 12.5px; font-weight: 600; color: #2a3150; line-height: 1.3; }
  .s-qr { position: absolute; bottom: 18px; right: 22px; width: 70px; height: 70px; z-index: 10; }
  .qr-wrap { width: 70px; height: 70px; background: #fff; border-radius: 10px; padding: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; }
  .qr-wrap img { width: 100%; height: 100%; }
  .s-tagline { position: absolute; bottom: 14px; left: 22px; z-index: 10; }
  .s-tagline .tl { font-size: 7.5px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #9aa3b8; }
  .s-tagline .tl span { margin: 0 4px; }
  .s-tagline .addr { font-size: 7px; color: #b0b8c8; margin-top: 3px; font-weight: 400; }
  @media print { body { background: none; margin: 0; } }
</style>
</head>
<body>
<div class="card">
  <div class="s-topbar"></div>
  <svg class="s-bubbles" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="170" cy="30"  r="55" fill="${bubbleColors[0]}" opacity="0.18"/>
    <circle cx="145" cy="55"  r="40" fill="${bubbleColors[1]}" opacity="0.20"/>
    <circle cx="190" cy="70"  r="32" fill="${bubbleColors[2]}" opacity="0.16"/>
    <circle cx="155" cy="10"  r="22" fill="${bubbleColors[3]}" opacity="0.25"/>
    <circle cx="185" cy="20"  r="15" fill="${bubbleColors[4]}" opacity="0.30"/>
  </svg>
  <svg class="s-wave" width="220" height="110" viewBox="0 0 220 110" fill="none">
    <path d="M0 110 Q55 55 110 75 Q165 95 220 40 L220 110 Z" fill="url(#waveGrad1-${uid})" opacity="0.18"/>
    <path d="M0 110 Q45 70 95 82 Q145 94 220 60 L220 110 Z" fill="url(#waveGrad2-${uid})" opacity="0.28"/>
    <defs>
      <linearGradient id="waveGrad1-${uid}" x1="0" y1="0" x2="220" y2="0"><stop offset="0%" stop-color="${waveGrad1[0]}"/><stop offset="100%" stop-color="${waveGrad1[1]}"/></linearGradient>
      <linearGradient id="waveGrad2-${uid}" x1="0" y1="0" x2="220" y2="0"><stop offset="0%" stop-color="${waveGrad2[0]}"/><stop offset="100%" stop-color="${waveGrad2[1]}"/></linearGradient>
    </defs>
  </svg>
  <div class="s-header">
    <div class="s-logo">${logoUrl ? `<img src="${logoUrl}" alt="Logo">` : '🏫'}</div>
    <div class="s-school-name">
      <div class="s1">${schoolName}</div>
      <div class="s2">Play · Learn · Grow</div>
    </div>
  </div>
  <div class="s-badge">${badgeText}</div>
  <div class="s-divider"></div>
  <div class="s-photo">
    ${photoUrl ? `<img src="${photoUrl}" alt="${name}">` : `<div class="photo-inner"><div class="photo-icon"><svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg></div><div class="photo-label">PHOTO</div></div>`}
  </div>
  <div class="s-info">
    <div class="s-name">${name}</div>
    <div class="s-name-line"></div>
    ${fieldsHtml}
  </div>
  <div class="s-qr"><div class="qr-wrap"><img src="${qrDataUrl}" alt="QR"></div></div>
  <div class="s-tagline">
    <div class="tl"><span style="color:#4DB848">Play</span><span>·</span><span style="color:#29ABE2">Learn</span><span>·</span><span style="color:#F7941D">Grow</span></div>
    <div class="addr">${schoolName}, Damoh</div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;
}

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

  const now = new Date();
  const sessionLabel = `${now.getFullYear()} – ${String(now.getFullYear() + 1).slice(-2)}`;
  const programLabel = student.section ? `${student.program} — ${student.section}` : student.program;

  const html = renderIdCard({
    kind: 'student',
    name: student.studentName,
    photoUrl: student.photoUrl,
    qrDataUrl,
    logoUrl: logo,
    schoolName: school,
    fields: [
      { label: 'Class / Program', value: programLabel },
      { label: 'Admission No.', value: student.admissionNumber, mono: true, color: '#4DB848' },
      { label: 'Academic Year', value: sessionLabel },
      { label: 'Parent Contact', value: student.emergencyContact?.phone || student.phone, small: true, marginTop: true }
    ]
  });

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

  const html = renderIdCard({
    kind: 'teacher',
    name: teacher.name,
    photoUrl: teacher.photoUrl,
    qrDataUrl,
    logoUrl: logo,
    schoolName: school,
    fields: [
      { label: 'Designation', value: teacher.designation || teacher.qualification },
      { label: 'Employee ID', value: teacher.employeeId, mono: true, color: '#00B5AD' },
      { label: 'Department', value: teacher.department },
      { label: 'Contact', value: teacher.phone, small: true, marginTop: true }
    ]
  });

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});
