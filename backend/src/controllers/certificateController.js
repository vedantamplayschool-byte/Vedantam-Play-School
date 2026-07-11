import Student  from '../models/Student.js';
import Settings from '../models/Settings.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const pad = n => String(n).padStart(2, '0');
const fmtDate = d => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

const baseStyles = () => `
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #1a1a1a; background: #fff; }
  .cert { max-width: 750px; margin: 0 auto; padding: 40px; border: 3px double #764ba2; min-height: 200px; }
  .header { text-align: center; margin-bottom: 30px; }
  .logo { width: 70px; height: 70px; object-fit: contain; }
  .school { font-size: 24px; font-weight: 700; color: #764ba2; margin: 8px 0 4px; font-family: 'Segoe UI', sans-serif; }
  .tagline { font-size: 13px; color: #666; letter-spacing: 2px; text-transform: uppercase; }
  .divider { border: none; border-top: 2px solid #764ba2; margin: 16px auto; width: 80%; }
  .cert-type { font-size: 22px; font-weight: 700; text-align: center; color: #4a4a8a; margin: 20px 0; letter-spacing: 2px; text-transform: uppercase; }
  .cert-no { text-align: right; font-size: 12px; color: #888; margin-bottom: 20px; }
  .body-text { font-size: 15px; line-height: 2; text-align: justify; margin: 20px 0; }
  .highlight { font-weight: 700; text-decoration: underline; }
  .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-block { text-align: center; min-width: 140px; }
  .sig-line { border-top: 1px solid #333; padding-top: 6px; font-size: 12px; }
  .date-block { font-size: 13px; }
  @media print { body { margin: 0; } }
`;

