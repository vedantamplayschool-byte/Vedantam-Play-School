'use strict';
/* ================================================================
   VEDANTAM PLAY SCHOOL — TEACHER PORTAL v2.5
   Handles: Auth · Dashboard · Check-in/out · Students · Homework ·
            Leave Requests · Profile
   ================================================================ */

const API = (window.VedantamAPIConfig?.baseUrl || 'http://localhost:5000/api/v1').replace(/\/$/, '');

const S = {
  token:   localStorage.getItem('v_tch_tok') || sessionStorage.getItem('v_tch_tok') || '',
  teacher: null,
  page:    'dashboard'
};

/* ── HELPERS ──────────────────────────────────────────────────────── */
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }) : '—';

/* ── API ──────────────────────────────────────────────────────────── */
async function api(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const headers = {
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(S.token ? { Authorization: `Bearer ${S.token}` } : {}),
    ...(opts.headers || {})
  };
  const res  = await fetch(API + path, { ...opts, headers, credentials: 'include' });
  const json = await res.json().catch(() => ({ success: false, message: 'Unexpected server response' }));
  if (!res.ok || json.success === false) {
    const err = new Error(json.message || `Request failed (${res.status})`);
    err.status = res.status; throw err;
  }
  return json;
}

/* ── TOAST ────────────────────────────────────────────────────────── */
let _toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  clearTimeout(_toastTimer);
  el.className = `show ${type}`;
  el.innerHTML = `<span class="material-icons-round" style="font-size:16px">${type === 'success' ? 'check_circle' : 'error'}</span>${esc(msg)}`;
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

/* ── TOKEN ────────────────────────────────────────────────────────── */
function saveToken(token) {
  S.token = token;
  localStorage.setItem('v_tch_tok', token);
}
function clearToken() {
  S.token = '';
  S.teacher = null;
  localStorage.removeItem('v_tch_tok');
  sessionStorage.removeItem('v_tch_tok');
}

/* ── NAV ──────────────────────────────────────────────────────────── */
function navigate(page) {
  S.page = page;
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  const area = document.getElementById('contentArea');
  area.innerHTML = '<div style="text-align:center;padding:40px"><span class="spin" style="width:28px;height:28px;border-width:3px;border-color:var(--bd);border-top-color:var(--primary)"></span></div>';
  const pages = { dashboard, checkin: checkInPage, students: studentsPage, homework: homeworkPage, profile: profilePage };
  Promise.resolve((pages[page] || dashboard)()).catch(err => {
    area.innerHTML = `<div class="card"><div class="card-body"><p style="color:var(--red)">${esc(err.message)}</p></div></div>`;
  });
}
window.navigate = navigate;

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════════════ */
async function dashboard() {
  const { data: d } = await api('/teacher-portal/dashboard');
  const area = document.getElementById('contentArea');

  const checkinStatus = d.myTodayAttendance;
  const isCheckedIn   = !!checkinStatus?.checkInAt;
  const isCheckedOut  = !!checkinStatus?.checkOutAt;

  area.innerHTML = `
    <!-- Welcome banner -->
    <div class="card" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;margin-bottom:16px">
      <div class="card-body" style="display:flex;align-items:center;gap:12px">
        <div style="width:50px;height:50px;border-radius:50%;overflow:hidden;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;flex-shrink:0">
          ${d.teacher.photoUrl ? `<img src="${esc(d.teacher.photoUrl)}" style="width:100%;height:100%;object-fit:cover" alt="">` : esc((d.teacher.name||'T').split(' ').map(w=>w[0]).join('').slice(0,2))}
        </div>
        <div>
          <div style="font-weight:700;font-size:16px">${esc(d.teacher.name)}</div>
          <div style="font-size:12px;opacity:.85">${esc(d.teacher.designation || d.teacher.assignedProgram || 'Teacher')}</div>
          ${d.teacher.assignedProgram ? `<div style="font-size:11px;opacity:.75;margin-top:2px">Class: ${esc(d.teacher.assignedProgram)}${d.teacher.assignedSection?' – Sec '+esc(d.teacher.assignedSection):''}</div>` : ''}
        </div>
        ${d.activeSession ? `<div style="margin-left:auto;text-align:right;font-size:11px;opacity:.8">${esc(d.activeSession.name)}</div>` : ''}
      </div>
    </div>

    <!-- Check-in status strip -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div>
          <div style="font-size:12px;color:var(--txt-sm)">Today's Status</div>
          <div style="font-weight:700;margin-top:2px">
            ${isCheckedOut ? `<span class="badge badge-approved">Checked Out — ${fmtTime(checkinStatus.checkOutAt)}</span>` :
              isCheckedIn  ? `<span class="badge badge-present">Checked In — ${fmtTime(checkinStatus.checkInAt)}</span>` :
                             `<span class="badge badge-absent">Not Checked In</span>`}
          </div>
          ${checkinStatus?.workingHours ? `<div style="font-size:11px;color:var(--txt-sm);margin-top:4px">Working hours: ${checkinStatus.workingHours}h</div>` : ''}
        </div>
        ${!isCheckedIn ? `<button class="btn btn-success" onclick="navigate('checkin')"><span class="material-icons-round" style="font-size:16px">fingerprint</span>Check In</button>` :
          !isCheckedOut ? `<button class="btn btn-amber" onclick="navigate('checkin')"><span class="material-icons-round" style="font-size:16px">logout</span>Check Out</button>` :
                          `<span class="material-icons-round" style="color:var(--green);font-size:28px">verified</span>`}
      </div>
    </div>

    <!-- Stats -->
    <div class="stat-row">
      <div class="stat-item">
        <div class="stat-icon"><span class="material-icons-round" style="color:var(--primary)">child_care</span></div>
        <div class="stat-val">${d.totalStudents}</div>
        <div class="stat-lbl">My Students</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon"><span class="material-icons-round" style="color:var(--green)">how_to_reg</span></div>
        <div class="stat-val">${d.todayAttendance.Present || 0}</div>
        <div class="stat-lbl">Present Today</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon"><span class="material-icons-round" style="color:var(--red)">cancel</span></div>
        <div class="stat-val">${d.todayAttendance.Absent || 0}</div>
        <div class="stat-lbl">Absent Today</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon"><span class="material-icons-round" style="color:var(--amber)">pending_actions</span></div>
        <div class="stat-val">${d.pendingLeaves}</div>
        <div class="stat-lbl">Pending Leaves</div>
      </div>
    </div>

    <!-- Today's students quick view -->
    <div class="card">
      <div class="card-head">
        <span class="card-title">My Students</span>
        <button class="btn btn-secondary" style="font-size:12px;padding:6px 12px" onclick="navigate('students')">View All</button>
      </div>
      <div>
        ${(d.recentStudents || []).length ? d.recentStudents.map(s => `
          <div class="list-item">
            <div class="list-avatar">${s.photoUrl ? `<img src="${esc(s.photoUrl)}" alt="">` : '🧒'}</div>
            <div class="list-main">
              <div class="list-name">${esc(s.studentName)}</div>
              <div class="list-sub">${esc(s.program)}${s.rollNumber?' · Roll '+esc(s.rollNumber):''}</div>
            </div>
          </div>`).join('') :
          `<div class="empty"><span class="material-icons-round">child_care</span><p>No students assigned</p></div>`}
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════════
   CHECK-IN / CHECK-OUT
   ══════════════════════════════════════════════════════════════════ */
let _cameraStream = null;
let _clockInterval = null;

async function checkInPage() {
  const { data: statusData } = await api('/teacher-checkin/status').catch(() => ({ data: null }));
  const isCheckedIn  = !!statusData?.checkInAt;
  const isCheckedOut = !!statusData?.checkOutAt;

  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div class="card">
      <div class="checkin-card">
        <div class="checkin-time" id="clockDisplay">--:--:--</div>
        <div class="checkin-date" id="dateDisplay">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div>

        <!-- Camera preview -->
        <div class="camera-wrap" id="cameraWrap" style="display:none">
          <video id="cameraFeed" autoplay muted playsinline></video>
          <div class="camera-overlay"></div>
        </div>

        <!-- Current status -->
        <div id="statusBanner" style="margin-bottom:16px">
          ${isCheckedOut
            ? `<div class="badge badge-approved" style="font-size:13px;padding:6px 16px">✓ Checked out at ${fmtTime(statusData.checkOutAt)} · ${statusData.workingHours}h worked</div>`
            : isCheckedIn
              ? `<div class="badge badge-present" style="font-size:13px;padding:6px 16px">✓ Checked in at ${fmtTime(statusData.checkInAt)}${statusData.lateEntry?' · Late':''}</div>`
              : `<div class="badge badge-notcheckedin" style="font-size:13px;padding:6px 16px">Not checked in today</div>`}
        </div>

        <div class="checkin-status" id="checkInMsg">
          ${!isCheckedIn && !isCheckedOut ? 'Click "Open Camera" to verify your identity, then Check In.' : ''}
          ${isCheckedIn && !isCheckedOut ? 'Click "Open Camera" to verify, then Check Out.' : ''}
        </div>

        <div class="checkin-actions">
          ${!isCheckedOut ? `
            <button class="btn btn-secondary" id="cameraBtn" onclick="toggleCamera()">
              <span class="material-icons-round" style="font-size:16px">camera_alt</span>Open Camera
            </button>
            ${!isCheckedIn
              ? `<button class="btn btn-success" id="checkInBtn" onclick="doCheckIn()">
                  <span class="material-icons-round" style="font-size:16px">login</span>Check In
                </button>`
              : `<button class="btn btn-amber" id="checkOutBtn" onclick="doCheckOut()">
                  <span class="material-icons-round" style="font-size:16px">logout</span>Check Out
                </button>`}
          ` : ''}
        </div>

        <p style="font-size:11px;color:var(--txt-sm);margin-top:16px;line-height:1.5">
          📷 Camera is used for identity verification only.<br>
          No image is captured, stored, or uploaded.
        </p>
      </div>
    </div>

    <!-- Recent history -->
    <div class="card">
      <div class="card-head"><span class="card-title">Recent Attendance</span></div>
      <div id="historyList">
        <div style="padding:16px;text-align:center"><span class="spin" style="width:20px;height:20px;border-width:2px;border-color:var(--bd);border-top-color:var(--primary)"></span></div>
      </div>
    </div>`;

  // Live clock
  clearInterval(_clockInterval);
  _clockInterval = setInterval(() => {
    const el = document.getElementById('clockDisplay');
    if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true });
    else clearInterval(_clockInterval);
  }, 1000);
  document.getElementById('clockDisplay').textContent = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true });

  // Load history
  api('/teacher-checkin/history?limit=7').then(({ data }) => {
    const listEl = document.getElementById('historyList');
    if (!listEl) return;
    if (!data.length) { listEl.innerHTML = `<div class="empty"><span class="material-icons-round">history</span><p>No attendance records yet</p></div>`; return; }
    listEl.innerHTML = data.map(r => `
      <div class="list-item">
        <span class="material-icons-round" style="color:${r.status==='Present'?'var(--green)':r.status==='Late'?'var(--amber)':'var(--red)'}">
          ${r.status==='Present'?'check_circle':r.status==='Late'?'watch_later':'cancel'}
        </span>
        <div class="list-main">
          <div class="list-name">${fmtDate(r.date)}</div>
          <div class="list-sub">
            ${r.checkIn?'In: '+esc(r.checkIn):''}
            ${r.checkOut?' · Out: '+esc(r.checkOut):''}
            ${r.workingHours?' · '+r.workingHours+'h':''}
          </div>
        </div>
        <span class="badge badge-${(r.status||'absent').toLowerCase()}">${esc(r.status)}</span>
      </div>`).join('');
  }).catch(() => {});
}