const certNo = () => `VPS/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
const todayStr = () => fmtDate(new Date());

const getSchoolInfo = async () => {
  const s = await Settings.findOne().lean();
  return {
    name:    s?.schoolName || 'Vedantam Play School',
    tagline: s?.tagline    || 'Play · Learn · Grow',
    logo:    s?.logoUrl    || '',
    address: s?.address    || 'Damoh, Madhya Pradesh',
    phone:   s?.phone      || '',
    email:   s?.email      || ''
  };
};

/* ── BONAFIDE ─────────────────────────────────────────────────────── */
export const bonafide = asyncHandler(async (req, res) => {
  const [student, school] = await Promise.all([
    Student.findById(req.params.id).lean(),
    getSchoolInfo()
  ]);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bonafide Certificate</title>
<style>${baseStyles()}</style></head><body>
<div class="cert">
  <div class="header">
    ${school.logo ? `<img class="logo" src="${school.logo}" alt="">` : ''}
    <div class="school">${school.name}</div>
    <div class="tagline">${school.tagline}</div>
    <div style="font-size:12px;color:#888;margin-top:4px">${school.address}${school.phone ? ' | ' + school.phone : ''}</div>
  </div>
  <hr class="divider">
  <div class="cert-type">Bonafide Certificate</div>
  <div class="cert-no">Cert. No.: ${certNo()}</div>
  <div class="body-text">
    This is to certify that <span class="highlight">${student.studentName}</span>
    ${student.gender === 'Male' ? 'S/o' : student.gender === 'Female' ? 'D/o' : 'C/o'}
    <span class="highlight">${student.parentName}</span>,
    ${student.dateOfBirth ? `born on <span class="highlight">${fmtDate(student.dateOfBirth)}</span>,` : ''}
    is / was a <em>bonafide</em> student of this institution and is currently enrolled in
    <span class="highlight">${student.program}</span>
    ${student.section ? `– Section <span class="highlight">${student.section}</span>` : ''}
    with Admission Number <span class="highlight">${student.admissionNumber || '—'}</span>
    for the academic year <span class="highlight">${new Date().getFullYear()}–${new Date().getFullYear() + 1}</span>.
  </div>
  <div class="body-text">This certificate is issued on request for educational purposes.</div>
  <div class="footer">
    <div class="date-block">Date: ${todayStr()}<br>Place: ${school.address.split(',')[0] || 'Damoh'}</div>
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line">Principal / Head of School<br>${school.name}</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/* ── ADMISSION CERTIFICATE ───────────────────────────────────────── */
export const admissionCert = asyncHandler(async (req, res) => {
  const [student, school] = await Promise.all([
    Student.findById(req.params.id).lean(),
    getSchoolInfo()
  ]);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admission Certificate</title>
<style>${baseStyles()}</style></head><body>
<div class="cert">
  <div class="header">
    ${school.logo ? `<img class="logo" src="${school.logo}" alt="">` : ''}
    <div class="school">${school.name}</div>
    <div class="tagline">${school.tagline}</div>
  </div>
  <hr class="divider">
  <div class="cert-type">Admission Certificate</div>
  <div class="cert-no">Adm. No.: <strong>${student.admissionNumber || '—'}</strong></div>
  <div class="body-text">
    This is to certify that <span class="highlight">${student.studentName}</span>
    has been admitted to <span class="highlight">${school.name}</span>
    in the <span class="highlight">${student.program}</span> programme
    ${student.section ? `(Section <span class="highlight">${student.section}</span>)` : ''}
    with effect from <span class="highlight">${fmtDate(student.admissionDate || student.createdAt)}</span>.
  </div>
  <div class="body-text" style="margin-top:16px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;width:200px;color:#555">Student Name</td><td><strong>${student.studentName}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#555">Parent / Guardian</td><td><strong>${student.parentName}</strong></td></tr>
      ${student.dateOfBirth ? `<tr><td style="padding:6px 0;color:#555">Date of Birth</td><td><strong>${fmtDate(student.dateOfBirth)}</strong></td></tr>` : ''}
      ${student.gender ? `<tr><td style="padding:6px 0;color:#555">Gender</td><td><strong>${student.gender}</strong></td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#555">Programme</td><td><strong>${student.program}</strong></td></tr>
      ${student.bloodGroup ? `<tr><td style="padding:6px 0;color:#555">Blood Group</td><td><strong>${student.bloodGroup}</strong></td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#555">Contact</td><td><strong>${student.phone}</strong></td></tr>
    </table>
  </div>
  <div class="footer">
    <div class="date-block">Date: ${todayStr()}</div>
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line">Authorised Signatory<br>${school.name}</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/* ── CHARACTER CERTIFICATE ───────────────────────────────────────── */
export const characterCert = asyncHandler(async (req, res) => {
  const [student, school] = await Promise.all([
    Student.findById(req.params.id).lean(),
    getSchoolInfo()
  ]);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Character Certificate</title>
<style>${baseStyles()}</style></head><body>
<div class="cert">
  <div class="header">
    ${school.logo ? `<img class="logo" src="${school.logo}" alt="">` : ''}
    <div class="school">${school.name}</div>
    <div class="tagline">${school.tagline}</div>
  </div>
  <hr class="divider">
  <div class="cert-type">Character Certificate</div>
  <div class="cert-no">Cert. No.: ${certNo()}</div>
  <div class="body-text">
    This is to certify that <span class="highlight">${student.studentName}</span>,
    ${student.gender === 'Male' ? 'son' : student.gender === 'Female' ? 'daughter' : 'ward'} of
    <span class="highlight">${student.parentName}</span>,
    Admission No. <span class="highlight">${student.admissionNumber || '—'}</span>,
    was a student of this school in <span class="highlight">${student.program}</span>.
  </div>
  <div class="body-text">
    During ${student.gender === 'Male' ? 'his' : student.gender === 'Female' ? 'her' : 'their'}
    association with our institution,
    ${student.gender === 'Male' ? 'his' : student.gender === 'Female' ? 'her' : 'their'}
    character and conduct have been found to be
    <span class="highlight">Excellent</span>.
    ${student.gender === 'Male' ? 'He' : student.gender === 'Female' ? 'She' : 'They'}
    has always been sincere, obedient, and well-behaved.
  </div>
  <div class="body-text">We wish ${student.gender === 'Male' ? 'him' : student.gender === 'Female' ? 'her' : 'them'} all the best in future endeavours.</div>
  <div class="footer">
    <div class="date-block">Date: ${todayStr()}</div>
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line">Principal<br>${school.name}</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/* ── TRANSFER CERTIFICATE ────────────────────────────────────────── */
export const transferCert = asyncHandler(async (req, res) => {
  const [student, school] = await Promise.all([
    Student.findById(req.params.id).lean(),
    getSchoolInfo()
  ]);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Transfer Certificate</title>
<style>${baseStyles()}</style></head><body>
<div class="cert">
  <div class="header">
    ${school.logo ? `<img class="logo" src="${school.logo}" alt="">` : ''}
    <div class="school">${school.name}</div>
    <div class="tagline">${school.tagline}</div>
    <div style="font-size:12px;color:#888;margin-top:4px">${school.address}</div>
  </div>
  <hr class="divider">
  <div class="cert-type">Transfer Certificate</div>
  <div class="cert-no">TC No.: ${certNo()}</div>
  <div class="body-text">
    <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:2">
      <tr><td style="width:260px;color:#555">1. Name of Student</td><td><strong>${student.studentName}</strong></td></tr>
      <tr><td style="color:#555">2. Father's Name</td><td><strong>${student.fatherName || student.parentName}</strong></td></tr>
      <tr><td style="color:#555">3. Mother's Name</td><td><strong>${student.motherName || '—'}</strong></td></tr>
      <tr><td style="color:#555">4. Date of Birth</td><td><strong>${fmtDate(student.dateOfBirth)}</strong></td></tr>
      <tr><td style="color:#555">5. Admission No.</td><td><strong>${student.admissionNumber || '—'}</strong></td></tr>
      <tr><td style="color:#555">6. Programme / Class</td><td><strong>${student.program}</strong></td></tr>
      <tr><td style="color:#555">7. Date of Admission</td><td><strong>${fmtDate(student.admissionDate || student.createdAt)}</strong></td></tr>
      <tr><td style="color:#555">8. Date of Leaving</td><td><strong>${fmtDate(student.transferCertificateDate || new Date())}</strong></td></tr>
      <tr><td style="color:#555">9. Conduct</td><td><strong>Good</strong></td></tr>
      <tr><td style="color:#555">10. Reason for Leaving</td><td><strong>${req.query.reason || 'At Parent\'s Request'}</strong></td></tr>
    </table>
  </div>
  <div class="footer">
    <div class="date-block">Date: ${todayStr()}<br>Place: ${school.address.split(',')[0] || 'Damoh'}</div>
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line">Principal / Head of School<br>${school.name}</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/* ── NURSERY COMPLETION CERTIFICATE ─────────────────────────────── */
export const completionCert = asyncHandler(async (req, res) => {
  const [student, school] = await Promise.all([
    Student.findById(req.params.id).lean(),
    getSchoolInfo()
  ]);
  if (!student) { const e = new Error('Student not found'); e.status = 404; throw e; }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Completion Certificate</title>
<style>
${baseStyles()}
.cert { border: 4px double #f6c90e; }
.cert-type { color: #c47900; }
.star { color: #f6c90e; font-size: 28px; text-align: center; margin: 12px 0; }
</style></head><body>
<div class="cert">
  <div class="header">
    ${school.logo ? `<img class="logo" src="${school.logo}" alt="">` : ''}
    <div class="school">${school.name}</div>
    <div class="tagline">${school.tagline}</div>
  </div>
  <hr class="divider">
  <div class="star">★ ★ ★</div>
  <div class="cert-type">Certificate of Completion</div>
  <div style="text-align:center;font-size:14px;color:#888;margin-bottom:20px">${student.program} Programme · ${new Date().getFullYear()}</div>
  <div class="body-text" style="text-align:center">
    This is to certify that<br><br>
    <span style="font-size:22px;font-weight:700;color:#4a4a8a">${student.studentName}</span><br><br>
    has successfully completed the <strong>${student.program}</strong> programme
    at <strong>${school.name}</strong> for the academic year
    <strong>${new Date().getFullYear()}–${new Date().getFullYear() + 1}</strong>.<br><br>
    We wish ${student.gender === 'Female' ? 'her' : 'him'} continued success and happiness in
    ${student.gender === 'Female' ? 'her' : 'his'} educational journey.
  </div>
  <div class="star">★ ★ ★</div>
  <div class="footer" style="margin-top:30px">
    <div class="date-block">Date: ${todayStr()}</div>
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line">Principal<br>${school.name}</div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});