async function toggleCamera() {
  const wrap  = document.getElementById('cameraWrap');
  const video = document.getElementById('cameraFeed');
  const btn   = document.getElementById('cameraBtn');
  if (_cameraStream) {
    _cameraStream.getTracks().forEach(t => t.stop());
    _cameraStream = null;
    wrap.style.display = 'none';
    if (btn) btn.innerHTML = `<span class="material-icons-round" style="font-size:16px">camera_alt</span>Open Camera`;
    return;
  }
  try {
    _cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = _cameraStream;
    wrap.style.display = '';
    if (btn) btn.innerHTML = `<span class="material-icons-round" style="font-size:16px">camera_off</span>Close Camera`;
  } catch {
    toast('Camera access denied. You can still check in without camera.', 'error');
  }
}
window.toggleCamera = toggleCamera;

function stopCamera() {
  if (_cameraStream) { _cameraStream.getTracks().forEach(t => t.stop()); _cameraStream = null; }
  const wrap = document.getElementById('cameraWrap');
  if (wrap) wrap.style.display = 'none';
}

async function doCheckIn() {
  const btn = document.getElementById('checkInBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span>'; }
  try {
    let gpsLat, gpsLng;
    if (navigator.geolocation) {
      await new Promise(resolve => navigator.geolocation.getCurrentPosition(
        p => { gpsLat = p.coords.latitude; gpsLng = p.coords.longitude; resolve(); },
        () => resolve(), { timeout: 3000 }
      ));
    }
    const { message } = await api('/teacher-checkin/checkin', { method: 'POST', body: JSON.stringify({ gpsLat, gpsLng }) });
    stopCamera();
    toast(message, 'success');
    setTimeout(() => navigate('checkin'), 600);
  } catch (err) {
    toast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px">login</span>Check In'; }
  }
}
window.doCheckIn = doCheckIn;

async function doCheckOut() {
  const btn = document.getElementById('checkOutBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span>'; }
  try {
    let gpsLat, gpsLng;
    if (navigator.geolocation) {
      await new Promise(resolve => navigator.geolocation.getCurrentPosition(
        p => { gpsLat = p.coords.latitude; gpsLng = p.coords.longitude; resolve(); },
        () => resolve(), { timeout: 3000 }
      ));
    }
    const { message } = await api('/teacher-checkin/checkout', { method: 'POST', body: JSON.stringify({ gpsLat, gpsLng }) });
    stopCamera();
    toast(message, 'success');
    setTimeout(() => navigate('checkin'), 600);
  } catch (err) {
    toast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons-round" style="font-size:16px">logout</span>Check Out'; }
  }
}
window.doCheckOut = doCheckOut;

/* ══════════════════════════════════════════════════════════════════
   STUDENTS
   ══════════════════════════════════════════════════════════════════ */
async function studentsPage() {
  const { data: students } = await api('/teacher-portal/my-students');
  const area = document.getElementById('contentArea');

  if (!students.length) {
    area.innerHTML = `<div class="empty"><span class="material-icons-round">child_care</span><p>No students assigned to your class</p></div>`;
    return;
  }

  area.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <h2 style="font-size:16px;font-weight:700">My Students (${students.length})</h2>
    </div>
    <div class="card">
      ${students.map(s => `
        <div class="list-item">
          <div class="list-avatar">${s.photoUrl ? `<img src="${esc(s.photoUrl)}" alt="">` : '🧒'}</div>
          <div class="list-main">
            <div class="list-name">${esc(s.studentName)}</div>
            <div class="list-sub">
              ${esc(s.program)}
              ${s.rollNumber ? ' · Roll ' + esc(s.rollNumber) : ''}
              ${s.bloodGroup  ? ' · ' + esc(s.bloodGroup) : ''}
            </div>
          </div>
          <div style="text-align:right;font-size:11px;color:var(--txt-sm)">
            ${s.phone ? `<div>${esc(s.phone)}</div>` : ''}
            ${s.emergencyContact?.phone ? `<div style="color:var(--red)">🆘 ${esc(s.emergencyContact.phone)}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
}

/* ══════════════════════════════════════════════════════════════════
   HOMEWORK
   ══════════════════════════════════════════════════════════════════ */
let _homeworkItems = [];

async function homeworkPage() {
  const { data } = await api('/teacher-portal/homework');
  _homeworkItems = data;
  renderHomeworkPage();
}

function renderHomeworkPage() {
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <h2 style="font-size:16px;font-weight:700">Homework</h2>
      <button class="btn btn-success" onclick="showHomeworkForm()">
        <span class="material-icons-round" style="font-size:16px">add</span>Add
      </button>
    </div>

    <div id="hwFormWrap" style="display:none" class="card">
      <div class="card-head"><span class="card-title" id="hwFormTitle">New Homework</span></div>
      <div class="card-body">
        <form id="hwForm">
          <input type="hidden" name="_id" id="hwId">
          <div class="form-row">
            <label>Subject *</label>
            <input type="text" name="subject" id="hwSubject" required placeholder="e.g. Drawing, Rhymes, Writing">
          </div>
          <div class="form-row">
            <label>Title *</label>
            <input type="text" name="title" id="hwTitle" required placeholder="Homework title">
          </div>
          <div class="form-row">
            <label>Instructions</label>
            <textarea name="description" id="hwDesc" placeholder="Details, page numbers, etc."></textarea>
          </div>
          <div class="form-row">
            <label>Due Date *</label>
            <input type="date" name="dueDate" id="hwDue" required>
          </div>
          <div style="display:flex;gap:8px">
            <button type="submit" class="btn btn-success"><span class="material-icons-round" style="font-size:15px">save</span>Save</button>
            <button type="button" class="btn btn-secondary" onclick="cancelHomeworkForm()">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <div class="card" id="hwList">
      ${!_homeworkItems.length
        ? `<div class="empty"><span class="material-icons-round">assignment</span><p>No homework assigned yet</p></div>`
        : _homeworkItems.map(h => `
          <div class="list-item" data-hw-id="${h._id}">
            <span class="material-icons-round" style="color:var(--primary);font-size:28px">menu_book</span>
            <div class="list-main">
              <div class="list-name">${esc(h.title)}</div>
              <div class="list-sub">${esc(h.subject)} · Due: ${fmtDate(h.dueDate)}</div>
              ${h.description ? `<div class="list-sub" style="margin-top:2px">${esc(h.description.slice(0,80))}${h.description.length>80?'…':''}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <button class="btn btn-secondary" style="font-size:11px;padding:4px 8px" onclick="editHomework('${h._id}')">Edit</button>
              <button class="btn btn-danger"    style="font-size:11px;padding:4px 8px" onclick="deleteHomework('${h._id}')">Del</button>
            </div>
          </div>`).join('')}
    </div>`;

  document.getElementById('hwForm').addEventListener('submit', saveHomework);
}

function showHomeworkForm(hw = null) {
  document.getElementById('hwFormWrap').style.display = '';
  document.getElementById('hwFormTitle').textContent = hw ? 'Edit Homework' : 'New Homework';
  document.getElementById('hwId').value      = hw?._id  || '';
  document.getElementById('hwSubject').value = hw?.subject || '';
  document.getElementById('hwTitle').value   = hw?.title   || '';
  document.getElementById('hwDesc').value    = hw?.description || '';
  document.getElementById('hwDue').value     = hw?.dueDate ? hw.dueDate.slice(0, 10) : '';
  document.getElementById('hwFormWrap').scrollIntoView({ behavior: 'smooth' });
}
window.showHomeworkForm = showHomeworkForm;

function cancelHomeworkForm() { document.getElementById('hwFormWrap').style.display = 'none'; }
window.cancelHomeworkForm = cancelHomeworkForm;

function editHomework(id) {
  const hw = _homeworkItems.find(h => h._id === id);
  if (hw) showHomeworkForm(hw);
}
window.editHomework = editHomework;

async function deleteHomework(id) {
  if (!confirm('Delete this homework?')) return;
  try {
    await api(`/teacher-portal/homework/${id}`, { method: 'DELETE' });
    toast('Homework deleted', 'success');
    homeworkPage();
  } catch (err) { toast(err.message, 'error'); }
}
window.deleteHomework = deleteHomework;

async function saveHomework(e) {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const id   = fd.get('_id');
  const body = {
    subject:     fd.get('subject'),
    title:       fd.get('title'),
    description: fd.get('description'),
    dueDate:     fd.get('dueDate'),
    program:     S.teacher?.assignedProgram || 'Nursery'
  };
  try {
    if (id) await api(`/teacher-portal/homework/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    else    await api('/teacher-portal/homework', { method: 'POST', body: JSON.stringify(body) });
    toast('Homework saved', 'success');
    homeworkPage();
  } catch (err) { toast(err.message, 'error'); }
}

/* ══════════════════════════════════════════════════════════════════
   PROFILE
   ══════════════════════════════════════════════════════════════════ */
async function profilePage() {
  const { data: t } = await api('/teacher-auth/me');
  const area = document.getElementById('contentArea');
  const initials = (t.name || 'T').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  area.innerHTML = `
    <div class="card">
      <div class="profile-header">
        <div class="profile-avatar">${t.photoUrl ? `<img src="${esc(t.photoUrl)}" alt="">` : initials}</div>
        <div class="profile-name">${esc(t.name)}</div>
        <div class="profile-role">${esc(t.designation || t.qualification)}</div>
        ${t.employeeId ? `<div style="font-size:11px;color:var(--txt-sm);margin-top:2px">EMP: ${esc(t.employeeId)}</div>` : ''}
      </div>
      <div class="card-body" style="border-top:1px solid var(--bd)">
        ${[[`mail`,`Email`,t.email],[`phone`,`Phone`,t.phone],[`water_drop`,`Blood Group`,t.bloodGroup],[`school`,`Qualification`,t.qualification],[`badge`,`Employee ID`,t.employeeId]].filter(r=>r[2]).map(([icon,label,val])=>`
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bg)">
            <span class="material-icons-round" style="color:var(--txt-sm);font-size:18px">${icon}</span>
            <span style="color:var(--txt-sm);font-size:12px;min-width:100px">${label}</span>
            <span style="font-weight:500">${esc(val)}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- Change Password -->
    <div class="card">
      <div class="card-head"><span class="card-title">Change Password</span></div>
      <div class="card-body">
        <form id="chgPwdForm">
          <div class="form-row"><label>Current Password</label><input type="password" name="currentPassword" required></div>
          <div class="form-row"><label>New Password</label><input type="password" name="newPassword" required minlength="6"></div>
          <div class="form-row"><label>Confirm New Password</label><input type="password" name="confirmPassword" required></div>
          <button type="submit" class="btn btn-success">Update Password</button>
        </form>
      </div>
    </div>

    <!-- Leave Requests -->
    <div class="card">
      <div class="card-head">
        <span class="card-title">Leave Requests</span>
        <button class="btn btn-secondary" style="font-size:12px;padding:6px 12px" onclick="showLeaveForm()">Apply Leave</button>
      </div>
      <div id="leaveFormWrap" style="display:none" class="card-body" style="border-top:1px solid var(--bd)">
        <form id="leaveForm">
          <div class="form-row">
            <label>Date *</label><input type="date" name="date" required>
          </div>
          <div class="form-row">
            <label>End Date (for multi-day)</label><input type="date" name="endDate">
          </div>
          <div class="form-row">
            <label>Type</label>
            <select name="type">
              <option>Sick</option><option>Casual</option><option>Personal</option><option>Emergency</option><option>Other</option>
            </select>
          </div>
          <div class="form-row"><label>Reason</label><textarea name="reason" placeholder="Brief reason"></textarea></div>
          <div style="display:flex;gap:8px">
            <button type="submit" class="btn btn-success">Submit</button>
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('leaveFormWrap').style.display='none'">Cancel</button>
          </div>
        </form>
      </div>
      <div id="leaveList">
        <div style="padding:16px;text-align:center"><span class="spin" style="width:20px;height:20px;border-width:2px;border-color:var(--bd);border-top-color:var(--primary)"></span></div>
      </div>
    </div>`;

  // Change password form
  document.getElementById('chgPwdForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get('newPassword') !== fd.get('confirmPassword')) { toast('Passwords do not match', 'error'); return; }
    try {
      await api('/teacher-auth/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword: fd.get('currentPassword'), newPassword: fd.get('newPassword') }) });
      toast('Password changed successfully', 'success');
      e.target.reset();
    } catch (err) { toast(err.message, 'error'); }
  });

  // Leave form
  document.getElementById('leaveForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/teacher-portal/leave-requests', { method: 'POST', body: JSON.stringify({ date: fd.get('date'), endDate: fd.get('endDate') || undefined, type: fd.get('type'), reason: fd.get('reason') }) });
      toast('Leave request submitted', 'success');
      document.getElementById('leaveFormWrap').style.display = 'none';
      loadLeaveRequests();
    } catch (err) { toast(err.message, 'error'); }
  });

  loadLeaveRequests();
}

function showLeaveForm() { document.getElementById('leaveFormWrap').style.display = ''; }
window.showLeaveForm = showLeaveForm;

async function loadLeaveRequests() {
  const { data } = await api('/teacher-portal/leave-requests').catch(() => ({ data: [] }));
  const el = document.getElementById('leaveList');
  if (!el) return;
  if (!data.length) { el.innerHTML = `<div class="empty"><span class="material-icons-round">event_busy</span><p>No leave requests yet</p></div>`; return; }
  el.innerHTML = data.map(r => `
    <div class="list-item">
      <span class="material-icons-round" style="color:var(--txt-sm)">event_busy</span>
      <div class="list-main">
        <div class="list-name">${fmtDate(r.date)}${r.endDate && r.endDate !== r.date ? ' – '+fmtDate(r.endDate) : ''}</div>
        <div class="list-sub">${esc(r.type)}${r.reason?' · '+esc(r.reason):''}</div>
      </div>
      <span class="badge badge-${(r.status||'pending').toLowerCase()}">${esc(r.status)}</span>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════════════════ */
function bootTeacher() {
  document.getElementById('loginPage').style.display    = 'none';
  document.getElementById('forceChangePage').style.display = 'none';
  document.getElementById('teacherShell').style.display = '';

  // Avatar
  const av = document.getElementById('topAvatar');
  const t  = S.teacher;
  if (av && t) {
    const initials = (t.name||'T').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    av.innerHTML = t.photoUrl ? `<img src="${esc(t.photoUrl)}" alt="">` : initials;
  }

  // Bottom nav
  document.getElementById('bottomNav').addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (btn) navigate(btn.dataset.page);
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try { await api('/teacher-auth/logout', { method: 'POST' }); } catch (_) {}
    clearToken(); stopCamera();
    document.getElementById('teacherShell').style.display = 'none';
    document.getElementById('loginPage').style.display = '';
    toast('Signed out', 'success');
  });

  navigate('dashboard');
}

function initLogin() {
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('loginError');
    const btn   = document.getElementById('loginBtn');
    const spin  = document.getElementById('loginSpin');
    const txt   = document.getElementById('loginBtnText');
    errEl.style.display = 'none';
    btn.disabled = true; spin.style.display = ''; txt.style.display = 'none';
    try {
      const identifier = new FormData(e.target).get('identifier').trim();
      const password   = new FormData(e.target).get('password');
      const isEmail = identifier.includes('@');
      const { data } = await api('/teacher-auth/login', {
        method: 'POST',
        body: JSON.stringify(isEmail ? { email: identifier, password } : { phone: identifier, password })
      });
      saveToken(data.token);
      S.teacher = data.teacher;
      if (data.mustChangePassword) {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('forceChangePage').style.display = 'flex';
        initForceChange();
      } else {
        bootTeacher();
      }
    } catch (err) {
      errEl.innerHTML = err.message;
      errEl.style.display = 'flex';
    } finally {
      btn.disabled = false; spin.style.display = 'none'; txt.style.display = '';
    }
  });
}

function initForceChange() {
  document.getElementById('forceChangeForm').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('fcError');
    const fd = new FormData(e.target);
    if (fd.get('newPassword') !== fd.get('confirmPassword')) {
      errEl.innerHTML = 'Passwords do not match'; errEl.style.display = 'flex'; return;
    }
    errEl.style.display = 'none';
    try {
      await api('/teacher-auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: fd.get('currentPassword'), newPassword: fd.get('newPassword') })
      });
      S.teacher.mustChangePassword = false;
      toast('Password set! Welcome.', 'success');
      bootTeacher();
    } catch (err) {
      errEl.innerHTML = err.message; errEl.style.display = 'flex';
    }
  });
}

// ── INIT ──────────────────────────────────────────────────────────
(function init() {
  if (S.token) {
    api('/teacher-auth/me')
      .then(({ data }) => {
        S.teacher = data;
        if (data.mustChangePassword) {
          document.getElementById('loginPage').style.display = 'none';
          document.getElementById('forceChangePage').style.display = 'flex';
          initForceChange();
        } else {
          bootTeacher();
        }
      })
      .catch(() => { clearToken(); initLogin(); });
  } else {
    initLogin();
  }
})();
