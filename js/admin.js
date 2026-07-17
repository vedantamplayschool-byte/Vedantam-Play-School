'use strict';
/* ================================================================
   VEDANTAM PLAY SCHOOL — ADMIN PANEL v2.0
   Full SPA: Auth · Dashboard · ERP Modules · CMS · Settings
   ================================================================ */

// ── 1. CONFIG ────────────────────────────────────────────────────
const API = (window.VedantamAPIConfig?.baseUrl || 'http://localhost:5000/api/v1').replace(/\/$/, '');

// ── 2. STATE ─────────────────────────────────────────────────────
const S = {
  token: localStorage.getItem('v_adm_tok') || sessionStorage.getItem('v_adm_tok') || '',
  admin: null,
  page:  'dashboard'
};
const _cache  = {};
const _search = {};

// ── 3. DOM HELPERS ────────────────────────────────────────────────
const $  = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>'"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);

const fmtDate = d => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtCurrency = n => {
  if (n == null || n === '') return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN');
};

const timeAgo = d => {
  if (!d) return '';
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// ── 4. API LAYER ──────────────────────────────────────────────────
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
    err.status = res.status;
    throw err;
  }
  return json;
}

// ── 5. TOAST ──────────────────────────────────────────────────────
let _toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  clearTimeout(_toastTimer);
  const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
  el.className = `toast toast-${type} show`;
  el.innerHTML = `<span class="material-icons-round">${icons[type] || 'info'}</span>${esc(msg)}`;
  _toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

// ── 6. AUTH HELPERS ───────────────────────────────────────────────
function saveToken(token, remember) {
  S.token = token;
  if (remember) {
    localStorage.setItem('v_adm_tok', token);
    sessionStorage.removeItem('v_adm_tok');
  } else {
    sessionStorage.setItem('v_adm_tok', token);
    localStorage.removeItem('v_adm_tok');
  }
}

function clearToken() {
  S.token = '';
  S.admin = null;
  localStorage.removeItem('v_adm_tok');
  sessionStorage.removeItem('v_adm_tok');
}

function showPage(id) {
  ['loginPage', 'forceChangePage', 'adminShell'].forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = p === id ? '' : 'none';
  });
}

const canAdmin = () => ['super_admin', 'admin', 'principal'].includes(S.admin?.role);
const canEdit  = () => canAdmin() || S.admin?.role === 'office_staff';

// ── 7. SIDEBAR & NAV ──────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: null,
    items: [{ key: 'dashboard', label: 'Dashboard', icon: 'dashboard' }]
  },
  {
    label: 'Students',
    items: [
      { key: 'students',     label: 'All Students',   icon: 'child_care' },
      { key: 'admissions',   label: 'Admissions',      icon: 'assignment' },
      { key: 'enquiries',    label: 'Enquiries',       icon: 'forum' },
      { key: 'qr-cards',     label: 'QR & ID Cards',  icon: 'badge' },
      { key: 'certificates', label: 'Certificates',    icon: 'workspace_premium' }
    ]
  },
  {
    label: 'Finance',
    items: [
      { key: 'fees', label: 'Fee Management', icon: 'payments', admin: true }
    ]
  },
  {
    label: 'Attendance',
    items: [
      { key: 'attendance', label: 'Attendance', icon: 'how_to_reg' }
    ]
  },
  {
    label: 'Content',
    items: [
      { key: 'gallery',  label: 'Gallery',  icon: 'photo_library' },
      { key: 'teachers', label: 'Teachers', icon: 'school' },
      { key: 'events',   label: 'Events',   icon: 'event' },
      { key: 'notices',  label: 'Notices',  icon: 'campaign' }
    ]
  },
  {
    label: 'Reports',
    items: [
      { key: 'reports', label: 'Reports & Export', icon: 'assessment', admin: true }
    ]
  },
  {
    label: 'Teacher Portal',
    items: [
      { key: 'teacher-portal', label: 'Teacher Accounts', icon: 'manage_accounts', admin: true },
      { key: 'leave-requests', label: 'Leave Requests',   icon: 'event_busy',       admin: true },
      { key: 'teacher-checkin',label: 'Check-In Monitor', icon: 'fingerprint',      admin: true }
    ]
  },
  {
    label: 'Notifications',
    items: [
      { key: 'notifications', label: 'Notifications', icon: 'notifications', admin: true }
    ]
  },
  {
    label: 'Parent Portal',
    items: [
      { key: 'parent-portal-admin', label: 'Parent Accounts', icon: 'family_restroom', admin: true }
    ]
  },
  {
    label: 'System',
    items: [
      { key: 'storage-monitor', label: 'Storage Monitor',  icon: 'storage',   admin: true },
      { key: 'archive',         label: 'Archive Manager',  icon: 'archive',   admin: true },
      { key: 'backup',          label: 'Backup & Export',  icon: 'backup',    admin: true },
      { key: 'login-history',   label: 'Login History',    icon: 'history',   admin: true },
      { key: 'audit-logs',      label: 'Audit Logs',       icon: 'fact_check',admin: true }
    ]
  },
  {
    label: 'More',
    items: [
      { key: 'slides',       label: 'Hero Slides',  icon: 'slideshow',   admin: true },
      { key: 'testimonials', label: 'Testimonials', icon: 'rate_review', admin: true },
      { key: 'newsletter',   label: 'Newsletter',   icon: 'email',       admin: true },
      { key: 'contacts',     label: 'Messages',     icon: 'chat',        admin: true }
    ]
  },
  {
    label: 'Account',
    items: [
      { key: 'sessions', label: 'Academic Sessions', icon: 'calendar_today', admin: true },
      { key: 'settings', label: 'Settings',          icon: 'settings',       admin: true },
      { key: 'profile',  label: 'My Profile',        icon: 'account_circle' }
    ]
  }
];

function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  if (!nav) return;

  let html = '';
  NAV_GROUPS.forEach(group => {
    const visible = group.items.filter(i => !i.admin || canAdmin());
    if (!visible.length) return;
    if (group.label) html += `<div class="nav-section">${esc(group.label)}</div>`;
    visible.forEach(item => {
      html += `<button class="nav-btn${S.page === item.key ? ' active' : ''}"
        data-key="${item.key}" title="${esc(item.label)}">
        <span class="material-icons-round">${item.icon}</span>
        <span>${esc(item.label)}</span>
      </button>`;
    });
  });
  nav.innerHTML = html;
  nav.onclick = e => {
    const btn = e.target.closest('[data-key]');
    if (btn) navigate(btn.dataset.key);
  };

  const userEl = document.getElementById('sidebarUser');
  if (userEl && S.admin) {
    const initials = (S.admin.name || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const roleName = (S.admin.role || 'admin').replace(/_/g, ' ');
    userEl.innerHTML = `
      <div class="sidebar-avatar">
        ${S.admin.profilePhoto ? `<img src="${esc(S.admin.profilePhoto)}" alt="">` : initials}
      </div>
      <div style="min-width:0">
        <div class="sidebar-uname">${esc(S.admin.name)}</div>
        <div class="sidebar-role">${esc(roleName)}</div>
      </div>`;
  }

  const av = document.getElementById('topbarAvatar');
  if (av && S.admin) {
    const initials = (S.admin.name || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    av.innerHTML = S.admin.profilePhoto ? `<img src="${esc(S.admin.profilePhoto)}" alt="">` : initials;
    av.onclick    = () => navigate('profile');
    av.onkeydown  = e => e.key === 'Enter' && navigate('profile');
  }
}

// ── 8. NAVIGATION ─────────────────────────────────────────────────
function navigate(key) {
  S.page = key;
  history.replaceState(null, '', `#${key}`);

  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.key === key)
  );

  let title = key.charAt(0).toUpperCase() + key.slice(1);
  for (const g of NAV_GROUPS) for (const it of g.items)
    if (it.key === key) { title = it.label; break; }
  document.getElementById('pageTitle').textContent = title;

  closeMobileSidebar();
  closeSearch();

  const area = document.getElementById('contentArea');
  area.innerHTML = '<div class="loader-center"><span class="spin spin-lg"></span></div>';

  const pages = {
    dashboard,
    settings,
    profile,
    sessions:          sessionsPage,
    fees:              feesPage,
    attendance:        attendancePage,
    reports:           reportsPage,
    parents:           parentsPage,
    'qr-cards':        qrCardsPage,
    certificates:      certificatesPage,
    notifications:     notificationsPage,
    'teacher-portal':      teacherPortalPage,
    'leave-requests':      leaveRequestsPage,
    'teacher-checkin':     teacherCheckInPage,
    'parent-portal-admin': parentPortalAdminPage,
    'storage-monitor':     storageMonitorPage,
    archive:               archivePage,
    backup:                backupPage,
    'login-history':       loginHistoryPage,
    'audit-logs':          auditLogsPage,
    students:          () => resourcePage(RESOURCES.students),
    admissions:        () => resourcePage(RESOURCES.admissions),
    enquiries:         () => resourcePage(RESOURCES.enquiries),
    gallery:           () => resourcePage(RESOURCES.gallery),
    teachers:          () => resourcePage(RESOURCES.teachers),
    events:            () => resourcePage(RESOURCES.events),
    notices:           () => resourcePage(RESOURCES.notices),
    slides:            () => resourcePage(RESOURCES.slides),
    testimonials:      () => resourcePage(RESOURCES.testimonials),
    newsletter:        () => resourcePage(RESOURCES.newsletter),
    contacts:          () => resourcePage(RESOURCES.contacts)
  };

  Promise.resolve((pages[key] || dashboard)()).catch(err => {
    area.innerHTML = `<div class="form-card">
      <div class="alert alert-error">
        <span class="material-icons-round">error</span>
        ${esc(err.message)}
      </div>
    </div>`;
  });
}

window.navigate = navigate;

function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarBackdrop').style.display = '';
  document.body.style.overflow = 'hidden';
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').style.display = 'none';
  document.body.style.overflow = '';
}

// ── 9. GLOBAL SEARCH ─────────────────────────────────────────────
let _searchTimer;

function initGlobalSearch() {
  const inp  = document.getElementById('globalSearch');
  const drop = document.getElementById('searchDrop');
  if (!inp || !drop) return;

  inp.addEventListener('input', () => {
    clearTimeout(_searchTimer);
    const q = inp.value.trim();
    if (q.length < 2) { drop.style.display = 'none'; return; }
    _searchTimer = setTimeout(() => runGlobalSearch(q), 300);
  });

  inp.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-global-wrap')) closeSearch();
  });
}

function closeSearch() {
  const drop = document.getElementById('searchDrop');
  const inp  = document.getElementById('globalSearch');
  if (drop) drop.style.display = 'none';
  if (inp)  inp.value = '';
}

async function runGlobalSearch(q) {
  const drop = document.getElementById('searchDrop');
  if (!drop) return;
  drop.style.display = '';
  drop.innerHTML = `<div style="padding:12px;text-align:center;color:var(--txt-sm)">
    <span class="spin"></span> Searching…
  </div>`;

  try {
    const { data } = await api(`/search?q=${encodeURIComponent(q)}`);
    const sections = [
      { key: 'students',   label: 'Students',   icon: 'child_care',    page: 'students'   },
      { key: 'parents',    label: 'Parents',    icon: 'family_restroom',page: 'parents'    },
      { key: 'teachers',   label: 'Teachers',   icon: 'school',        page: 'teachers'   },
      { key: 'admissions', label: 'Admissions', icon: 'assignment',    page: 'admissions' }
    ];

    let html = '';
    let total = 0;
    sections.forEach(s => {
      const items = data[s.key] || [];
      if (!items.length) return;
      total += items.length;
      html += `<div class="sdrop-group">${esc(s.label)}</div>`;
      items.forEach(it => {
        const name = it.studentName || it.name || it.email || '—';
        const sub  = it.admissionNumber || it.phone || it.employeeId || '';
        html += `<button class="sdrop-item" data-sdpage="${s.page}">
          <span class="material-icons-round sdrop-icon">${s.icon}</span>
          <span>
            <span class="sdrop-name">${esc(name)}</span>
            ${sub ? `<span class="sdrop-sub">${esc(sub)}</span>` : ''}
          </span>
        </button>`;
      });
    });

    drop.innerHTML = total
      ? html
      : `<div class="sdrop-empty">No results for "${esc(q)}"</div>`;

    drop.querySelectorAll('[data-sdpage]').forEach(btn => {
      btn.addEventListener('click', () => { navigate(btn.dataset.sdpage); closeSearch(); });
    });
  } catch (err) {
    drop.innerHTML = `<div class="sdrop-empty">Search failed: ${esc(err.message)}</div>`;
  }
}

// ── 10. DASHBOARD ──────────────────────────────────────────────────
async function dashboard() {
  const { data: d } = await api('/dashboard/stats');

  const cards = [
    { label: 'Total Students',      value: d.students,           icon: 'child_care',       cls: 'stat-blue',   note: `${d.todayAdmissions || 0} enrolled today` },
    { label: 'Total Parents',        value: d.parents,            icon: 'family_restroom',  cls: 'stat-purple', note: 'Registered families' },
    { label: 'Pending Admissions',   value: d.pendingAdmissions,  icon: 'pending_actions',  cls: 'stat-amber',  note: 'Awaiting review' },
    { label: 'Approved Admissions',  value: d.approvedAdmissions, icon: 'check_circle',     cls: 'stat-green',  note: 'All time' },
    { label: 'Monthly Collection',   value: fmtCurrency(d.monthlyCollection), icon: 'account_balance_wallet', cls: 'stat-teal',   note: new Date().toLocaleString('en-IN',{month:'long',year:'numeric'}) },
    { label: "Today's Collection",   value: fmtCurrency(d.todayCollection),   icon: 'payments',               cls: 'stat-green',  note: 'Fee received today' },
    { label: 'Fee Due (Records)',     value: d.feeDue,             icon: 'receipt_long',     cls: 'stat-red',    note: 'Balance pending' },
    { label: 'Active Teachers',       value: d.teachers,           icon: 'school',           cls: 'stat-orange', note: 'Staff members' }
  ];

  const statsHtml = cards.map(c => `
    <div class="stat-card ${c.cls}">
      <div>
        <div class="stat-label">${esc(c.label)}</div>
        <div class="stat-value">${c.value ?? 0}</div>
        <div class="stat-note">${esc(c.note)}</div>
      </div>
      <div class="stat-icon"><span class="material-icons-round">${c.icon}</span></div>
    </div>`).join('');

  // Birthdays today
  const bdays = d.birthdaysToday || [];
  const birthdayHtml = bdays.length
    ? bdays.map(s => `
        <div class="act-item">
          <div class="act-dot dot-birthday">
            <span class="material-icons-round">cake</span>
          </div>
          <div class="act-info">
            <div class="act-label">${esc(s.studentName)}</div>
            <div class="act-sub">${esc(s.program || '')}</div>
          </div>
          <div class="act-time">🎂</div>
        </div>`).join('')
    : `<div class="empty-state" style="padding:16px">
        <span class="material-icons-round empty-icon" style="font-size:28px">cake</span>
        <p class="empty-sub">No birthdays today</p>
       </div>`;

  const dotCls  = { admission:'dot-admission', contact:'dot-contact', student:'dot-student', enquiry:'dot-enquiry', notice:'dot-notice', fee:'dot-fee' };
  const dotIcon = { admission:'assignment', contact:'chat', student:'child_care', enquiry:'forum', notice:'campaign', fee:'payments' };

  const actHtml = (d.activityFeed || []).length
    ? d.activityFeed.map(a => `
        <div class="act-item">
          <div class="act-dot ${dotCls[a.type] || 'dot-admission'}">
            <span class="material-icons-round">${dotIcon[a.type] || 'circle'}</span>
          </div>
          <div class="act-info">
            <div class="act-label">${esc(a.label)}</div>
            ${a.sub ? `<div class="act-sub">${esc(a.sub)}</div>` : ''}
          </div>
          <div class="act-time">${timeAgo(a.time)}</div>
        </div>`).join('')
    : `<div class="empty-state"><span class="material-icons-round empty-icon">inbox</span><p class="empty-title">No recent activity</p></div>`;

  const recentAdmHtml = (d.recentAdmissions || []).length
    ? `<table>
        <thead><tr><th>Student</th><th>Program</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${d.recentAdmissions.map(r => `
          <tr>
            <td><div class="td-main">${esc(r.studentName)}</div>
                <div class="td-sub">${esc(r.parentName)}</div></td>
            <td>${esc(r.program)}</td>
            <td><span class="badge badge-${(r.status || '').toLowerCase()}">${esc(r.status)}</span></td>
            <td>${fmtDate(r.createdAt)}</td>
          </tr>`).join('')}
        </tbody>
       </table>`
    : `<div class="empty-state"><span class="material-icons-round empty-icon">assignment</span><p class="empty-sub">No admissions yet</p></div>`;

  const activeSession = d.activeSession;

  const qaItems = [
    { label: 'Add Student',     icon: 'child_care',          page: 'students',   newForm: true },
    { label: 'Collect Fee',     icon: 'payments',            page: 'fees',       newForm: false },
    { label: 'Mark Attendance', icon: 'how_to_reg',          page: 'attendance', newForm: false },
    { label: 'Create Notice',   icon: 'campaign',            page: 'notices',    newForm: true },
    { label: 'View Reports',    icon: 'assessment',          page: 'reports',    newForm: false }
  ];

  document.getElementById('contentArea').innerHTML = `
    ${activeSession ? `
    <div class="alert alert-info" style="margin-bottom:16px;display:flex;align-items:center;gap:8px">
      <span class="material-icons-round">calendar_today</span>
      <strong>Active Session:</strong>&nbsp;${esc(activeSession.name)}
      &nbsp;·&nbsp;${fmtDate(activeSession.startDate)} – ${fmtDate(activeSession.endDate)}
    </div>` : ''}

    <div class="stats-grid">${statsHtml}</div>

    <div class="quick-actions">
      ${qaItems.map(q => `
        <button class="qa-btn" data-qa="${q.page}" data-qa-new="${q.newForm}">
          <span class="material-icons-round">${q.icon}</span>
          ${esc(q.label)}
        </button>`).join('')}
    </div>

    <div class="row-2">
      <div class="card">
        <div class="card-head">
          <span class="card-title">Recent Admissions</span>
          <button class="btn btn-secondary btn-sm" onclick="navigate('admissions')">View All</button>
        </div>
        <div class="table-wrap">${recentAdmHtml}</div>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Recent Activity</span></div>
        <div class="card-body"><div class="activity-list">${actHtml}</div></div>
      </div>
    </div>

    <div class="row-2">
      <div class="card">
        <div class="card-head"><span class="card-title">Today's Birthdays 🎂</span></div>
        <div class="card-body"><div class="activity-list">${birthdayHtml}</div></div>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Quick Stats</span></div>
        <div class="card-body">
          <div style="display:grid;gap:12px">
            ${[
              ['Waiting List',      d.waitingAdmissions || 0, 'hourglass_top',           'var(--amber)'],
              ['Upcoming Events',   d.upcomingEvents    || 0, 'event',                    'var(--blue)'],
              ['Unread Messages',   d.unreadMessages    || 0, 'mark_unread_chat_alt',     'var(--err)'],
              ['Total Enquiries',   d.enquiries         || 0, 'forum',                    'var(--purple)'],
              ['Gallery Photos',    d.gallery           || 0, 'photo_library',            'var(--teal)'],
              ['Newsletter Subs',   d.subscribers       || 0, 'email',                    'var(--green)']
            ].map(([label, val, icon, color]) => `
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--bd)">
                <span class="material-icons-round" style="color:${color};font-size:20px">${icon}</span>
                <span style="flex:1;font-size:14px;color:var(--txt-sm)">${esc(label)}</span>
                <span style="font-weight:700;font-size:15px">${val}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;

  document.querySelectorAll('[data-qa]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigate(btn.dataset.qa);
      if (btn.dataset.qaNew === 'true') {
        setTimeout(() => document.getElementById('newBtn')?.click(), 300);
      }
    });
  });
}

// ── 11. RESOURCE CONFIGS ───────────────────────────────────────────
const PROGRAMS = ['Play Group', 'Nursery', 'LKG', 'UKG'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const RESOURCES = {
  students: {
    label: 'Students', endpoint: '/students',
    getTitle: r => r.studentName,
    getSubtitle: r => `${r.parentName} · ${r.phone}`,
    badge: r => {
      const st = r.status || (r.isActive !== false ? 'Active' : 'Inactive');
      const cls = st === 'Active' ? 'badge-active' : st === 'Transferred' ? 'badge-approved' : 'badge-inactive';
      return { text: st, cls };
    },
    columns: ['', 'Student', 'Adm. No.', 'Parent / Phone', 'Program', 'Status', 'Admitted', 'Actions'],
    renderCells: r => `
      <td>${r.photoUrl ? `<img class="thumb" src="${esc(r.photoUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td>
        <div class="td-main">${esc(r.studentName)}</div>
        ${r.gender ? `<div class="td-sub">${esc(r.gender)}</div>` : ''}
      </td>
      <td style="font-family:monospace;font-size:12px">${esc(r.admissionNumber || '—')}</td>
      <td>
        <div>${esc(r.parentName)}</div>
        <div class="td-sub">${esc(r.phone)}</div>
      </td>
      <td>${esc(r.program)}</td>`,
    hasImage: false,
    studentActions: true,
    fields: [
      /* ── Child Details ── */
      { name: '_s1',              label: 'Child Details',                type: 'separator', icon: 'child_care',     wide: true },
      { name: 'photo',            label: 'Student Photo',                type: 'file',    wide: true },
      { name: 'studentName',      label: 'Name of the Child',            type: 'text',    required: true },
      { name: 'program',          label: 'Class Applied For',            type: 'select',  required: true, options: PROGRAMS },
      { name: 'gender',           label: 'Gender',                       type: 'select',  options: ['Male', 'Female', 'Other'] },
      { name: 'dateOfBirth',      label: 'Date of Birth',                type: 'date' },
      { name: 'nationality',      label: 'Nationality',                  type: 'text' },
      { name: 'religion',         label: 'Religion',                     type: 'text' },
      { name: 'category',         label: 'Caste / Category',             type: 'select',  options: ['General', 'OBC', 'SC', 'ST', 'Minority', 'Other'] },
      { name: 'admissionDate',    label: 'Admission Date',               type: 'date' },
      /* ── Address ── */
      { name: '_s2',              label: 'Address',                      type: 'separator', icon: 'place',          wide: true },
      { name: 'address',          label: 'Full Address',                 type: 'textarea', wide: true },
      /* ── Father's Information ── */
      { name: '_s3',              label: "Father's Information",         type: 'separator', icon: 'man',            wide: true },
      { name: 'fatherName',       label: "Father's Name",                type: 'text' },
      { name: 'fatherPhone',      label: "Father's Mobile Number",       type: 'tel' },
      { name: 'fatherOccupation', label: "Father's Occupation",          type: 'text' },
      /* ── Mother's Information ── */
      { name: '_s4',              label: "Mother's Information",         type: 'separator', icon: 'woman',          wide: true },
      { name: 'motherName',       label: "Mother's Name",                type: 'text' },
      { name: 'motherPhone',      label: "Mother's Mobile Number",       type: 'tel' },
      { name: 'motherOccupation', label: "Mother's Occupation",          type: 'text' },
      /* ── Documents ── */
      { name: '_s5',              label: 'Documents  (PDF or Image)',    type: 'separator', icon: 'folder_special', wide: true },
      { name: 'doc_aadhar',        label: 'Child Aadhar Card',           type: 'docfile', docType: 'student_aadhar', wide: true },
      { name: 'doc_birth',         label: 'Birth Certificate',           type: 'docfile', docType: 'birth_cert',    wide: true },
      { name: 'doc_father_aadhar', label: "Father's Aadhar Card",        type: 'docfile', docType: 'father_aadhar', wide: true },
      { name: 'doc_mother_aadhar', label: "Mother's Aadhar Card",        type: 'docfile', docType: 'mother_aadhar', wide: true },
      { name: 'doc_samagra',       label: 'Samagra ID',                  type: 'docfile', docType: 'samagra_id',    wide: true }
    ]
  },

  admissions: {
    label: 'Admissions', endpoint: '/admissions',
    getTitle: r => r.studentName,
    getSubtitle: r => `${r.parentName} · ${r.phone}`,
    badge: r => ({ text: r.status, cls: `badge-${(r.status || '').toLowerCase()}` }),
    columns: ['Student', 'Parent / Phone', 'Program', 'Age', 'Status', 'Date', 'Actions'],
    renderCells: r => `
      <td>
        <div class="td-main">${esc(r.studentName)}</div>
        <div class="td-sub">${esc(r.email || '')}</div>
      </td>
      <td>
        <div>${esc(r.parentName)}</div>
        <div class="td-sub">${esc(r.phone)}</div>
      </td>
      <td>${esc(r.program)}</td>
      <td>${esc(r.age || '—')}</td>`,
    noCreate: true,
    admissionActions: true,
    fields: [
      /* ── Student Details ── */
      { name: '_a1',            label: 'Student Details',              type: 'separator', icon: 'child_care',  wide: true },
      { name: 'studentName',    label: 'Name of the Child',            type: 'text',    required: true },
      { name: 'program',        label: 'Class Applied For',            type: 'select',  required: true, options: PROGRAMS },
      { name: 'gender',         label: 'Gender',                       type: 'select',  options: ['Male', 'Female', 'Other'] },
      { name: 'dateOfBirth',    label: 'Date of Birth',                type: 'date' },
      { name: 'age',            label: 'Age',                          type: 'text' },
      { name: 'nationality',    label: 'Nationality',                  type: 'text' },
      { name: 'religion',       label: 'Religion',                     type: 'text' },
      { name: 'caste',          label: 'Caste / Category',             type: 'text' },
      { name: 'admissionDate',  label: 'Admission Date',               type: 'date' },
      /* ── Address ── */
      { name: '_a2',            label: 'Address',                      type: 'separator', icon: 'place',       wide: true },
      { name: 'address',        label: 'Full Address',                 type: 'textarea', wide: true },
      /* ── Father's Information ── */
      { name: '_a3',            label: "Father's Information",         type: 'separator', icon: 'man',         wide: true },
      { name: 'fatherName',     label: "Father's Name",               type: 'text' },
      { name: 'fatherPhone',    label: "Father's Mobile Number",      type: 'tel' },
      { name: 'fatherOccupation', label: "Father's Occupation",       type: 'text' },
      /* ── Mother's Information ── */
      { name: '_a4',            label: "Mother's Information",         type: 'separator', icon: 'woman',       wide: true },
      { name: 'motherName',     label: "Mother's Name",               type: 'text' },
      { name: 'motherPhone',    label: "Mother's Mobile Number",      type: 'tel' },
      { name: 'motherOccupation', label: "Mother's Occupation",       type: 'text' },
      /* ── Primary Contact ── */
      { name: '_a5',            label: 'Primary Contact (for records)',type: 'separator', icon: 'contacts',    wide: true },
      { name: 'parentName',     label: 'Parent / Guardian Name',      type: 'text',    required: true },
      { name: 'phone',          label: 'Contact Mobile Number',       type: 'tel',     required: true },
      { name: 'email',          label: 'Email (optional)',            type: 'email' },
      /* ── Notes ── */
      { name: '_a6',            label: 'Additional Notes',             type: 'separator', icon: 'notes',       wide: true },
      { name: 'message',        label: 'Notes / Remarks',             type: 'textarea', wide: true }
    ]
  },

  enquiries: {
    label: 'Enquiries', endpoint: '/enquiries',
    getTitle: r => r.name,
    getSubtitle: r => r.phone,
    badge: r => ({
      text: r.status,
      cls: r.status === 'New' ? 'badge-new' : r.status === 'Contacted' ? 'badge-contacted' : 'badge-closed'
    }),
    columns: ['Name', 'Contact', 'Program', 'Status', 'Date', 'Actions'],
    renderCells: r => `
      <td><div class="td-main">${esc(r.name)}</div></td>
      <td><div>${esc(r.phone)}</div><div class="td-sub">${esc(r.email || '')}</div></td>
      <td>${esc(r.program || 'General')}</td>`,
    statusOptions: ['New', 'Contacted', 'Closed'],
    fields: [
      { name: 'name',    label: 'Name',    type: 'text',    required: true },
      { name: 'phone',   label: 'Phone',   type: 'tel',     required: true },
      { name: 'email',   label: 'Email',   type: 'email' },
      { name: 'program', label: 'Program', type: 'select',  options: [...PROGRAMS, 'General'] },
      { name: 'message', label: 'Message', type: 'textarea', wide: true },
      { name: 'status',  label: 'Status',  type: 'select',  options: ['New', 'Contacted', 'Closed'] }
    ]
  },

  gallery: {
    label: 'Gallery', endpoint: '/gallery',
    getTitle: r => r.title,
    getSubtitle: r => r.category,
    badge: r => ({ text: r.isFeatured ? 'Featured' : 'Active', cls: r.isFeatured ? 'badge-approved' : 'badge-default' }),
    columns: ['Photo', 'Title', 'Category', 'Status', 'Date', 'Actions'],
    hasImage: true,
    renderCells: r => `
      <td>${r.imageUrl ? `<img class="thumb" src="${esc(r.imageUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td><div class="td-main">${esc(r.title)}</div></td>
      <td>${esc(r.category || '')}</td>`,
    fields: [
      { name: 'title',        label: 'Title',         type: 'text',     required: true },
      { name: 'category',     label: 'Category',      type: 'text' },
      { name: 'description',  label: 'Description',   type: 'textarea', wide: true },
      { name: 'image',        label: 'Photo',         type: 'file',     wide: true },
      { name: 'isFeatured',   label: 'Featured',      type: 'boolean' },
      { name: 'displayOrder', label: 'Display Order', type: 'number' }
    ]
  },

  teachers: {
    label: 'Teachers', endpoint: '/teachers',
    getTitle: r => r.name,
    getSubtitle: r => r.qualification,
    badge: r => ({ text: r.isActive !== false ? 'Active' : 'Inactive', cls: r.isActive !== false ? 'badge-active' : 'badge-inactive' }),
    columns: ['Photo', 'Name', 'Designation', 'Qualification', 'Status', 'Actions'],
    hasImage: true,
    renderCells: r => `
      <td>${r.photoUrl || r.imageUrl ? `<img class="thumb" src="${esc(r.photoUrl || r.imageUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td>
        <div class="td-main">${esc(r.name)}</div>
        ${r.employeeId ? `<div class="td-sub" style="font-family:monospace">${esc(r.employeeId)}</div>` : ''}
      </td>
      <td>${esc(r.designation || r.experience || '')}</td>
      <td>${esc(r.qualification || '')}</td>`,
    fields: [
      { name: 'name',          label: 'Full Name',      type: 'text',     required: true },
      { name: 'qualification', label: 'Qualification',  type: 'text',     required: true },
      { name: 'designation',   label: 'Designation',    type: 'text' },
      { name: 'department',    label: 'Department',     type: 'text' },
      { name: 'phone',         label: 'Phone',          type: 'tel' },
      { name: 'email',         label: 'Email',          type: 'email' },
      { name: 'gender',        label: 'Gender',         type: 'select',   options: ['Male', 'Female', 'Other'] },
      { name: 'dateOfBirth',   label: 'Date of Birth',  type: 'date' },
      { name: 'joiningDate',   label: 'Joining Date',   type: 'date' },
      { name: 'salary',        label: 'Salary (₹)',     type: 'number' },
      { name: 'experience',    label: 'Experience',     type: 'text' },
      { name: 'description',   label: 'About',          type: 'textarea', wide: true },
      { name: 'image',         label: 'Photo',          type: 'file',     wide: true },
      { name: 'displayOrder',  label: 'Display Order',  type: 'number' },
      { name: 'isActive',      label: 'Active',         type: 'boolean' }
    ]
  },

  events: {
    label: 'Events', endpoint: '/events',
    getTitle: r => r.title,
    getSubtitle: r => r.location,
    badge: r => ({ text: r.isPublished !== false ? 'Published' : 'Draft', cls: r.isPublished !== false ? 'badge-approved' : 'badge-inactive' }),
    columns: ['Photo', 'Event', 'Category', 'Location', 'Date', 'Status', 'Actions'],
    hasImage: true,
    renderCells: r => `
      <td>${r.imageUrl ? `<img class="thumb" src="${esc(r.imageUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td><div class="td-main">${esc(r.title)}</div></td>
      <td><span class="badge badge-default">${esc(r.category || 'General')}</span></td>
      <td>${esc(r.location || '')}</td>
      <td>${fmtDate(r.eventDate)}</td>`,
    fields: [
      { name: 'title',       label: 'Event Title',  type: 'text',     required: true },
      { name: 'category',    label: 'Category',     type: 'select',   options: ['General','PTM','Exam','Holiday','Sports','Cultural','Other'] },
      { name: 'location',    label: 'Location',     type: 'text' },
      { name: 'eventDate',   label: 'Event Date',   type: 'date' },
      { name: 'description', label: 'Description',  type: 'textarea', wide: true },
      { name: 'image',       label: 'Banner Image', type: 'file',     wide: true },
      { name: 'isFeatured',  label: 'Featured',     type: 'boolean' },
      { name: 'isPublished', label: 'Published',    type: 'boolean' }
    ]
  },

  notices: {
    label: 'Notices', endpoint: '/notices',
    getTitle: r => r.title,
    getSubtitle: r => r.priority || 'Normal',
    badge: r => ({ text: r.isPublished !== false ? 'Published' : 'Draft', cls: r.isPublished !== false ? 'badge-approved' : 'badge-inactive' }),
    columns: ['Title', 'Priority', 'Publish Date', 'Expires', 'Status', 'Actions'],
    renderCells: r => `
      <td>
        <div class="td-main">${esc(r.title)}</div>
        <div class="td-sub" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${esc((r.body || '').slice(0, 80))}
        </div>
      </td>
      <td><span class="badge badge-default">${esc(r.priority || 'Normal')}</span></td>
      <td>${fmtDate(r.publishDate)}</td>
      <td>${fmtDate(r.expiresAt)}</td>`,
    fields: [
      { name: 'title',       label: 'Title',          type: 'text',     required: true, wide: true },
      { name: 'body',        label: 'Notice Content', type: 'textarea', required: true, wide: true },
      { name: 'priority',    label: 'Priority',       type: 'select',   options: ['Low', 'Normal', 'High'] },
      { name: 'publishDate', label: 'Publish Date',   type: 'date' },
      { name: 'expiresAt',   label: 'Expires At',     type: 'date' },
      { name: 'isPublished', label: 'Published',      type: 'boolean' }
    ]
  },

  slides: {
    label: 'Hero Slides', endpoint: '/hero-slides',
    getTitle: r => r.title,
    getSubtitle: r => r.subtitle,
    badge: r => ({ text: r.isActive !== false ? 'Active' : 'Inactive', cls: r.isActive !== false ? 'badge-active' : 'badge-inactive' }),
    columns: ['Photo', 'Title', 'Subtitle', 'Order', 'Status', 'Actions'],
    hasImage: true,
    renderCells: r => `
      <td>${r.imageUrl ? `<img class="thumb" src="${esc(r.imageUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td><div class="td-main">${esc(r.title)}</div></td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.subtitle || '')}</td>
      <td>${esc(r.displayOrder ?? '')}</td>`,
    fields: [
      { name: 'title',        label: 'Title',       type: 'text',     required: true },
      { name: 'subtitle',     label: 'Subtitle',    type: 'textarea', wide: true },
      { name: 'badge',        label: 'Badge Text',  type: 'text' },
      { name: 'ctaText',      label: 'Button Text', type: 'text' },
      { name: 'ctaLink',      label: 'Button Link', type: 'text' },
      { name: 'image',        label: 'Slide Image', type: 'file',     wide: true },
      { name: 'displayOrder', label: 'Order',       type: 'number' },
      { name: 'isActive',     label: 'Active',      type: 'boolean' }
    ]
  },

  testimonials: {
    label: 'Testimonials', endpoint: '/testimonials',
    getTitle: r => r.parentName,
    getSubtitle: r => `Student: ${r.studentName}`,
    badge: r => ({ text: r.isPublished !== false ? 'Published' : 'Draft', cls: r.isPublished !== false ? 'badge-approved' : 'badge-inactive' }),
    columns: ['Photo', 'Parent', 'Student', 'Message', 'Status', 'Actions'],
    hasImage: true,
    renderCells: r => `
      <td>${r.imageUrl ? `<img class="thumb" src="${esc(r.imageUrl)}" alt="">` : '<div class="thumb" style="background:var(--bg)"></div>'}</td>
      <td><div class="td-main">${esc(r.parentName)}</div></td>
      <td>${esc(r.studentName || '')}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">${esc(r.message || '')}</td>`,
    fields: [
      { name: 'parentName',   label: 'Parent Name',  type: 'text',     required: true },
      { name: 'studentName',  label: 'Student Name', type: 'text',     required: true },
      { name: 'message',      label: 'Message',      type: 'textarea', required: true, wide: true },
      { name: 'image',        label: 'Photo',        type: 'file',     wide: true },
      { name: 'rating',       label: 'Rating (1–5)', type: 'number' },
      { name: 'displayOrder', label: 'Order',        type: 'number' },
      { name: 'isPublished',  label: 'Published',    type: 'boolean' }
    ]
  },

  newsletter: {
    label: 'Newsletter Subscribers', endpoint: '/newsletter',
    getTitle: r => r.email,
    badge: r => ({ text: r.isActive !== false ? 'Subscribed' : 'Unsubscribed', cls: r.isActive !== false ? 'badge-active' : 'badge-inactive' }),
    columns: ['Email', 'Status', 'Subscribed On', 'Actions'],
    noCreate: true,
    renderCells: r => `<td><div class="td-main">${esc(r.email)}</div></td>`,
    fields: [
      { name: 'isActive', label: 'Active', type: 'boolean' }
    ]
  },

  contacts: {
    label: 'Contact Messages', endpoint: '/contacts',
    getTitle: r => r.name,
    getSubtitle: r => r.email || r.phone,
    badge: r => ({ text: r.status, cls: r.status === 'New' ? 'badge-new' : 'badge-read' }),
    columns: ['Name', 'Contact', 'Subject', 'Message', 'Status', 'Date', 'Actions'],
    noCreate: true,
    renderCells: r => `
      <td><div class="td-main">${esc(r.name)}</div></td>
      <td><div>${esc(r.email || '')}</div><div class="td-sub">${esc(r.phone || '')}</div></td>
      <td>${esc(r.subject || '')}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">${esc((r.message || '').slice(0, 80))}</td>`,
    fields: [
      { name: 'status', label: 'Status', type: 'select', options: ['New', 'Read', 'Closed'] }
    ]
  }
};

// ── 12. RESOURCE PAGE ──────────────────────────────────────────────
async function resourcePage(config) {
  const key    = Object.keys(RESOURCES).find(k => RESOURCES[k] === config);
  const search = _search[key] || '';
  const params = new URLSearchParams({ limit: 100, sort: '-createdAt' });
  if (search) params.set('search', search);

  const { data } = await api(`${config.endpoint}?${params}`);
  _cache[key] = data;

  const showNew    = !config.noCreate && canEdit();
  const showDelete = canAdmin();
  const showEdit   = canEdit();

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">${esc(config.label)}</div>
        <div class="page-header-sub">${data.length} record${data.length !== 1 ? 's' : ''}</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${showNew ? `<button class="btn btn-primary" id="newBtn">
          <span class="material-icons-round" style="font-size:18px">add</span> Add New
        </button>` : ''}
        <button class="btn btn-secondary" id="exportBtn">
          <span class="material-icons-round" style="font-size:18px">download</span> Export CSV
        </button>
      </div>
    </div>
    <div id="formHost"></div>
    <div class="card">
      <div class="card-head" style="padding:12px 16px">
        <div class="table-toolbar" style="width:100%;margin:0;border:none;gap:8px">
          <div class="search-wrap">
            <span class="material-icons-round">search</span>
            <input class="search-input" id="searchBox"
              placeholder="Search ${esc(config.label.toLowerCase())}…"
              value="${esc(search)}">
          </div>
          <button class="btn btn-secondary btn-sm" id="searchBtn">Search</button>
        </div>
      </div>
      <div class="table-wrap">${buildTable(key, config, data, showEdit, showDelete)}</div>
    </div>`;

  if (showNew) document.getElementById('newBtn').addEventListener('click', () => openForm(key, config, null));
  document.getElementById('exportBtn').addEventListener('click', () => exportCSV(key, data));
  document.getElementById('searchBtn').addEventListener('click', () => {
    _search[key] = document.getElementById('searchBox').value.trim();
    navigate(key);
  });
  document.getElementById('searchBox').addEventListener('keydown', e => {
    if (e.key === 'Enter') { _search[key] = e.target.value.trim(); navigate(key); }
  });
}

function buildTable(key, config, items, showEdit, showDelete) {
  if (!items.length) {
    return `<div class="empty-state">
      <span class="material-icons-round empty-icon">inbox</span>
      <p class="empty-title">No records found</p>
      <p class="empty-sub">Use the Add New button to create the first ${config.label.toLowerCase()} record.</p>
    </div>`;
  }
  const cols = config.columns.map(c => `<th>${esc(c)}</th>`).join('');
  const rows = items.map(item => buildRow(key, config, item, showEdit, showDelete)).join('');
  return `<table><thead><tr>${cols}</tr></thead><tbody>${rows}</tbody></table>`;
}

function buildRow(key, config, item, showEdit, showDelete) {
  const id  = item._id;
  const bdg = config.badge(item);

  let customCells = '';
  if (config.renderCells) customCells = config.renderCells(item);

  const badgeTd = `<td><span class="badge ${bdg.cls}">${esc(bdg.text)}</span></td>`;
  const dateTd  = `<td>${fmtDate(item.createdAt)}</td>`;

  let acts = '<td class="td-actions">';

  // Admission workflow actions
  if (key === 'admissions' && canEdit()) {
    const st = item.status;
    if (st === 'Pending') {
      acts += `<button class="btn btn-secondary btn-sm" data-action="verify" data-id="${id}" title="Verify">
        <span class="material-icons-round" style="font-size:13px">verified</span> Verify
      </button>`;
    }
    if (st === 'Pending' || st === 'Verified') {
      acts += `<button class="btn btn-success btn-sm" data-action="approve" data-id="${id}">Approve</button>`;
      acts += `<button class="btn btn-secondary btn-sm" data-action="waiting" data-id="${id}" title="Waiting List">Wait</button>`;
      acts += `<button class="btn btn-danger btn-sm" data-action="reject" data-id="${id}">Reject</button>`;
    }
    if (st === 'Approved') {
      acts += `<button class="btn btn-primary btn-sm" data-action="convert" data-id="${id}" title="Convert to Student">
        <span class="material-icons-round" style="font-size:13px">person_add</span> Enroll
      </button>`;
    }
  }

  // Student archive/restore
  if (key === 'students' && canAdmin()) {
    if (item.isActive !== false && (item.status === 'Active' || !item.status)) {
      acts += `<button class="btn btn-secondary btn-sm" data-action="archive" data-id="${id}" title="Archive student">
        <span class="material-icons-round" style="font-size:13px">archive</span>
      </button>`;
    } else if (item.isActive === false || item.status === 'Inactive') {
      acts += `<button class="btn btn-success btn-sm" data-action="restore" data-id="${id}" title="Restore student">
        <span class="material-icons-round" style="font-size:13px">unarchive</span>
      </button>`;
    }
  }

  // Enquiry status cycle
  if (key === 'enquiries' && canEdit()) {
    const opts = (config.statusOptions || []).filter(s => s !== item.status);
    if (opts[0]) acts += `<button class="btn btn-secondary btn-sm" data-action="setstatus" data-id="${id}" data-status="${opts[0]}">→ ${esc(opts[0])}</button>`;
  }

  // Contact mark-read
  if (key === 'contacts' && item.status === 'New' && canEdit()) {
    acts += `<button class="btn btn-secondary btn-sm" data-action="setstatus" data-id="${id}" data-status="Read">Mark Read</button>`;
  }

  // Edit / Delete
  if (showEdit && !config.noCreate) {
    acts += `<button class="btn btn-secondary btn-sm" data-action="edit" data-id="${id}" title="Edit">
      <span class="material-icons-round" style="font-size:14px">edit</span>
    </button>`;
  }
  if (showDelete) {
    acts += `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${id}" title="Delete">
      <span class="material-icons-round" style="font-size:14px">delete</span>
    </button>`;
  }
  acts += '</td>';

  const skipDate = ['slides', 'testimonials', 'teachers', 'gallery'].includes(key);
  return `<tr>${customCells}${badgeTd}${skipDate ? '' : dateTd}${acts}</tr>`;
}

// ── 13. FORM ───────────────────────────────────────────────────────
const DOC_FIELD_NAMES = ['doc_aadhar', 'doc_birth', 'doc_father_aadhar', 'doc_mother_aadhar', 'doc_samagra'];
const DOC_FIELD_TYPES = { doc_aadhar: 'student_aadhar', doc_birth: 'birth_cert', doc_father_aadhar: 'father_aadhar', doc_mother_aadhar: 'mother_aadhar', doc_samagra: 'samagra_id' };

function openForm(key, config, id) {
  const host = document.getElementById('formHost');
  const item = id ? (_cache[key] || []).find(x => x._id === id) || {} : {};
  const isEdit = !!id;

  // For student edit: fetch full record to get documents list
  const docViewHtml = (key === 'students' && isEdit)
    ? `<div id="existingDocsSection" style="margin-top:8px"></div>`
    : '';

  host.innerHTML = `
    <div class="form-card" id="editPanel">
      <h2>${isEdit ? 'Edit' : 'Add New'} ${esc(config.label)}</h2>
      <form id="editForm" novalidate>
        <div class="form-grid">
          ${config.fields.map(f => {
            if (f.type === 'separator') return renderField(f, null);
            if (f.type === 'docfile')   return renderField(f, null);
            // Resolve dot-notation paths (e.g. emergencyContact.name)
            const val = f.name.includes('.')
              ? f.name.split('.').reduce((o, k) => o?.[k], item)
              : item[f.name];
            return renderField(f, val);
          }).join('')}
          <div class="form-actions col-full">
            <button type="submit" class="btn btn-primary" id="saveBtn">
              <span id="saveTxt">Save</span>
              <span id="saveSpin" class="btn-loader" style="display:none"><span class="spin"></span></span>
            </button>
            <button type="button" class="btn btn-secondary" id="cancelFormBtn">Cancel</button>
          </div>
          <div class="col-full" id="formMsg"></div>
        </div>
      </form>
      ${docViewHtml}
    </div>`;

  // Load and display existing documents when editing a student
  if (key === 'students' && isEdit) {
    api(`/students/${id}`).then(({ data: s }) => {
      const el = document.getElementById('existingDocsSection');
      if (!el || !s?.documents?.length) return;
      el.innerHTML = `<div style="margin-top:16px;border-top:1px solid var(--bd);padding-top:14px">
        <div style="font-weight:700;font-size:12px;color:var(--txt-sm);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">
          📎 Uploaded Documents (${s.documents.length})
        </div>
        ${s.documents.map(d => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg);border-radius:8px;margin-bottom:6px">
            <span class="material-icons-round" style="color:var(--primary);font-size:20px">${(d.fileType||'').includes('pdf') ? 'picture_as_pdf' : 'image'}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600">${esc(d.label||d.docType)}</div>
              <div style="font-size:10px;color:var(--txt-sm);text-transform:uppercase">${esc(d.docType||'')}</div>
            </div>
            <a href="${esc(d.url)}" target="_blank" class="btn btn-secondary btn-sm" style="font-size:11px">View</a>
            ${canAdmin() ? `<button class="btn btn-danger btn-sm" style="font-size:11px" onclick="deleteStudentDoc('${id}','${esc(d._id||'')}')">Delete</button>` : ''}
          </div>`).join('')}
      </div>`;
    }).catch(() => {});
  }

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('cancelFormBtn').addEventListener('click', () => { host.innerHTML = ''; });

  document.getElementById('editForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = document.getElementById('saveBtn');
    const txt  = document.getElementById('saveTxt');
    const spin = document.getElementById('saveSpin');
    const msg  = document.getElementById('formMsg');
    btn.disabled = true; txt.style.display = 'none'; spin.style.display = '';
    try {
      const fd = new FormData(e.target);
      for (const [k, v] of [...fd.entries()]) {
        if (v instanceof File && !v.name) fd.delete(k);
      }


      // For students: extract doc uploads before main save
      const docFiles = {};
      if (key === 'students') {
        DOC_FIELD_NAMES.forEach(n => {
          const inp = e.target.querySelector(`input[name="${n}"]`);
          if (inp?.files?.[0]) docFiles[n] = inp.files[0];
          fd.delete(n);
        });
        // Also remove separator pseudo-fields
        for (const [k] of [...fd.entries()]) { if (k.startsWith('_s')) fd.delete(k); }
        // For new student (lean create form): derive parentName & phone from father's details
        if (!id) {
          if (!fd.get('parentName') || !fd.get('parentName').trim()) {
            const fn = (fd.get('fatherName') || '').trim();
            if (fn) fd.set('parentName', fn);
          }
          if (!fd.get('phone') || !fd.get('phone').trim()) {
            const fp = (fd.get('fatherPhone') || fd.get('motherPhone') || '').trim();
            if (fp) fd.set('phone', fp);
          }
        }
      }

      const method   = id ? 'PATCH' : 'POST';
      // Teacher creation uses dedicated onboard endpoint that returns credentials
      const endpoint = (key === 'teachers' && !id)
        ? '/teacher-admin/create'
        : `${config.endpoint}${id ? '/' + id : ''}`;
      const result   = await api(endpoint, { method, body: fd });

      // Upload document files for students
      if (key === 'students' && Object.keys(docFiles).length) {
        const studentId = id || result?.data?._id || result?.data?.student?._id;
        if (studentId) {
          let docOk = 0, docFail = 0;
          for (const [n, file] of Object.entries(docFiles)) {
            const df = new FormData();
            df.append('document', file);
            df.append('docType',  DOC_FIELD_TYPES[n]);
            df.append('label',    file.name);
            await api(`/students/${studentId}/documents`, { method: 'POST', body: df })
              .then(() => docOk++).catch(() => docFail++);
          }
          if (docFail) toast(`${docOk} doc(s) uploaded, ${docFail} failed`, 'warning');
          else if (docOk) toast(`Student saved + ${docOk} document(s) uploaded!`, 'success');
        }
      }

      host.innerHTML = '';
      if (!Object.keys(docFiles).length) toast(`${config.label} ${id ? 'updated' : 'created'} successfully!`, 'success');

      // Show parent credentials after new student creation
      if (key === 'students' && !id && result?.parentCredentials?.isNew) {
        showParentCredentialsModal({
          ...result.parentCredentials,
          admissionNumber: result.data?.admissionNumber,
          rollNumber:      result.data?.rollNumber
        });
      }

      // Show teacher credentials after new teacher creation
      if (key === 'teachers' && !id && result?.credentials) {
        showTeacherCredentialsModal(result.credentials);
      }

      navigate(key);
    } catch (err) {
      msg.innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
      btn.disabled = false; txt.style.display = ''; spin.style.display = 'none';
    }
  });
}

async function deleteStudentDoc(studentId, docId) {
  if (!docId || !confirm('Delete this document? This cannot be undone.')) return;
  try {
    await api(`/students/${studentId}/documents/${docId}`, { method: 'DELETE' });
    toast('Document deleted', 'success');
    // Reload the docs section
    api(`/students/${studentId}`).then(({ data: s }) => {
      const el = document.getElementById('existingDocsSection');
      if (!el) return;
      if (!s?.documents?.length) { el.innerHTML = ''; return; }
      // Re-render
      el.querySelector('div') && (el.innerHTML = el.innerHTML); // trigger re-render via edit form reload
    }).catch(() => {});
  } catch (err) { toast(err.message, 'error'); }
}
window.deleteStudentDoc = deleteStudentDoc;

function renderField(f, value) {
  const wrapCls = f.wide ? 'form-group col-full' : 'form-group';
  const req     = f.required ? 'required' : '';
  const reqMark = f.required ? ' <span style="color:var(--err)">*</span>' : '';
  const label   = `<label class="form-label" for="ff_${f.name}">${esc(f.label)}${reqMark}</label>`;

  if (f.type === 'separator') {
    return `<div class="col-full" style="margin:14px 0 2px;padding:10px 14px;background:linear-gradient(to right,var(--bg),transparent);border-radius:8px;border-left:3px solid var(--primary)">
      <div style="font-weight:700;font-size:11px;color:var(--primary);text-transform:uppercase;letter-spacing:.8px;display:flex;align-items:center;gap:6px">
        <span class="material-icons-round" style="font-size:15px">${f.icon || 'info'}</span>${esc(f.label)}
      </div>
    </div>`;
  }

  if (f.type === 'docfile') {
    const existing = value ? `<a href="${esc(value)}" target="_blank" style="font-size:11px;color:var(--primary);display:inline-flex;align-items:center;gap:3px">
      <span class="material-icons-round" style="font-size:13px">description</span>View uploaded file</a>` : `<span style="font-size:11px;color:var(--txt-sm)">No file yet</span>`;
    return `<div class="col-full" style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:10px 14px;background:var(--bg);border-radius:8px;margin-bottom:4px">
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--txt);margin-bottom:3px">${esc(f.label)}</div>
        ${existing}
      </div>
      <input name="${f.name}" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style="font-size:12px;max-width:240px;padding:5px">
    </div>`;
  }

  if (f.type === 'file') {
    const preview = value ? `<img src="${esc(value)}" alt="" style="height:58px;margin-top:8px;border-radius:8px;object-fit:cover">` : '';
    return `<div class="${wrapCls}">${label}
      <input id="ff_${f.name}" name="${f.name}" type="file" accept="image/*" class="form-input" style="padding:8px">
      ${preview}
    </div>`;
  }
  if (f.type === 'textarea') {
    return `<div class="${wrapCls}">${label}
      <textarea id="ff_${f.name}" name="${f.name}" class="form-textarea" ${req}>${esc(value ?? '')}</textarea>
    </div>`;
  }
  if (f.type === 'select') {
    const opts = (f.options || []).map(o => `<option value="${esc(o)}" ${String(value) === String(o) ? 'selected' : ''}>${esc(o)}</option>`).join('');
    return `<div class="${wrapCls}">${label}
      <select id="ff_${f.name}" name="${f.name}" class="form-select" ${req}>
        <option value="">— Select —</option>${opts}
      </select>
    </div>`;
  }
  if (f.type === 'boolean') {
    return `<div class="${wrapCls}">${label}
      <select id="ff_${f.name}" name="${f.name}" class="form-select">
        <option value="true"  ${value !== false ? 'selected' : ''}>Yes</option>
        <option value="false" ${value === false  ? 'selected' : ''}>No</option>
      </select>
    </div>`;
  }
  const inputType = f.type || 'text';
  const val = inputType === 'date' && value ? new Date(value).toISOString().slice(0, 10) : (value ?? '');
  return `<div class="${wrapCls}">${label}
    <input id="ff_${f.name}" name="${f.name}" type="${inputType}" value="${esc(val)}" class="form-input" ${req}>
  </div>`;
}

async function confirmDelete(key, config, id) {
  if (!confirm(`Delete this ${config.label.toLowerCase()} record?\n\nThis action cannot be undone.`)) return;
  try {
    await api(`${config.endpoint}/${id}`, { method: 'DELETE' });
    toast('Record deleted successfully', 'success');
    navigate(key);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function updateAdmStatus(id, status) {
  try {
    await api(`/admissions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast(`Admission ${status.toLowerCase()} successfully`, 'success');
    navigate('admissions');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function convertAdmission(admissionId) {
  if (!confirm('Convert this admission to an enrolled student?\n\nA student profile will be created.')) return;
  try {
    const { parentCredentials } = await api(`/students/convert-admission/${admissionId}`, { method: 'POST' });
    toast('Student enrolled successfully!', 'success');
    if (parentCredentials && parentCredentials.isNew) {
      showParentCredentialsModal(parentCredentials);
    }
    navigate('students');
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* Shown right after enrollment: the parent-portal login just generated for
   this family, so the admin can copy/share it immediately. */
function showParentCredentialsModal({ portalEmail, password, admissionNumber, rollNumber }) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay';
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;overflow-y:auto';
  wrap.innerHTML = `
    <div class="card" style="max-width:440px;width:100%;padding:28px;text-align:center;border-radius:20px;margin:auto">
      <div style="font-size:36px;margin-bottom:6px">🎉</div>
      <h3 style="font-size:17px;font-weight:700;margin-bottom:6px">Student Admission Successful</h3>
      <p style="font-size:12px;color:var(--txt-sm);margin-bottom:18px;line-height:1.6">Share these details with the parent. <strong>Password can only be reset by admin.</strong></p>
      <div style="background:var(--bg);border-radius:12px;padding:16px;text-align:left;font-family:monospace;font-size:13px;margin-bottom:18px;border:1px solid rgba(0,0,0,.06);display:grid;gap:12px">
        ${admissionNumber ? `<div>
          <div style="font-size:10px;color:var(--txt-sm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Admission Number</div>
          <strong style="font-size:14px;color:var(--primary)">${esc(admissionNumber)}</strong>
        </div>` : ''}
        ${rollNumber ? `<div>
          <div style="font-size:10px;color:var(--txt-sm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Roll Number</div>
          <strong style="font-size:14px;color:var(--primary)">${esc(rollNumber)}</strong>
        </div>` : ''}
        <div>
          <div style="font-size:10px;color:var(--txt-sm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Parent Portal Login (User ID)</div>
          <strong style="font-size:14px;color:var(--primary)">${esc(portalEmail)}</strong>
        </div>
        <div>
          <div style="font-size:10px;color:var(--txt-sm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Password</div>
          <strong style="font-size:14px;color:var(--primary)">${esc(password)}</strong>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" style="flex:1" id="pcCopyBtn">📋 Copy All</button>
        <button class="btn btn-primary" style="flex:1" id="pcCloseBtn">Done</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#pcCopyBtn').onclick = () => {
    const lines = ['Vedantam Play School — Student Admission Details'];
    if (admissionNumber) lines.push(`Admission No: ${admissionNumber}`);
    if (rollNumber)      lines.push(`Roll No: ${rollNumber}`);
    lines.push(`Parent Portal Login: ${portalEmail}`, `Password: ${password}`, 'Note: Password can only be reset by admin.');
    navigator.clipboard?.writeText(lines.join('\n'));
    toast('Details copied to clipboard', 'success');
  };
  wrap.querySelector('#pcCloseBtn').onclick = () => wrap.remove();
}

/* Shown right after teacher creation: display credentials for the admin to share. */
function showTeacherCredentialsModal({ name, employeeId, email, phone, password }) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay';
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
  const loginId = email || phone || '';
  wrap.innerHTML = `
    <div class="card" style="max-width:420px;width:100%;padding:28px;text-align:center;border-radius:20px">
      <div style="font-size:36px;margin-bottom:6px">👩‍🏫</div>
      <h3 style="font-size:17px;font-weight:700;margin-bottom:4px">Teacher Account Created</h3>
      <p style="font-size:12px;color:var(--txt-sm);margin-bottom:18px;line-height:1.6">Share these credentials with <strong>${esc(name||'the teacher')}</strong>. <strong>They cannot change the password themselves</strong> — only admin can reset it.</p>
      <div style="background:var(--bg);border-radius:12px;padding:16px;text-align:left;font-family:monospace;font-size:13px;margin-bottom:18px;border:1px solid rgba(0,0,0,.06)">
        ${employeeId ? `<div style="margin-bottom:10px">
          <div style="font-size:10px;color:var(--txt-sm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Employee ID</div>
          <strong style="font-size:14px;color:var(--primary)">${esc(employeeId)}</strong>
        </div>` : ''}
        ${loginId ? `<div style="margin-bottom:10px">
          <div style="font-size:10px;color:var(--txt-sm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Login (Email / Phone)</div>
          <strong style="font-size:14px;color:var(--primary)">${esc(loginId)}</strong>
        </div>` : ''}
        <div>
          <div style="font-size:10px;color:var(--txt-sm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Password</div>
          <strong style="font-size:14px;color:var(--primary)">${esc(password)}</strong>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" style="flex:1" id="tcCopyBtn">📋 Copy Credentials</button>
        <button class="btn btn-primary" style="flex:1" id="tcCloseBtn">Done</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#tcCopyBtn').onclick = () => {
    const text = [
      'Vedantam Play School — Teacher Portal',
      employeeId ? `Employee ID: ${employeeId}` : '',
      loginId    ? `Login: ${loginId}` : '',
      `Password: ${password}`,
      'Note: Password can only be reset by admin.'
    ].filter(Boolean).join('\n');
    navigator.clipboard?.writeText(text);
    toast('Credentials copied to clipboard', 'success');
  };
  wrap.querySelector('#tcCloseBtn').onclick = () => wrap.remove();
}

async function archiveStudent(id) {
  if (!confirm('Archive this student? They will be marked Inactive.')) return;
  try {
    await api(`/students/${id}/archive`, { method: 'POST' });
    toast('Student archived', 'info');
    navigate('students');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function restoreStudent(id) {
  try {
    await api(`/students/${id}/restore`, { method: 'POST' });
    toast('Student restored to Active', 'success');
    navigate('students');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function updateItemStatus(endpoint, id, status, key) {
  try {
    await api(`${endpoint}/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast(`Status updated to "${status}"`, 'success');
    navigate(key);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function exportCSV(key, items) {
  if (!items.length) { toast('No data to export', 'info'); return; }
  const cols = Object.keys(items[0]).filter(k => k !== '__v');
  const csv  = [cols, ...items.map(o => cols.map(k => `"${String(o[k] ?? '').replace(/"/g, '""')}"`))]
    .map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${key}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV exported successfully', 'success');
}

// ── 14. PARENTS PAGE ──────────────────────────────────────────────
async function parentsPage() {
  const search = _search['parents'] || '';
  const params = new URLSearchParams({ limit: 100, sort: '-createdAt' });
  if (search) params.set('search', search);

  const { data } = await api(`/parents?${params}`);
  _cache['parents'] = data;

  const showNew    = canEdit();
  const showDelete = canAdmin();

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">Parents / Guardians</div>
        <div class="page-header-sub">${data.length} record${data.length !== 1 ? 's' : ''}</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-secondary" id="exportParentBtn">
          <span class="material-icons-round" style="font-size:18px">download</span> Export CSV
        </button>
      </div>
    </div>
    <div class="alert alert-info" style="margin:0 0 12px;font-size:13px">
      <span class="material-icons-round" style="font-size:16px">info</span>
      Parent records are created automatically when a student is enrolled. Use the student form to manage parent details.
    </div>
    <div id="parentFormHost"></div>
    <div class="card">
      <div class="card-head" style="padding:12px 16px">
        <div class="table-toolbar" style="width:100%;margin:0;border:none;gap:8px">
          <div class="search-wrap">
            <span class="material-icons-round">search</span>
            <input class="search-input" id="parentSearch" placeholder="Search parents…" value="${esc(search)}">
          </div>
          <button class="btn btn-secondary btn-sm" id="parentSearchBtn">Search</button>
        </div>
      </div>
      <div class="table-wrap">${buildParentsTable(data, showDelete)}</div>
    </div>`;

  document.getElementById('exportParentBtn').addEventListener('click', () => exportCSV('parents', data));
  document.getElementById('parentSearchBtn').addEventListener('click', () => {
    _search['parents'] = document.getElementById('parentSearch').value.trim();
    parentsPage();
  });
  document.getElementById('parentSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') { _search['parents'] = e.target.value.trim(); parentsPage(); }
  });

  document.getElementById('contentArea').addEventListener('click', async e => {
    const btn = e.target.closest('[data-parent-action]');
    if (!btn) return;
    const { parentAction, id } = btn.dataset;
    if (parentAction === 'edit')   openParentForm(id);
    if (parentAction === 'delete') {
      if (!confirm('Delete this parent record? This cannot be undone.')) return;
      try {
        await api(`/parents/${id}`, { method: 'DELETE' });
        toast('Parent deleted', 'success');
        parentsPage();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

function buildParentsTable(items, showDelete) {
  if (!items.length) return `<div class="empty-state">
    <span class="material-icons-round empty-icon">family_restroom</span>
    <p class="empty-title">No parents found</p>
    <p class="empty-sub">Add a parent record to get started.</p>
  </div>`;

  const rows = items.map(p => {
    const fatherName = p.father?.name || '—';
    const motherName = p.mother?.name || p.guardian?.name || '—';
    const phone      = p.father?.phone || p.mother?.phone || p.guardian?.phone || '—';
    const children   = (p.students || []).length;
    return `<tr>
      <td>
        <div class="td-main">${esc(fatherName)}</div>
        <div class="td-sub">${esc(motherName)}</div>
      </td>
      <td>${esc(phone)}</td>
      <td>${esc(p.father?.email || p.mother?.email || '—')}</td>
      <td style="text-align:center">
        <span class="badge badge-default">${children} child${children !== 1 ? 'ren' : ''}</span>
      </td>
      <td>${esc(p.address?.city || '—')}</td>
      <td>${fmtDate(p.createdAt)}</td>
      <td class="td-actions">
        ${canEdit() ? `<button class="btn btn-secondary btn-sm" data-parent-action="edit" data-id="${p._id}" title="Edit">
          <span class="material-icons-round" style="font-size:14px">edit</span>
        </button>` : ''}
        ${showDelete ? `<button class="btn btn-danger btn-sm" data-parent-action="delete" data-id="${p._id}" title="Delete">
          <span class="material-icons-round" style="font-size:14px">delete</span>
        </button>` : ''}
      </td>
    </tr>`;
  }).join('');

  return `<table>
    <thead><tr>
      <th>Father / Mother</th><th>Phone</th><th>Email</th>
      <th>Children</th><th>City</th><th>Registered</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function openParentForm(id) {
  const host = document.getElementById('parentFormHost');
  const item = id ? (_cache['parents'] || []).find(x => x._id === id) || {} : {};
  const isEdit = !!id;

  host.innerHTML = `
    <div class="form-card">
      <h2>${isEdit ? 'Edit' : 'Add New'} Parent / Guardian</h2>
      <form id="parentForm" novalidate>
        <div class="form-grid">

          <div class="form-group col-full" style="background:var(--bg);border-radius:var(--r-sm);padding:14px">
            <div style="font-weight:600;margin-bottom:12px;color:var(--primary)">
              <span class="material-icons-round" style="font-size:16px;vertical-align:middle">man</span>
              Father's Information
            </div>
            <div class="form-grid" style="margin:0">
              ${renderField({name:'father.name',     label:'Father Name',       type:'text'},      item.father?.name)}
              ${renderField({name:'father.phone',    label:'Father Mobile',     type:'tel'},       item.father?.phone)}
              ${renderField({name:'father.whatsapp', label:'Father WhatsApp',   type:'tel'},       item.father?.whatsapp)}
              ${renderField({name:'father.email',    label:'Father Email',      type:'email'},     item.father?.email)}
              ${renderField({name:'father.occupation',label:'Father Occupation',type:'text'},      item.father?.occupation)}
            </div>
          </div>

          <div class="form-group col-full" style="background:var(--bg);border-radius:var(--r-sm);padding:14px">
            <div style="font-weight:600;margin-bottom:12px;color:var(--primary)">
              <span class="material-icons-round" style="font-size:16px;vertical-align:middle">woman</span>
              Mother's Information
            </div>
            <div class="form-grid" style="margin:0">
              ${renderField({name:'mother.name',       label:"Mother Name",         type:'text'},  item.mother?.name)}
              ${renderField({name:'mother.phone',      label:"Mother Mobile",       type:'tel'},   item.mother?.phone)}
              ${renderField({name:'mother.whatsapp',   label:"Mother WhatsApp",     type:'tel'},   item.mother?.whatsapp)}
              ${renderField({name:'mother.email',      label:"Mother Email",        type:'email'}, item.mother?.email)}
              ${renderField({name:'mother.occupation', label:"Mother's Occupation", type:'text'},  item.mother?.occupation)}
            </div>
          </div>

          <div class="form-group col-full" style="background:var(--bg);border-radius:var(--r-sm);padding:14px">
            <div style="font-weight:600;margin-bottom:12px;color:var(--primary)">
              <span class="material-icons-round" style="font-size:16px;vertical-align:middle">home</span>
              Address & Income
            </div>
            <div class="form-grid" style="margin:0">
              ${renderField({name:'address.street',  label:'Street / Area',  type:'text', wide:true}, item.address?.street)}
              ${renderField({name:'address.city',    label:'City',           type:'text'},              item.address?.city)}
              ${renderField({name:'address.state',   label:'State',          type:'text'},              item.address?.state)}
              ${renderField({name:'address.pincode', label:'Pincode',        type:'text'},              item.address?.pincode)}
              ${renderField({name:'annualIncome',    label:'Annual Income (₹)', type:'number'},         item.annualIncome)}
            </div>
          </div>

          <div class="form-actions col-full">
            <button type="submit" class="btn btn-primary" id="parentSaveBtn">
              <span id="parentSaveTxt">Save</span>
              <span id="parentSaveSpin" class="btn-loader" style="display:none"><span class="spin"></span></span>
            </button>
            <button type="button" class="btn btn-secondary" id="parentCancelBtn">Cancel</button>
          </div>
          <div class="col-full" id="parentFormMsg"></div>
        </div>
      </form>
    </div>`;

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('parentCancelBtn').addEventListener('click', () => { host.innerHTML = ''; });

  document.getElementById('parentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = document.getElementById('parentSaveBtn');
    const txt  = document.getElementById('parentSaveTxt');
    const spin = document.getElementById('parentSaveSpin');
    btn.disabled = true; txt.style.display = 'none'; spin.style.display = '';

    try {
      // Build nested object from dot-notation form fields
      const raw = Object.fromEntries(new FormData(e.target));
      const body = {};
      for (const [k, v] of Object.entries(raw)) {
        const parts = k.split('.');
        if (parts.length === 2) {
          body[parts[0]] = body[parts[0]] || {};
          body[parts[0]][parts[1]] = v;
        } else {
          body[k] = v;
        }
      }
      const method   = id ? 'PATCH' : 'POST';
      const endpoint = `/parents${id ? '/' + id : ''}`;
      await api(endpoint, { method, body: JSON.stringify(body) });
      host.innerHTML = '';
      toast(`Parent ${id ? 'updated' : 'created'} successfully!`, 'success');
      parentsPage();
    } catch (err) {
      document.getElementById('parentFormMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
      btn.disabled = false; txt.style.display = ''; spin.style.display = 'none';
    }
  });
}

// ── 15. FEE MANAGEMENT PAGE ───────────────────────────────────────
async function feesPage() {
  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">Fee Management</div>
        <div class="page-header-sub">Structures · Payments · Monthly Summary</div>
      </div>
    </div>
    <div class="tab-bar">
      <button class="tab-btn active" data-tab="payments">Payments</button>
      <button class="tab-btn" data-tab="structures">Fee Structures</button>
      <button class="tab-btn" data-tab="monthly">Monthly Summary</button>
    </div>
    <div id="feeTabContent"></div>`;

  const tabs = document.querySelectorAll('.tab-btn');
  const showTab = async tabKey => {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabKey));
    const el = document.getElementById('feeTabContent');
    el.innerHTML = '<div class="loader-center"><span class="spin spin-lg"></span></div>';
    try {
      if (tabKey === 'payments')   await renderFeePayments(el);
      if (tabKey === 'structures') await renderFeeStructures(el);
      if (tabKey === 'monthly')    await renderMonthlyFees(el);
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error" style="margin-top:16px"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
    }
  };

  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  await showTab('payments');
}

async function renderFeePayments(el) {
  const { data } = await api('/fees/payments?limit=100&sort=-paymentDate');

  const addBtn = canEdit() ? `<button class="btn btn-primary" id="addPaymentBtn">
    <span class="material-icons-round" style="font-size:18px">add</span> Record Payment
  </button>` : '';

  el.innerHTML = `
    <div id="paymentFormHost"></div>
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Fee Payments (${data.length})</span>
        <div style="display:flex;gap:8px">${addBtn}</div>
      </div>
      <div class="table-wrap">${buildPaymentsTable(data)}</div>
    </div>`;

  if (canEdit()) {
    document.getElementById('addPaymentBtn')?.addEventListener('click', () => openPaymentForm(null));
  }

  el.addEventListener('click', async e => {
    const btn = e.target.closest('[data-pay-action]');
    if (!btn) return;
    const { payAction, id } = btn.dataset;
    if (payAction === 'edit')   openPaymentForm(id, data.find(x => x._id === id));
    if (payAction === 'delete' && canAdmin()) {
      if (!confirm('Delete this payment record? This cannot be undone.')) return;
      try {
        await api(`/fees/payments/${id}`, { method: 'DELETE' });
        toast('Payment deleted', 'success');
        renderFeePayments(el);
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

function buildPaymentsTable(items) {
  if (!items.length) return `<div class="empty-state">
    <span class="material-icons-round empty-icon">payments</span>
    <p class="empty-title">No payment records</p>
    <p class="empty-sub">Record the first fee payment.</p>
  </div>`;

  const rows = items.map(p => {
    const statusCls = p.status === 'Paid' ? 'badge-active' : p.status === 'Partial' ? 'badge-pending' : p.status === 'Waived' ? 'badge-approved' : 'badge-rejected';
    return `<tr>
      <td style="font-family:monospace;font-size:12px">${esc(p.receiptNumber || '—')}</td>
      <td>
        <div class="td-main">${esc(p.student?.studentName || '—')}</div>
        <div class="td-sub">${esc(p.student?.admissionNumber || '')}</div>
      </td>
      <td>${esc(p.feeType || '—')}</td>
      <td style="font-weight:600">${fmtCurrency(p.amountDue)}</td>
      <td style="color:var(--green);font-weight:600">${fmtCurrency(p.amountPaid)}</td>
      <td style="color:var(--err)">${fmtCurrency(p.balance)}</td>
      <td><span class="badge ${statusCls}">${esc(p.status)}</span></td>
      <td>${fmtDate(p.paymentDate)}</td>
      <td>${esc(p.paymentMode || '—')}</td>
      <td class="td-actions">
        ${canEdit() ? `<button class="btn btn-secondary btn-sm" data-pay-action="edit" data-id="${p._id}">
          <span class="material-icons-round" style="font-size:14px">edit</span>
        </button>` : ''}
        ${canAdmin() ? `<button class="btn btn-danger btn-sm" data-pay-action="delete" data-id="${p._id}">
          <span class="material-icons-round" style="font-size:14px">delete</span>
        </button>` : ''}
      </td>
    </tr>`;
  }).join('');

  return `<table>
    <thead><tr>
      <th>Receipt No.</th><th>Student</th><th>Fee Type</th>
      <th>Due</th><th>Paid</th><th>Balance</th>
      <th>Status</th><th>Date</th><th>Mode</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function openPaymentForm(id, item = {}) {
  const host = document.getElementById('paymentFormHost');
  const isEdit = !!id;
  const feeTypes = ['Admission Fee', 'Monthly Fee', 'Transport Fee', 'Activity Fee', 'Annual Fee', 'Exam Fee', 'Other'];
  const payModes = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Online'];

  host.innerHTML = `
    <div class="form-card">
      <h2>${isEdit ? 'Edit' : 'Record'} Fee Payment</h2>
      <form id="paymentForm" novalidate>
        <div class="form-grid">
          ${renderField({name:'studentId', label:'Student ID (MongoDB)', type:'text', required:true, wide:true}, item.student?._id || item.student)}
          ${renderField({name:'feeType',   label:'Fee Type',            type:'select', required:true, options:feeTypes}, item.feeType)}
          ${renderField({name:'month',     label:'Month (e.g. June 2025)', type:'text'}, item.month)}
          ${renderField({name:'amountDue', label:'Amount Due (₹)',      type:'number', required:true}, item.amountDue)}
          ${renderField({name:'amountPaid',label:'Amount Paid (₹)',     type:'number', required:true}, item.amountPaid)}
          ${renderField({name:'paymentDate',label:'Payment Date',       type:'date',   required:true}, item.paymentDate ? new Date(item.paymentDate).toISOString().slice(0,10) : '')}
          ${renderField({name:'paymentMode',label:'Payment Mode',       type:'select', options:payModes}, item.paymentMode)}
          ${renderField({name:'transactionId',label:'Transaction / Ref No.',type:'text'}, item.transactionId)}
          ${renderField({name:'discount',  label:'Discount (₹)',        type:'number'}, item.discount)}
          ${renderField({name:'lateFee',   label:'Late Fee (₹)',        type:'number'}, item.lateFee)}
          ${renderField({name:'remarks',   label:'Remarks',             type:'textarea', wide:true}, item.remarks)}
          <div class="form-actions col-full">
            <button type="submit" class="btn btn-primary" id="paySaveBtn">
              <span id="paySaveTxt">Save</span>
              <span id="paySaveSpin" class="btn-loader" style="display:none"><span class="spin"></span></span>
            </button>
            <button type="button" class="btn btn-secondary" id="payCancel">Cancel</button>
          </div>
          <div class="col-full" id="payMsg"></div>
        </div>
      </form>
    </div>`;

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('payCancel').addEventListener('click', () => { host.innerHTML = ''; });

  document.getElementById('paymentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = document.getElementById('paySaveBtn');
    const txt  = document.getElementById('paySaveTxt');
    const spin = document.getElementById('paySaveSpin');
    btn.disabled = true; txt.style.display = 'none'; spin.style.display = '';
    try {
      const body = Object.fromEntries(new FormData(e.target));
      const method   = id ? 'PATCH' : 'POST';
      const endpoint = id ? `/fees/payments/${id}` : '/fees/payments';
      await api(endpoint, { method, body: JSON.stringify(body) });
      host.innerHTML = '';
      toast('Payment saved successfully!', 'success');
      feesPage();
    } catch (err) {
      document.getElementById('payMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
      btn.disabled = false; txt.style.display = ''; spin.style.display = 'none';
    }
  });
}

async function renderFeeStructures(el) {
  const { data } = await api('/fees/structures?limit=100');

  const addBtn = canAdmin() ? `<button class="btn btn-primary" id="addStructBtn">
    <span class="material-icons-round" style="font-size:18px">add</span> Add Structure
  </button>` : '';

  el.innerHTML = `
    <div id="structFormHost"></div>
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Fee Structures (${data.length})</span>
        ${addBtn}
      </div>
      <div class="table-wrap">${buildStructuresTable(data)}</div>
    </div>`;

  if (canAdmin()) {
    document.getElementById('addStructBtn')?.addEventListener('click', () => openStructureForm(null));
  }

  el.addEventListener('click', async e => {
    const btn = e.target.closest('[data-struct-action]');
    if (!btn) return;
    const { structAction, id } = btn.dataset;
    if (structAction === 'delete' && canAdmin()) {
      if (!confirm('Delete this fee structure?')) return;
      try {
        await api(`/fees/structures/${id}`, { method: 'DELETE' });
        toast('Structure deleted', 'success');
        renderFeeStructures(el);
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

function buildStructuresTable(items) {
  if (!items.length) return `<div class="empty-state">
    <span class="material-icons-round empty-icon">receipt_long</span>
    <p class="empty-title">No fee structures</p>
  </div>`;

  const rows = items.map(s => `<tr>
    <td><div class="td-main">${esc(s.name || s.feeType || '—')}</div></td>
    <td>${esc(s.program || 'All')}</td>
    <td>${esc(s.feeType || '—')}</td>
    <td style="font-weight:600">${fmtCurrency(s.amount)}</td>
    <td>${esc(s.frequency || 'Monthly')}</td>
    <td>${fmtDate(s.dueDate)}</td>
    <td class="td-actions">
      ${canAdmin() ? `<button class="btn btn-danger btn-sm" data-struct-action="delete" data-id="${s._id}">
        <span class="material-icons-round" style="font-size:14px">delete</span>
      </button>` : ''}
    </td>
  </tr>`).join('');

  return `<table>
    <thead><tr><th>Name</th><th>Program</th><th>Type</th><th>Amount</th><th>Frequency</th><th>Due Date</th><th>Actions</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function openStructureForm(id) {
  const host = document.getElementById('structFormHost');
  const feeTypes  = ['Admission Fee', 'Monthly Fee', 'Transport Fee', 'Activity Fee', 'Annual Fee', 'Exam Fee', 'Other'];
  const freqTypes = ['Monthly', 'Annual', 'One-time', 'Term-wise'];

  host.innerHTML = `
    <div class="form-card">
      <h2>Add Fee Structure</h2>
      <form id="structForm" novalidate>
        <div class="form-grid">
          ${renderField({name:'name',      label:'Structure Name',    type:'text',   required:true}, '')}
          ${renderField({name:'program',   label:'Program',           type:'select', required:true, options:['All', ...PROGRAMS]}, '')}
          ${renderField({name:'feeType',   label:'Fee Type',          type:'select', required:true, options:feeTypes}, '')}
          ${renderField({name:'amount',    label:'Amount (₹)',        type:'number', required:true}, '')}
          ${renderField({name:'frequency', label:'Frequency',         type:'select', options:freqTypes}, '')}
          ${renderField({name:'dueDate',   label:'Due Date',          type:'date'}, '')}
          ${renderField({name:'lateFeePerDay', label:'Late Fee/Day (₹)',type:'number'}, '')}
          ${renderField({name:'description',label:'Description',       type:'textarea', wide:true}, '')}
          <div class="form-actions col-full">
            <button type="submit" class="btn btn-primary" id="structSaveBtn">Save Structure</button>
            <button type="button" class="btn btn-secondary" id="structCancel">Cancel</button>
          </div>
          <div class="col-full" id="structMsg"></div>
        </div>
      </form>
    </div>`;

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('structCancel').addEventListener('click', () => { host.innerHTML = ''; });

  document.getElementById('structForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('structSaveBtn');
    btn.disabled = true;
    try {
      const body = Object.fromEntries(new FormData(e.target));
      await api('/fees/structures', { method: 'POST', body: JSON.stringify(body) });
      host.innerHTML = '';
      toast('Fee structure created!', 'success');
      renderFeeStructures(document.getElementById('feeTabContent'));
    } catch (err) {
      document.getElementById('structMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}

async function renderMonthlyFees(el) {
  const year  = new Date().getFullYear();
  const { data } = await api(`/fees/payments/monthly?year=${year}`);

  const totalYear = (data || []).reduce((s, m) => s + (m.total || 0), 0);

  el.innerHTML = `
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Monthly Collection — ${year}</span>
        <span style="font-weight:700;font-size:18px;color:var(--green)">${fmtCurrency(totalYear)}</span>
      </div>
      <div class="card-body">
        <div class="monthly-bars">
          ${(data || []).map(m => {
            const pct = totalYear ? Math.round((m.total / totalYear) * 100) : 0;
            const monthName = new Date(year, (m._id || m.month) - 1).toLocaleString('en-IN', { month: 'short' });
            return `<div class="month-bar-wrap">
              <div class="month-bar-track">
                <div class="month-bar-fill" style="height:${Math.max(pct, 2)}%"></div>
              </div>
              <div class="month-bar-val">${fmtCurrency(m.total)}</div>
              <div class="month-bar-label">${monthName}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

// ── 16. ATTENDANCE PAGE ───────────────────────────────────────────
async function attendancePage() {
  const today = new Date().toISOString().slice(0, 10);

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">Attendance</div>
        <div class="page-header-sub">Students · Teachers · Holidays</div>
      </div>
    </div>
    <div class="tab-bar">
      <button class="tab-btn active" data-tab="student-att">Student Attendance</button>
      <button class="tab-btn" data-tab="teacher-att">Teacher Attendance</button>
      <button class="tab-btn" data-tab="holidays">Holidays</button>
    </div>
    <div id="attTabContent"></div>`;

  const tabs = document.querySelectorAll('.tab-btn');
  const showTab = async tabKey => {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabKey));
    const el = document.getElementById('attTabContent');
    el.innerHTML = '<div class="loader-center"><span class="spin spin-lg"></span></div>';
    try {
      if (tabKey === 'student-att') await renderStudentAttendance(el, today);
      if (tabKey === 'teacher-att') await renderTeacherAttendance(el, today);
      if (tabKey === 'holidays')    await renderHolidays(el);
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error" style="margin-top:16px"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
    }
  };

  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  await showTab('student-att');
}

const ATTENDANCE_CLASSES = ['Play Group', 'Nursery', 'LKG', 'UKG'];

async function renderStudentAttendance(el, dateStr, programFilter) {
  programFilter = programFilter || '';

  // Class selector + date always render first so the admin can pick a
  // class even before any students have loaded.
  el.innerHTML = `
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Student Attendance</span>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select id="attClass" class="form-input" style="width:150px">
            <option value="">All Classes</option>
            ${ATTENDANCE_CLASSES.map(c => `<option value="${esc(c)}" ${programFilter === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
          <input type="date" id="attDate" class="form-input" style="width:160px" value="${dateStr}">
          <button class="btn btn-secondary btn-sm" id="loadAttBtn">Load</button>
          ${canEdit() ? `<button class="btn btn-primary btn-sm" id="saveAttBtn">Save Attendance</button>` : ''}
        </div>
      </div>
      <div class="table-wrap" id="attTableWrap"><div class="loader-center"><span class="spin spin-lg"></span></div></div>
    </div>`;

  document.getElementById('attClass').value = programFilter;

  const qs = new URLSearchParams({ date: dateStr });
  if (programFilter) qs.set('program', programFilter);
  const { data: attendanceData } = await api(`/attendance/students/date?${qs.toString()}`).catch(() => ({ data: { records: [] } }));
  const records = attendanceData?.records || []; // already sorted A-Z by studentName, one row per active student in the class

  const tableWrap = document.getElementById('attTableWrap');
  tableWrap.innerHTML = `
    <table>
      <thead><tr><th>Roll No</th><th>Admission No</th><th>Student</th><th>Class</th><th>Present</th><th>Absent</th><th>Late</th><th>Holiday</th></tr></thead>
      <tbody>
        ${records.length ? records.map(r => {
          const s = r.student || {};
          return `<tr>
            <td style="font-size:12px;color:var(--txt-sm)">${esc(s.rollNumber || '—')}</td>
            <td style="font-size:12px;color:var(--txt-sm)">${esc(s.admissionNumber || '—')}</td>
            <td><div class="td-main">${esc(s.studentName || '')}</div></td>
            <td>${esc(s.program || '')}</td>
            ${['Present','Absent','Late','Holiday'].map(st => `
              <td style="text-align:center">
                <input type="radio" name="att_${s._id}" value="${st}" ${r.status === st ? 'checked' : ''}>
              </td>`).join('')}
          </tr>`;
        }).join('') : `<tr><td colspan="8" style="text-align:center;color:var(--txt-sm);padding:24px">No students found${programFilter ? ` in ${esc(programFilter)}` : ''}.</td></tr>`}
      </tbody>
    </table>`;

  document.getElementById('loadAttBtn').addEventListener('click', () => {
    renderStudentAttendance(el, document.getElementById('attDate').value, document.getElementById('attClass').value);
  });
  document.getElementById('attClass').addEventListener('change', () => {
    renderStudentAttendance(el, document.getElementById('attDate').value, document.getElementById('attClass').value);
  });

  if (canEdit()) {
    document.getElementById('saveAttBtn')?.addEventListener('click', async () => {
      const date    = document.getElementById('attDate').value;
      const students = records.map(r => r.student).filter(Boolean);
      const attRecords = students.map(s => {
        const radio = document.querySelector(`input[name="att_${s._id}"]:checked`);
        return { student: s._id, date, status: radio?.value || 'Present' };
      });
      if (!attRecords.length) { toast('No students to save', 'error'); return; }
      try {
        await api('/attendance/students', { method: 'POST', body: JSON.stringify({ date, records: attRecords }) });
        toast('Student attendance saved!', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }
}

async function renderTeacherAttendance(el, dateStr) {
  const { data: teachers } = await api('/teachers?limit=100&sort=name');
const { data: attendanceData } = await api(`/attendance/teachers/date?date=${dateStr}`).catch(() => ({ data: { records: [] } }));
const attendance = attendanceData?.records || [];

  const attMap = {};
  attendance.forEach(a => { attMap[a.teacher?._id || a.teacher] = a.status; });

  el.innerHTML = `
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Teacher Attendance</span>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="date" id="teachAttDate" class="form-input" style="width:160px" value="${dateStr}">
          <button class="btn btn-secondary btn-sm" id="loadTeachAttBtn">Load</button>
          ${canEdit() ? `<button class="btn btn-primary btn-sm" id="saveTeachAttBtn">Save Attendance</button>` : ''}
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Teacher</th><th>Designation</th><th>Present</th><th>Absent</th><th>Late</th><th>Half Day</th></tr></thead>
          <tbody>
            ${teachers.map((t, i) => {
              const cur = attMap[t._id] || 'Present';
              return `<tr>
                <td style="font-size:12px;color:var(--txt-sm)">${i + 1}</td>
                <td><div class="td-main">${esc(t.name)}</div></td>
                <td>${esc(t.designation || t.qualification || '')}</td>
                ${['Present','Absent','Late','Half Day'].map(st => `
                  <td style="text-align:center">
                    <input type="radio" name="tatt_${t._id}" value="${st}" ${cur === st ? 'checked' : ''}>
                  </td>`).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('loadTeachAttBtn').addEventListener('click', () => {
    renderTeacherAttendance(el, document.getElementById('teachAttDate').value);
  });

  if (canEdit()) {
    document.getElementById('saveTeachAttBtn')?.addEventListener('click', async () => {
      const date    = document.getElementById('teachAttDate').value;
      const records = teachers.map(t => {
        const radio = document.querySelector(`input[name="tatt_${t._id}"]:checked`);
        return { teacher: t._id, date, status: radio?.value || 'Present' };
      });
      try {
        await api('/attendance/teachers', { method: 'POST', body: JSON.stringify({ date, records }) });
        toast('Teacher attendance saved!', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }
}

async function renderHolidays(el) {
  const { data } = await api('/attendance/holidays?limit=100&sort=date');

  el.innerHTML = `
    <div id="holidayFormHost"></div>
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <span class="card-title">Holiday Calendar (${data.length})</span>
        ${canAdmin() ? `<button class="btn btn-primary btn-sm" id="addHolidayBtn">
          <span class="material-icons-round" style="font-size:16px">add</span> Add Holiday
        </button>` : ''}
      </div>
      <div class="table-wrap">${buildHolidaysTable(data)}</div>
    </div>`;

  document.getElementById('addHolidayBtn')?.addEventListener('click', () => openHolidayForm(el));

  el.addEventListener('click', async e => {
    const btn = e.target.closest('[data-hol-delete]');
    if (!btn || !canAdmin()) return;
    if (!confirm('Delete this holiday?')) return;
    try {
      await api(`/attendance/holidays/${btn.dataset.holDelete}`, { method: 'DELETE' });
      toast('Holiday deleted', 'success');
      renderHolidays(el);
    } catch (err) { toast(err.message, 'error'); }
  });
}

function buildHolidaysTable(items) {
  if (!items.length) return `<div class="empty-state">
    <span class="material-icons-round empty-icon">event_busy</span>
    <p class="empty-title">No holidays added</p>
  </div>`;

  const rows = items.map(h => `<tr>
    <td><div class="td-main">${esc(h.title)}</div></td>
    <td>${fmtDate(h.date)}</td>
    <td>${h.endDate ? fmtDate(h.endDate) : '—'}</td>
    <td><span class="badge badge-default">${esc(h.type || 'Holiday')}</span></td>
    <td class="td-actions">
      ${canAdmin() ? `<button class="btn btn-danger btn-sm" data-hol-delete="${h._id}">
        <span class="material-icons-round" style="font-size:14px">delete</span>
      </button>` : ''}
    </td>
  </tr>`).join('');

  return `<table>
    <thead><tr><th>Holiday Name</th><th>Start Date</th><th>End Date</th><th>Type</th><th>Actions</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function openHolidayForm(el) {
  const host = document.getElementById('holidayFormHost');
  host.innerHTML = `
    <div class="form-card">
      <h2>Add Holiday</h2>
      <form id="holidayForm" novalidate>
        <div class="form-grid">
          ${renderField({name:'title',     label:'Holiday Name', type:'text',   required:true}, '')}
          ${renderField({name:'type',     label:'Type',         type:'select', options:['National','State','School','Other']}, '')}
          ${renderField({name:'date',     label:'Date',         type:'date',   required:true}, '')}
          ${renderField({name:'endDate',  label:'End Date',     type:'date'}, '')}
          ${renderField({name:'description',label:'Description', type:'textarea', wide:true}, '')}
          <div class="form-actions col-full">
            <button type="submit" class="btn btn-primary" id="holSaveBtn">Save</button>
            <button type="button" class="btn btn-secondary" id="holCancel">Cancel</button>
          </div>
          <div class="col-full" id="holMsg"></div>
        </div>
      </form>
    </div>`;

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('holCancel').addEventListener('click', () => { host.innerHTML = ''; });

  document.getElementById('holidayForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('holSaveBtn');
    btn.disabled = true;
    try {
      await api('/attendance/holidays', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      host.innerHTML = '';
      toast('Holiday added!', 'success');
      renderHolidays(el);
    } catch (err) {
      document.getElementById('holMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}

// ── 17. ACADEMIC SESSIONS PAGE ────────────────────────────────────
async function sessionsPage() {
  const { data } = await api('/academic-sessions?limit=20&sort=-startDate');

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">Academic Sessions</div>
        <div class="page-header-sub">Manage school academic years</div>
      </div>
      ${canAdmin() ? `<button class="btn btn-primary" id="newSessionBtn">
        <span class="material-icons-round" style="font-size:18px">add</span> New Session
      </button>` : ''}
    </div>
    <div id="sessionFormHost"></div>
    <div class="card">
      <div class="table-wrap">${buildSessionsTable(data)}</div>
    </div>`;

  document.getElementById('newSessionBtn')?.addEventListener('click', () => openSessionForm());

  document.getElementById('contentArea').addEventListener('click', async e => {
    const btn = e.target.closest('[data-sess-action]');
    if (!btn) return;
    const { sessAction, id } = btn.dataset;
    if (sessAction === 'activate') {
      if (!confirm('Set this session as active? The current active session will be deactivated.')) return;
      try {
        await api(`/academic-sessions/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: true }) });
        toast('Session activated!', 'success');
        sessionsPage();
      } catch (err) { toast(err.message, 'error'); }
    }
    if (sessAction === 'delete' && canAdmin()) {
      if (!confirm('Delete this session?')) return;
      try {
        await api(`/academic-sessions/${id}`, { method: 'DELETE' });
        toast('Session deleted', 'success');
        sessionsPage();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

function buildSessionsTable(items) {
  if (!items.length) return `<div class="empty-state">
    <span class="material-icons-round empty-icon">calendar_today</span>
    <p class="empty-title">No academic sessions</p>
    <p class="empty-sub">Create the first academic session.</p>
  </div>`;

  const rows = items.map(s => `<tr>
    <td>
      <div class="td-main">${esc(s.name)}</div>
      ${s.description ? `<div class="td-sub">${esc(s.description)}</div>` : ''}
    </td>
    <td>${fmtDate(s.startDate)}</td>
    <td>${fmtDate(s.endDate)}</td>
    <td>
      <span class="badge ${s.isActive ? 'badge-active' : 'badge-inactive'}">
        ${s.isActive ? 'Active' : 'Inactive'}
      </span>
    </td>
    <td class="td-actions">
      ${!s.isActive && canAdmin() ? `<button class="btn btn-success btn-sm" data-sess-action="activate" data-id="${s._id}">Set Active</button>` : ''}
      ${canAdmin() && !s.isActive ? `<button class="btn btn-danger btn-sm" data-sess-action="delete" data-id="${s._id}">
        <span class="material-icons-round" style="font-size:14px">delete</span>
      </button>` : ''}
    </td>
  </tr>`).join('');

  return `<table>
    <thead><tr><th>Session Name</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function openSessionForm() {
  const host = document.getElementById('sessionFormHost');
  host.innerHTML = `
    <div class="form-card">
      <h2>Create Academic Session</h2>
      <form id="sessionForm" novalidate>
        <div class="form-grid">
          ${renderField({name:'name',        label:'Session Name (e.g. 2025-26)', type:'text', required:true}, '')}
          ${renderField({name:'startDate',   label:'Start Date',                  type:'date', required:true}, '')}
          ${renderField({name:'endDate',     label:'End Date',                    type:'date', required:true}, '')}
          ${renderField({name:'description', label:'Description',                 type:'textarea', wide:true}, '')}
          ${renderField({name:'isActive',    label:'Set as Active Session',       type:'boolean'}, 'false')}
          <div class="form-actions col-full">
            <button type="submit" class="btn btn-primary" id="sessSaveBtn">Create Session</button>
            <button type="button" class="btn btn-secondary" id="sessCancel">Cancel</button>
          </div>
          <div class="col-full" id="sessMsg"></div>
        </div>
      </form>
    </div>`;

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('sessCancel').addEventListener('click', () => { host.innerHTML = ''; });

  document.getElementById('sessionForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('sessSaveBtn');
    btn.disabled = true;
    try {
      await api('/academic-sessions', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      host.innerHTML = '';
      toast('Academic session created!', 'success');
      sessionsPage();
    } catch (err) {
      document.getElementById('sessMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}

// ── 18. REPORTS PAGE ──────────────────────────────────────────────
async function reportsPage() {
  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">Reports & Export</div>
        <div class="page-header-sub">Download CSV reports for all modules</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">

      ${[
        { key:'students',   label:'Students Report',    icon:'child_care',    desc:'Full student list with demographics, status and parent info.', endpoint:'/reports/students' },
        { key:'admissions', label:'Admissions Report',  icon:'assignment',    desc:'All admission records with status, program and dates.',         endpoint:'/reports/admissions' },
        { key:'fees',       label:'Fee Collection',     icon:'payments',      desc:'All fee payment records with receipt numbers and status.',      endpoint:'/reports/fees' },
        { key:'teachers',   label:'Teachers Report',    icon:'school',        desc:'Staff list with qualifications, salary and joining dates.',     endpoint:'/reports/teachers' },
        { key:'attendance', label:'Attendance Report',  icon:'how_to_reg',    desc:'Attendance records for a selected date or month.',              endpoint:'/reports/attendance' }
      ].map(r => `
        <div class="card">
          <div class="card-head" style="border-bottom:0">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:44px;height:44px;border-radius:12px;background:var(--primary-light);display:flex;align-items:center;justify-content:center">
                <span class="material-icons-round" style="color:var(--primary)">${r.icon}</span>
              </div>
              <div>
                <div style="font-weight:700;font-size:15px">${esc(r.label)}</div>
              </div>
            </div>
          </div>
          <div class="card-body" style="padding-top:4px">
            <p style="font-size:13px;color:var(--txt-sm);margin:0 0 16px">${esc(r.desc)}</p>
            <button class="btn btn-primary" style="width:100%" data-report-url="${esc(r.endpoint)}">
              <span class="material-icons-round" style="font-size:16px">download</span>
              Download CSV
            </button>
          </div>
        </div>`).join('')}
    </div>

    <div class="card" style="margin-top:24px">
      <div class="card-head"><span class="card-title">Custom Date Range Report</span></div>
      <div class="card-body">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group" style="margin:0">
            <label class="form-label">From Date</label>
            <input type="date" id="reportFrom" class="form-input" style="width:160px">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">To Date</label>
            <input type="date" id="reportTo" class="form-input" style="width:160px">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Module</label>
            <select id="reportModule" class="form-select" style="width:180px">
              <option value="students">Students</option>
              <option value="admissions">Admissions</option>
              <option value="fees">Fee Payments</option>
              <option value="attendance">Attendance</option>
            </select>
          </div>
          <button class="btn btn-primary" id="customReportBtn">
            <span class="material-icons-round" style="font-size:16px">download</span>
            Download
          </button>
        </div>
      </div>
    </div>`;

  document.querySelectorAll('[data-report-url]').forEach(btn => {
    btn.addEventListener('click', () => downloadReport(btn.dataset.reportUrl));
  });

  document.getElementById('customReportBtn').addEventListener('click', () => {
    const from   = document.getElementById('reportFrom').value;
    const to     = document.getElementById('reportTo').value;
    const module = document.getElementById('reportModule').value;
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to',   to);
    downloadReport(`/reports/${module}?${params}`);
  });
}

function downloadReport(endpoint) {
  const url = `${API}${endpoint}`;
  const a   = document.createElement('a');
  a.href    = url;
  a.setAttribute('download', '');
  // Add auth via query param for file downloads
  const sep = endpoint.includes('?') ? '&' : '?';
  a.href = `${API}${endpoint}${sep}token=${encodeURIComponent(S.token)}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast('Download started…', 'info');
}

// ── 19. SETTINGS PAGE ─────────────────────────────────────────────
async function settings() {
  const { data: s } = await api('/settings');

  document.getElementById('contentArea').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-header-title">School Settings</div>
        <div class="page-header-sub">Manage your school's information and preferences</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

      <div>
        <div class="form-card">
          <h2>School Information</h2>
          <form id="infoForm">
            <div class="form-grid">
              <div class="form-group col-full">
                <label class="form-label">School Name</label>
                <input name="schoolName" class="form-input" value="${esc(s.schoolName || '')}" placeholder="Vedantam Play School">
              </div>
              <div class="form-group col-full">
                <label class="form-label">Tagline</label>
                <input name="tagline" class="form-input" value="${esc(s.tagline || '')}" placeholder="Where Little Dreams Take Flight">
              </div>
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input name="phone" type="tel" class="form-input" value="${esc(s.phone || '')}" placeholder="+91 98765 43210">
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input name="email" type="email" class="form-input" value="${esc(s.email || '')}" placeholder="info@vedantam.edu.in">
              </div>
              <div class="form-group col-full">
                <label class="form-label">Address</label>
                <textarea name="address" class="form-textarea" placeholder="Full school address">${esc(s.address || '')}</textarea>
              </div>
              <div class="form-group col-full">
                <label class="form-label">Google Maps URL</label>
                <input name="googleMapsUrl" class="form-input" value="${esc(s.googleMapsUrl || '')}" placeholder="https://maps.google.com/...">
              </div>
            </div>
            <div class="form-actions" style="margin-top:16px">
              <button type="submit" class="btn btn-primary" id="infoSaveBtn">
                <span id="infoSaveTxt">Save Information</span>
                <span id="infoSaveSpin" class="btn-loader" style="display:none"><span class="spin"></span></span>
              </button>
            </div>
            <div id="infoMsg" style="margin-top:12px"></div>
          </form>
        </div>

        <div class="form-card">
          <h2>Social Media Links</h2>
          <form id="socialForm">
            <div class="form-grid">
              ${[['facebook','Facebook Page URL','https://facebook.com/...'],
                 ['instagram','Instagram URL','https://instagram.com/...'],
                 ['youtube','YouTube Channel URL','https://youtube.com/...'],
                 ['twitter','Twitter / X URL','https://twitter.com/...']].map(([k, l, ph]) => `
                <div class="form-group col-full">
                  <label class="form-label">${l}</label>
                  <input name="${k}" class="form-input" value="${esc(s.socialLinks?.[k] || '')}" placeholder="${ph}">
                </div>`).join('')}
            </div>
            <div class="form-actions" style="margin-top:16px">
              <button type="submit" class="btn btn-primary" id="socialSaveBtn">Save Social Links</button>
            </div>
            <div id="socialMsg" style="margin-top:12px"></div>
          </form>
        </div>
      </div>

      <div>
        <div class="form-card">
          <h2>School Logo</h2>
          <div style="text-align:center;padding:12px 0">
            <img id="logoPreview" src="${esc(s.logoUrl || 'logo.png')}" alt="Logo"
              style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid var(--bd);margin-bottom:18px">
            <div>
              <form id="logoForm">
                <label class="btn btn-secondary" style="display:inline-flex;cursor:pointer;gap:8px">
                  <span class="material-icons-round" style="font-size:18px">upload</span>
                  <span id="logoLabel">Choose Logo File</span>
                  <input type="file" id="logoFile" name="logo" accept="image/*" style="display:none">
                </label>
                <button type="submit" class="btn btn-primary" id="logoSaveBtn" style="display:none;margin-top:10px">Upload Logo</button>
              </form>
              <div id="logoMsg" style="margin-top:10px"></div>
            </div>
          </div>
        </div>

        <div class="form-card">
          <h2>API Configuration</h2>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="padding:12px;background:var(--bg);border-radius:var(--r-sm)">
              <div class="form-label" style="margin-bottom:4px">Current API Endpoint</div>
              <div style="font-size:12px;font-family:monospace;color:var(--txt-sm);word-break:break-all">${esc(API)}</div>
            </div>
            <div class="alert alert-info">
              <span class="material-icons-round">info</span>
              <span>Configure the API base URL via <code>js/api-config.js</code> or the <code>vedantam-api-base</code> meta tag.</span>
            </div>
          </div>
        </div>
      </div>

    </div>`;

  document.getElementById('infoForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = document.getElementById('infoSaveBtn');
    const txt  = document.getElementById('infoSaveTxt');
    const spin = document.getElementById('infoSaveSpin');
    btn.disabled = true; txt.style.display = 'none'; spin.style.display = '';
    try {
      await api('/settings', { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      document.getElementById('infoMsg').innerHTML = `<div class="alert alert-success"><span class="material-icons-round">check_circle</span>Settings saved successfully!</div>`;
      toast('Settings saved!', 'success');
    } catch (err) {
      document.getElementById('infoMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
    } finally {
      btn.disabled = false; txt.style.display = ''; spin.style.display = 'none';
    }
  });

  document.getElementById('socialForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/settings', { method: 'PUT', body: JSON.stringify({ socialLinks: Object.fromEntries(new FormData(e.target)) }) });
      document.getElementById('socialMsg').innerHTML = `<div class="alert alert-success"><span class="material-icons-round">check_circle</span>Social links saved!</div>`;
      toast('Social links saved!', 'success');
    } catch (err) {
      document.getElementById('socialMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
    }
  });

  document.getElementById('logoFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('logoLabel').textContent = file.name;
    document.getElementById('logoPreview').src = URL.createObjectURL(file);
    document.getElementById('logoSaveBtn').style.display = '';
  });

  document.getElementById('logoForm').addEventListener('submit', async e => {
    e.preventDefault();
    const file = document.getElementById('logoFile').files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      await api('/settings/logo', { method: 'PATCH', body: fd });
      document.getElementById('logoMsg').innerHTML = `<div class="alert alert-success"><span class="material-icons-round">check_circle</span>Logo updated!</div>`;
      document.getElementById('logoSaveBtn').style.display = 'none';
      toast('Logo updated!', 'success');
    } catch (err) {
      document.getElementById('logoMsg').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  });
}

// ── 20. PROFILE PAGE ──────────────────────────────────────────────
async function profile() {
  const { data } = await api('/auth/me');
  const a         = data.admin;
  const initials  = (a.name || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const roleName  = (a.role || 'admin').replace(/_/g, ' ');
  const lastLogin = a.lastLoginAt
    ? new Date(a.lastLoginAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'This is your first login';

  document.getElementById('contentArea').innerHTML = `
    <div class="profile-hero">
      <div class="profile-photo-wrap">
        <div class="profile-photo" id="profPhotoEl">
          ${a.profilePhoto
            ? `<img src="${esc(a.profilePhoto)}" alt="">`
            : `<span style="font-size:36px;font-weight:900;color:rgba(255,255,255,.8)">${esc(initials)}</span>`}
        </div>
        <label class="profile-cam" title="Change photo">
          <span class="material-icons-round">camera_alt</span>
          <input type="file" id="photoInput" accept="image/*" style="display:none">
        </label>
      </div>
      <div>
        <div class="profile-name">${esc(a.name)}</div>
        <div class="profile-email">${esc(a.email)}</div>
        <div class="profile-badge">
          <span class="material-icons-round" style="font-size:14px">verified</span>
          ${esc(roleName)}
        </div>
        <div class="profile-meta">
          <div class="profile-meta-item">
            <strong>${esc(lastLogin)}</strong>
            Last Login
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="form-card">
        <h2>Profile Information</h2>
        <form id="profileForm">
          <div class="form-grid">
            <div class="form-group col-full">
              <label class="form-label">Full Name <span style="color:var(--err)">*</span></label>
              <input name="name" class="form-input" value="${esc(a.name || '')}" required>
            </div>
            <div class="form-group col-full">
              <label class="form-label">Email Address <span style="color:var(--err)">*</span></label>
              <input name="email" type="email" class="form-input" value="${esc(a.email || '')}" required>
            </div>
          </div>
          <div class="form-actions" style="margin-top:16px">
            <button type="submit" class="btn btn-primary" id="profSaveBtn">Save Profile</button>
          </div>
          <div id="profMsg" style="margin-top:12px"></div>
        </form>
      </div>

      <div class="form-card">
        <h2>Change Password</h2>
        <form id="passForm">
          <div class="form-grid">
            <div class="form-group col-full">
              <label class="form-label">Current Password</label>
              <input name="currentPassword" type="password" class="form-input" placeholder="Enter current password" required>
            </div>
            <div class="form-group col-full">
              <label class="form-label">New Password</label>
              <input name="newPassword" type="password" class="form-input" placeholder="Minimum 8 characters" minlength="8" required>
            </div>
            <div class="form-group col-full">
              <label class="form-label">Confirm New Password</label>
              <input name="confirmPassword" type="password" class="form-input" placeholder="Repeat new password" required>
            </div>
          </div>
          <div class="form-actions" style="margin-top:16px">
            <button type="submit" class="btn btn-primary">Change Password</button>
          </div>
          <div id="passMsg" style="margin-top:12px"></div>
        </form>
      </div>
    </div>`;

  document.getElementById('photoInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const { data: r } = await api('/auth/profile-photo', { method: 'PATCH', body: fd });
      S.admin.profilePhoto = r.profilePhoto;
      document.getElementById('profPhotoEl').innerHTML = `<img src="${esc(r.profilePhoto)}" alt="">`;
      renderSidebar();
      toast('Profile photo updated!', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const { data: r } = await api('/auth/profile', { method: 'PATCH', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      S.admin = { ...S.admin, ...r.admin };
      renderSidebar();
      document.getElementById('profMsg').innerHTML = `<div class="alert alert-success"><span class="material-icons-round">check_circle</span>Profile updated!</div>`;
      toast('Profile saved!', 'success');
    } catch (err) {
      document.getElementById('profMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
    }
  });

  document.getElementById('passForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd  = new FormData(e.target);
    const np  = fd.get('newPassword');
    const cp2 = fd.get('confirmPassword');
    if (np !== cp2) {
      document.getElementById('passMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>New passwords do not match.</div>`;
      return;
    }
    try {
      await api('/auth/change-password', { method: 'PATCH', body: JSON.stringify({ currentPassword: fd.get('currentPassword'), newPassword: np }) });
      document.getElementById('passMsg').innerHTML = `<div class="alert alert-success"><span class="material-icons-round">check_circle</span>Password changed successfully!</div>`;
      toast('Password changed!', 'success');
      e.target.reset();
    } catch (err) {
      document.getElementById('passMsg').innerHTML = `<div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div>`;
    }
  });
}

// ── 21. LOGIN PAGE ────────────────────────────────────────────────
function initLogin() {
  const pwInput = document.getElementById('loginPassword');
  const pwIcon  = document.getElementById('pwToggleIcon');
  document.getElementById('pwToggle').addEventListener('click', () => {
    const show = pwInput.type === 'password';
    pwInput.type = show ? 'text' : 'password';
    pwIcon.textContent = show ? 'visibility_off' : 'visibility';
  });

  document.getElementById('forgotBtn').addEventListener('click', () => {
    toast('Please contact your system administrator to reset your password.', 'info');
  });

  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl  = document.getElementById('loginError');
    const btnTxt = document.getElementById('loginBtnText');
    const btnSpin= document.getElementById('loginSpinner');
    const btn    = document.getElementById('loginBtn');

    errEl.style.display = 'none';
    btn.disabled = true;
    btnTxt.style.display = 'none';
    btnSpin.style.display = '';

    try {
      const fd       = new FormData(e.target);
      const { data } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) });
      saveToken(data.token, fd.get('remember') === 'on');
      S.admin = data.admin;
      if (data.admin.mustChangePassword) showPage('forceChangePage');
      else bootAdmin();
    } catch (err) {
      errEl.innerHTML = `<span class="material-icons-round">error</span>${esc(err.message)}`;
      errEl.style.display = 'flex';
    } finally {
      btn.disabled = false;
      btnTxt.style.display = '';
      btnSpin.style.display = 'none';
    }
  });
}

// ── 22. FORCE CHANGE PAGE ─────────────────────────────────────────
function initForceChange() {
  document.getElementById('forceChangeForm').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl  = document.getElementById('forceChangeError');
    const btnTxt = document.getElementById('fcBtnText');
    const btnSpin= document.getElementById('fcSpinner');
    const btn    = document.getElementById('forceChangeBtn');
    const fd     = new FormData(e.target);
    const newPassword = fd.get('newPassword');
    const confirmPassword = fd.get('confirmPassword');

    if (newPassword !== confirmPassword) {
      errEl.innerHTML = `<span class="material-icons-round">error</span>New passwords do not match`;
      errEl.style.display = 'flex'; return;
    }
    if (newPassword.length < 8) {
      errEl.innerHTML = `<span class="material-icons-round">error</span>Password must be at least 8 characters`;
      errEl.style.display = 'flex'; return;
    }

    errEl.style.display = 'none';
    btn.disabled = true; btnTxt.style.display = 'none'; btnSpin.style.display = '';

    try {
      await api('/auth/change-password', { method: 'PATCH', body: JSON.stringify({ currentPassword: fd.get('currentPassword'), newPassword }) });
      S.admin.mustChangePassword = false;
      toast('Password set successfully! Welcome to your dashboard.', 'success');
      bootAdmin();
    } catch (err) {
      errEl.innerHTML = `<span class="material-icons-round">error</span>${esc(err.message)}`;
      errEl.style.display = 'flex';
    } finally {
      btn.disabled = false; btnTxt.style.display = ''; btnSpin.style.display = 'none';
    }
  });
}

// ── 23. ADMIN SHELL ───────────────────────────────────────────────
function bootAdmin() {
  showPage('adminShell');
  renderSidebar();
  initGlobalSearch();

  document.getElementById('menuBtn').addEventListener('click', openMobileSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeMobileSidebar);
  document.getElementById('sidebarBackdrop').addEventListener('click', closeMobileSidebar);

  // Single delegated handler for resource-row actions
  document.getElementById('contentArea').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id, status } = btn.dataset;
    const key    = S.page;
    const config = RESOURCES[key];
    if (!config) return;
    if (action === 'edit')      openForm(key, config, id);
    if (action === 'delete')    confirmDelete(key, config, id);
    if (action === 'approve')   updateAdmStatus(id, 'Approved');
    if (action === 'reject')    updateAdmStatus(id, 'Rejected');
    if (action === 'verify')    updateAdmStatus(id, 'Verified');
    if (action === 'waiting')   updateAdmStatus(id, 'Waiting');
    if (action === 'convert')   convertAdmission(id);
    if (action === 'archive')   archiveStudent(id);
    if (action === 'restore')   restoreStudent(id);
    if (action === 'setstatus') updateItemStatus(config.endpoint, id, status, key);
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch (_) { /* ignore */ }
    clearToken();
    showPage('loginPage');
    document.getElementById('loginForm').reset();
    toast('Signed out successfully', 'info');
  });

  const startPage = (location.hash || '').slice(1) || 'dashboard';
  navigate(startPage);
}

// ── 24. QR & ID CARDS PAGE ───────────────────────────────────────
async function qrCardsPage() {
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div class="form-card">
      <h2 style="font-size:17px;font-weight:700;margin-bottom:16px">🪪 QR Codes & ID Cards</h2>

      <div class="row-2">
        <!-- Student ID Card -->
        <div class="card" style="padding:20px">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px">
            <span class="material-icons-round" style="color:var(--primary)">badge</span>Student ID Card
          </h3>
          <p style="font-size:13px;color:var(--txt-sm);margin-bottom:12px">
            Select a student to generate a print-ready photo ID card with QR code.
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
            <div style="flex:1;min-width:200px">
              <label style="font-size:11px;font-weight:600;color:var(--txt-sm);text-transform:uppercase;display:block;margin-bottom:4px">Admission Number</label>
              <input type="text" id="studentIdInput" placeholder="e.g. VPS/2024/00001" style="width:100%;padding:9px 12px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px">
            </div>
            <button class="btn btn-primary" onclick="genStudentIdCard()">
              <span class="material-icons-round" style="font-size:16px">badge</span>Generate
            </button>
          </div>
          <div style="margin-top:8px;font-size:12px;color:var(--txt-sm)">Or search by name:</div>
          <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;align-items:flex-end">
            <div style="flex:1;min-width:200px">
              <input type="text" id="studentNameSearch" placeholder="Student name…" style="width:100%;padding:9px 12px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px">
            </div>
            <button class="btn btn-secondary" onclick="searchStudentForId()">Search</button>
          </div>
          <div id="studentSearchResults" style="margin-top:8px"></div>
        </div>

        <!-- Teacher ID Card -->
        <div class="card" style="padding:20px">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px">
            <span class="material-icons-round" style="color:var(--green)">badge</span>Teacher / Staff ID Card
          </h3>
          <p style="font-size:13px;color:var(--txt-sm);margin-bottom:12px">
            Generate a print-ready staff ID card with QR code for any teacher.
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
            <div style="flex:1;min-width:200px">
              <input type="text" id="teacherNameSearch" placeholder="Teacher name…" style="width:100%;padding:9px 12px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px">
            </div>
            <button class="btn btn-secondary" onclick="searchTeacherForId()">Search</button>
          </div>
          <div id="teacherSearchResults" style="margin-top:8px"></div>
        </div>
      </div>
    </div>`;
}

/* Fetch an HTML print URL with auth and open it as a blob in a new tab */
async function openPrintUrl(apiPath) {
  try {
    const res = await fetch(API + apiPath, {
      headers: S.token ? { Authorization: `Bearer ${S.token}` } : {},
      credentials: 'include'
    });
    if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.message || 'Failed to generate'); }
    const html = await res.text();
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) setTimeout(() => URL.revokeObjectURL(url), 10000);
    else toast('Pop-up blocked — please allow pop-ups for this site', 'warning');
  } catch (err) { toast(err.message, 'error'); }
}
window.openPrintUrl = openPrintUrl;

async function genStudentIdCard(id) {
  const idVal = id || document.getElementById('studentIdInput')?.value?.trim();
  if (!idVal) { toast('Enter an admission number or search above', 'warning'); return; }
  try {
    let studentId = idVal;
    if (idVal.startsWith('VPS/') || isNaN(idVal)) {
      const { data } = await api(`/students?admissionNumber=${encodeURIComponent(idVal)}&limit=1`);
      if (!data?.length) { toast('Student not found', 'error'); return; }
      studentId = data[0]._id;
    }
    await openPrintUrl(`/qr/student/${studentId}/id-card`);
  } catch (err) { toast(err.message, 'error'); }
}
window.genStudentIdCard = genStudentIdCard;

async function searchStudentForId() {
  const q = document.getElementById('studentNameSearch')?.value?.trim();
  if (!q) return;
  try {
    const { data } = await api(`/students?search=${encodeURIComponent(q)}&limit=5`);
    const el = document.getElementById('studentSearchResults');
    if (!el) return;
    if (!data.length) { el.innerHTML = `<p style="font-size:12px;color:var(--txt-sm)">No results found</p>`; return; }
    el.innerHTML = data.map(s => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd)">
        <div style="flex:1;font-size:13px"><strong>${esc(s.studentName)}</strong> <span style="color:var(--txt-sm)">${esc(s.admissionNumber||'')} · ${esc(s.program)}</span></div>
        <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px" onclick="openPrintUrl('/qr/student/${s._id}/id-card')">ID Card</button>
        <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px" onclick="showStudentQR('${s._id}','${esc(s.studentName)}')">QR</button>
      </div>`).join('');
  } catch (err) { toast(err.message, 'error'); }
}
window.searchStudentForId = searchStudentForId;

async function searchTeacherForId() {
  const q = document.getElementById('teacherNameSearch')?.value?.trim();
  if (!q) return;
  try {
    const { data } = await api(`/teachers?search=${encodeURIComponent(q)}&limit=5`);
    const el = document.getElementById('teacherSearchResults');
    if (!el) return;
    if (!data.length) { el.innerHTML = `<p style="font-size:12px;color:var(--txt-sm)">No results found</p>`; return; }
    el.innerHTML = data.map(t => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd)">
        <div style="flex:1;font-size:13px"><strong>${esc(t.name)}</strong> <span style="color:var(--txt-sm)">${esc(t.designation||t.qualification||'')}</span></div>
        <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px" onclick="openPrintUrl('/qr/teacher/${t._id}/id-card')">ID Card</button>
      </div>`).join('');
  } catch (err) { toast(err.message, 'error'); }
}
window.searchTeacherForId = searchTeacherForId;

async function showStudentQR(id, name) {
  try {
    const { data } = await api(`/qr/student/${id}`);
    const win = window.open('', '_blank', 'width=400,height=500');
    win.document.write(`<!DOCTYPE html><html><head><title>QR — ${esc(name)}</title>
    <style>body{font-family:Inter,sans-serif;text-align:center;padding:20px;background:#f7f8fc}
    h2{font-size:16px;margin-bottom:4px}p{color:#718096;font-size:12px;margin-bottom:16px}
    img{border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.1)}
    button{margin-top:16px;padding:10px 24px;background:#667eea;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer}
    </style></head><body>
    <h2>${esc(name)}</h2>
    <p>${esc(data.student?.admissionNumber||'')} · ${esc(data.student?.program||'')}</p>
    <img src="${data.qrDataUrl}" width="220" height="220" alt="QR Code">
    <br><button onclick="window.print()">🖨 Print</button>
    </body></html>`);
    win.document.close();
  } catch (err) { toast(err.message, 'error'); }
}
window.showStudentQR = showStudentQR;

// ── 25. CERTIFICATES PAGE ────────────────────────────────────────
async function certificatesPage() {
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div class="form-card">
      <h2 style="font-size:17px;font-weight:700;margin-bottom:8px">📜 Certificate Generator</h2>
      <p style="color:var(--txt-sm);font-size:13px;margin-bottom:20px">Search for a student, then click any certificate type to generate and print.</p>

      <div class="card" style="padding:20px;margin-bottom:16px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
          <div style="flex:1;min-width:220px">
            <label style="font-size:11px;font-weight:600;color:var(--txt-sm);text-transform:uppercase;display:block;margin-bottom:4px">Student Name or Admission No.</label>
            <input type="text" id="certStudentSearch" placeholder="Search student…" style="width:100%;padding:9px 12px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px">
          </div>
          <button class="btn btn-primary" onclick="searchStudentForCert()">
            <span class="material-icons-round" style="font-size:16px">search</span>Search
          </button>
        </div>
        <div id="certStudentResults" style="margin-top:12px"></div>
      </div>

      <div class="row-2">
        ${[
          ['bonafide',   'Bonafide Certificate',    'school',            'Confirms student is enrolled'],
          ['admission',  'Admission Certificate',   'fact_check',        'Formal admission record'],
          ['character',  'Character Certificate',   'stars',             'Good conduct certification'],
          ['transfer',   'Transfer Certificate',    'transfer_within_a_station', 'TC for leaving students'],
          ['completion', 'Completion Certificate',  'workspace_premium', 'Programme completion award']
        ].map(([type, label, icon, desc]) => `
          <div class="card" style="padding:16px">
            <div style="display:flex;align-items:flex-start;gap:10px">
              <span class="material-icons-round" style="color:var(--primary);font-size:28px">${icon}</span>
              <div>
                <div style="font-weight:600;font-size:13px">${label}</div>
                <div style="font-size:12px;color:var(--txt-sm);margin-top:2px">${desc}</div>
                <button class="btn btn-secondary" style="margin-top:10px;font-size:12px;padding:6px 12px" onclick="generateCert('${type}')">
                  <span class="material-icons-round" style="font-size:14px">print</span>Generate & Print
                </button>
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

let _certStudentId = null;
async function searchStudentForCert() {
  const q = document.getElementById('certStudentSearch')?.value?.trim();
  if (!q) return;
  try {
    const { data } = await api(`/students?search=${encodeURIComponent(q)}&limit=8`);
    const el = document.getElementById('certStudentResults');
    if (!el) return;
    if (!data.length) { el.innerHTML = `<p style="font-size:12px;color:var(--txt-sm)">No students found</p>`; return; }
    el.innerHTML = `<div style="font-size:12px;color:var(--txt-sm);margin-bottom:6px">Click a student to select:</div>` +
      data.map(s => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;cursor:pointer;transition:background .15s"
          onclick="selectCertStudent('${s._id}','${esc(s.studentName)}')" id="csr_${s._id}"
          onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''">
          <span class="material-icons-round" style="color:var(--txt-sm);font-size:18px">child_care</span>
          <div>
            <div style="font-size:13px;font-weight:500">${esc(s.studentName)}</div>
            <div style="font-size:11px;color:var(--txt-sm)">${esc(s.admissionNumber||'—')} · ${esc(s.program)}</div>
          </div>
        </div>`).join('');
  } catch (err) { toast(err.message, 'error'); }
}
window.searchStudentForCert = searchStudentForCert;

function selectCertStudent(id, name) {
  _certStudentId = id;
  const el = document.getElementById('certStudentResults');
  if (el) el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:#e9d8fd;border-radius:8px">
    <span class="material-icons-round" style="color:var(--primary)">check_circle</span>
    <span style="font-size:13px;font-weight:600">Selected: ${esc(name)}</span>
    <button onclick="_certStudentId=null;document.getElementById('certStudentResults').innerHTML=''" style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--txt-sm);font-size:12px">Change</button>
  </div>`;
  toast(`${name} selected — click any certificate type`, 'success');
}
window.selectCertStudent = selectCertStudent;

function generateCert(type) {
  if (!_certStudentId) { toast('Please search and select a student first', 'warning'); return; }
  openPrintUrl(`/certificates/student/${_certStudentId}/${type}`);
}
window.generateCert = generateCert;

// ── 26. NOTIFICATIONS PAGE ───────────────────────────────────────
async function notificationsPage() {
  const area = document.getElementById('contentArea');
  try {
    const { data: items, unreadCount } = await api('/notifications?limit=50');

    area.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div>
          <h2 style="font-size:17px;font-weight:700">🔔 Notifications</h2>
          ${unreadCount > 0 ? `<span style="font-size:12px;color:var(--txt-sm)">${unreadCount} unread</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="markAllNotifsRead()">
            <span class="material-icons-round" style="font-size:15px">done_all</span>Mark All Read
          </button>
          ${canAdmin() ? `
          <button class="btn btn-primary" onclick="genBirthdayNotifs()">
            <span class="material-icons-round" style="font-size:15px">cake</span>Generate Birthdays
          </button>
          <button class="btn btn-primary" onclick="showCreateNotifForm()">
            <span class="material-icons-round" style="font-size:15px">add</span>New
          </button>` : ''}
        </div>
      </div>

      <!-- Create form (hidden) -->
      <div id="notifFormWrap" style="display:none" class="form-card" style="margin-bottom:16px">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">New Notification</h3>
        <form id="notifForm">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="font-size:11px;font-weight:600;color:var(--txt-sm);text-transform:uppercase;display:block;margin-bottom:4px">Title *</label>
              <input type="text" name="title" required placeholder="Notification title" style="width:100%;padding:9px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px">
            </div>
            <div>
              <label style="font-size:11px;font-weight:600;color:var(--txt-sm);text-transform:uppercase;display:block;margin-bottom:4px">Type</label>
              <select name="type" style="width:100%;padding:9px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px">
                <option>general</option><option>birthday</option><option>fee</option>
                <option>admission</option><option>attendance</option><option>teacher</option>
              </select>
            </div>
          </div>
          <div style="margin-top:12px">
            <label style="font-size:11px;font-weight:600;color:var(--txt-sm);text-transform:uppercase;display:block;margin-bottom:4px">Message *</label>
            <textarea name="message" required rows="2" placeholder="Notification message…" style="width:100%;padding:9px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;resize:vertical"></textarea>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button type="submit" class="btn btn-primary">Create</button>
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('notifFormWrap').style.display='none'">Cancel</button>
          </div>
        </form>
      </div>

      <div class="card">
        ${!items.length
          ? `<div class="empty-state" style="padding:32px"><span class="material-icons-round empty-icon">notifications_none</span><p class="empty-title">No notifications</p></div>`
          : items.map(n => `
            <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid var(--bg);${n.isRead?'opacity:.65':''}">
              <span class="material-icons-round" style="color:${n.type==='birthday'?'#f6ad55':n.priority==='high'?'var(--err)':'var(--primary)'};font-size:22px;flex-shrink:0;margin-top:2px">
                ${n.type==='birthday'?'cake':n.type==='fee'?'payments':n.type==='attendance'?'how_to_reg':'notifications'}
              </span>
              <div style="flex:1;min-width:0">
                <div style="font-weight:${n.isRead?'400':'600'};font-size:13px">${esc(n.title)}</div>
                <div style="font-size:12px;color:var(--txt-sm);margin-top:2px">${esc(n.message)}</div>
                <div style="font-size:11px;color:var(--txt-sm);margin-top:4px">${timeAgo(n.createdAt)}</div>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0">
                ${!n.isRead ? `<button class="btn btn-secondary" style="font-size:11px;padding:4px 8px" onclick="markNotifRead('${n._id}')">Read</button>` : ''}
                ${canAdmin() ? `<button class="btn btn-secondary" style="font-size:11px;padding:4px 8px;color:var(--err)" onclick="deleteNotif('${n._id}')">Del</button>` : ''}
              </div>
            </div>`).join('')}
      </div>`;

    document.getElementById('notifForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api('/notifications', { method: 'POST', body: JSON.stringify({ title: fd.get('title'), message: fd.get('message'), type: fd.get('type') }) });
        toast('Notification created', 'success');
        notificationsPage();
      } catch (err) { toast(err.message, 'error'); }
    });
  } catch (err) {
    area.innerHTML = `<div class="form-card"><div class="alert alert-error">${esc(err.message)}</div></div>`;
  }
}

function showCreateNotifForm() { document.getElementById('notifFormWrap').style.display = ''; }
window.showCreateNotifForm = showCreateNotifForm;

async function markNotifRead(id) {
  await api(`/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  notificationsPage();
}
window.markNotifRead = markNotifRead;

async function markAllNotifsRead() {
  await api('/notifications/read-all', { method: 'PATCH' }).catch(() => {});
  toast('All notifications marked as read', 'success');
  notificationsPage();
}
window.markAllNotifsRead = markAllNotifsRead;

async function deleteNotif(id) {
  if (!confirm('Delete this notification?')) return;
  await api(`/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
  toast('Deleted', 'success');
  notificationsPage();
}
window.deleteNotif = deleteNotif;

async function genBirthdayNotifs() {
  try {
    const { data } = await api('/notifications/generate-birthdays', { method: 'POST' });
    toast(`${data.created} birthday notification(s) generated`, 'success');
    notificationsPage();
  } catch (err) { toast(err.message, 'error'); }
}
window.genBirthdayNotifs = genBirthdayNotifs;

// ── 27. TEACHER PORTAL MANAGEMENT ────────────────────────────────
async function teacherPortalPage() {
  const { data: teachers } = await api('/teachers?limit=100');
  const area = document.getElementById('contentArea');

  area.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700">👩‍🏫 Teacher Portal Accounts</h2>
    </div>
    <div class="alert alert-info" style="margin-bottom:16px">
      <span class="material-icons-round">info</span>
      Set a password to activate a teacher's portal access. <strong>Teachers cannot change their own password</strong> — only admin can reset it here.
    </div>
    <div class="card">
      ${!teachers.length
        ? `<div class="empty-state" style="padding:32px"><span class="material-icons-round empty-icon">school</span><p class="empty-title">No teachers found</p></div>`
        : teachers.map(t => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--bg)">
            ${t.photoUrl ? `<img class="thumb" src="${esc(t.photoUrl)}" alt="">` : `<div class="thumb" style="background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:16px">👩‍🏫</div>`}
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px">${esc(t.name)}</div>
              <div style="font-size:11px;color:var(--txt-sm)">${esc(t.employeeId||'')} · ${esc(t.designation||t.qualification||'')}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-secondary" style="font-size:11px;padding:5px 10px" onclick="setTeacherPassword('${t._id}','${esc(t.name)}')">
                <span class="material-icons-round" style="font-size:13px">lock</span>Set Password
              </button>
              <button class="btn btn-secondary" style="font-size:11px;padding:5px 10px;color:var(--err)" onclick="revokeTeacherAccess('${t._id}','${esc(t.name)}')">
                <span class="material-icons-round" style="font-size:13px">lock_open</span>Revoke
              </button>
            </div>
          </div>`).join('')}
    </div>`;
}

async function setTeacherPassword(id, name) {
  const pw = prompt(`Set temporary password for ${name}:\n(min 6 characters)`);
  if (!pw) return;
  if (pw.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
  try {
    await api(`/teacher-admin/${id}/portal-access`, { method: 'PUT', body: JSON.stringify({ password: pw }) });
    toast(`Portal access set for ${name}. Share the temporary password securely.`, 'success');
  } catch (err) { toast(err.message, 'error'); }
}
window.setTeacherPassword = setTeacherPassword;

async function revokeTeacherAccess(id, name) {
  if (!confirm(`Revoke portal access for ${name}? They will not be able to log in.`)) return;
  try {
    await api(`/teacher-admin/${id}/portal-access`, { method: 'DELETE' });
    toast(`Access revoked for ${name}`, 'success');
  } catch (err) { toast(err.message, 'error'); }
}
window.revokeTeacherAccess = revokeTeacherAccess;

// ── 28. LEAVE REQUESTS PAGE ───────────────────────────────────────
async function leaveRequestsPage() {
  const area = document.getElementById('contentArea');
  try {
    const { data: items } = await api('/teacher-admin/leave-requests');

    const pendingItems = items.filter(i => i.status === 'Pending');

    area.innerHTML = `
      <div style="margin-bottom:16px">
        <h2 style="font-size:17px;font-weight:700">📅 Leave Requests</h2>
        ${pendingItems.length ? `<span style="font-size:12px;color:var(--amber)">${pendingItems.length} pending approval</span>` : ''}
      </div>
      <div class="card">
        ${!items.length
          ? `<div class="empty-state" style="padding:32px"><span class="material-icons-round empty-icon">event_busy</span><p class="empty-title">No leave requests</p></div>`
          : items.map(r => `
            <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid var(--bg)">
              <span class="material-icons-round" style="color:var(--txt-sm);margin-top:2px">event_busy</span>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:13px">${esc(r.teacher?.name||'—')}</div>
                <div style="font-size:12px;color:var(--txt-sm)">${fmtDate(r.date)}${r.endDate && r.endDate!==r.date?' – '+fmtDate(r.endDate):''} · ${esc(r.type)}</div>
                ${r.reason ? `<div style="font-size:12px;color:var(--txt-sm);margin-top:2px">${esc(r.reason)}</div>` : ''}
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
                <span class="badge badge-${(r.status||'').toLowerCase()}">${esc(r.status)}</span>
                ${r.status === 'Pending' ? `
                  <div style="display:flex;gap:4px;margin-top:4px">
                    <button class="btn btn-secondary" style="font-size:11px;padding:4px 8px;background:var(--green);color:#fff" onclick="handleLeave('${r._id}','Approved')">Approve</button>
                    <button class="btn btn-secondary" style="font-size:11px;padding:4px 8px;color:var(--err)" onclick="handleLeave('${r._id}','Rejected')">Reject</button>
                  </div>` : ''}
              </div>
            </div>`).join('')}
      </div>`;
  } catch (err) {
    area.innerHTML = `<div class="form-card"><div class="alert alert-error">${esc(err.message)}</div></div>`;
  }
}

async function handleLeave(id, status) {
  try {
    await api(`/teacher-admin/leave-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast(`Leave request ${status.toLowerCase()}`, 'success');
    leaveRequestsPage();
  } catch (err) { toast(err.message, 'error'); }
}
window.handleLeave = handleLeave;

// ── 29. TEACHER CHECK-IN MONITOR ────────────────────────────────
async function teacherCheckInPage() {
  const area = document.getElementById('contentArea');
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: items } = await api(`/teacher-checkin/admin/list?date=${today}`);

    area.innerHTML = `
      <div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <h2 style="font-size:17px;font-weight:700">🔍 Check-In Monitor</h2>
          <div style="font-size:12px;color:var(--txt-sm)">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="date" id="checkinDate" value="${today}" style="padding:7px 10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px">
          <button class="btn btn-secondary" onclick="loadCheckIns()">
            <span class="material-icons-round" style="font-size:15px">refresh</span>
          </button>
        </div>
      </div>

      <div class="stats-grid" style="margin-bottom:16px">
        ${[
          ['Total Self-Checkins', items.length, 'fingerprint', 'stat-blue'],
          ['Present / On Time', items.filter(i=>!i.lateEntry).length, 'check_circle', 'stat-green'],
          ['Late Entries', items.filter(i=>i.lateEntry).length, 'watch_later', 'stat-amber'],
          ['Checked Out', items.filter(i=>i.checkOutAt).length, 'logout', 'stat-teal']
        ].map(([label,val,icon,cls]) => `
          <div class="stat-card ${cls}">
            <div><div class="stat-label">${label}</div><div class="stat-value">${val}</div></div>
            <div class="stat-icon"><span class="material-icons-round">${icon}</span></div>
          </div>`).join('')}
      </div>

      <div class="card" id="checkInTable">
        ${!items.length
          ? `<div class="empty-state" style="padding:32px"><span class="material-icons-round empty-icon">fingerprint</span><p class="empty-title">No self check-ins today</p><p class="empty-sub">Teachers who check in via the Teacher Portal will appear here.</p></div>`
          : `<div class="table-wrap"><table>
              <thead><tr><th>Teacher</th><th>Check-In</th><th>Check-Out</th><th>Hours</th><th>Status</th><th>Device / IP</th></tr></thead>
              <tbody>${items.map(r => `
                <tr>
                  <td>
                    <div class="td-main">${esc(r.teacher?.name||'—')}</div>
                    <div class="td-sub">${esc(r.teacher?.employeeId||'')}</div>
                  </td>
                  <td>
                    <div class="td-main">${r.checkIn || fmtTime(r.checkInAt) || '—'}</div>
                    ${r.lateEntry ? `<div class="td-sub" style="color:var(--amber)">Late entry</div>` : ''}
                  </td>
                  <td>
                    <div class="td-main">${r.checkOut || fmtTime(r.checkOutAt) || '—'}</div>
                    ${r.earlyExit ? `<div class="td-sub" style="color:var(--amber)">Early exit</div>` : ''}
                  </td>
                  <td>${r.workingHours != null ? r.workingHours+'h' : '—'}</td>
                  <td><span class="badge badge-${(r.status||'').toLowerCase()}">${esc(r.status)}</span></td>
                  <td style="font-size:11px;color:var(--txt-sm)">
                    <div>${esc((r.deviceInfo||'').slice(0,40))}</div>
                    <div>${esc(r.ipAddress||'')}</div>
                    ${r.gpsLat ? `<div>📍 ${r.gpsLat.toFixed(4)},${r.gpsLng?.toFixed(4)}</div>` : ''}
                  </td>
                </tr>`).join('')}
              </tbody>
             </table></div>`}
      </div>`;

    document.getElementById('checkinDate')?.addEventListener('change', loadCheckIns);
  } catch (err) {
    area.innerHTML = `<div class="form-card"><div class="alert alert-error">${esc(err.message)}</div></div>`;
  }
}

async function loadCheckIns() {
  const dateEl = document.getElementById('checkinDate');
  const date   = dateEl?.value || new Date().toISOString().split('T')[0];
  try {
    const { data: items } = await api(`/teacher-checkin/admin/list?date=${date}`);
    const tableEl = document.getElementById('checkInTable');
    if (!tableEl) return;
    tableEl.innerHTML = !items.length
      ? `<div class="empty-state" style="padding:32px"><span class="material-icons-round empty-icon">fingerprint</span><p class="empty-title">No check-ins for this date</p></div>`
      : `<div class="table-wrap"><table>
          <thead><tr><th>Teacher</th><th>Check-In</th><th>Check-Out</th><th>Hours</th><th>Status</th></tr></thead>
          <tbody>${items.map(r => `
            <tr>
              <td><div class="td-main">${esc(r.teacher?.name||'—')}</div></td>
              <td>${r.checkIn||fmtTime(r.checkInAt)||'—'}${r.lateEntry?` <span style="color:var(--amber);font-size:11px">Late</span>`:''}</td>
              <td>${r.checkOut||fmtTime(r.checkOutAt)||'—'}</td>
              <td>${r.workingHours!=null?r.workingHours+'h':'—'}</td>
              <td><span class="badge badge-${(r.status||'').toLowerCase()}">${esc(r.status)}</span></td>
            </tr>`).join('')}
          </tbody></table></div>`;
  } catch (err) { toast(err.message, 'error'); }
}
window.loadCheckIns = loadCheckIns;

/* ══════════════════════════════════════════════════════════════════
   LOGIN HISTORY
   ══════════════════════════════════════════════════════════════════ */
async function loginHistoryPage(page = 1) {
  const area = document.getElementById('contentArea');
  const portal = document.getElementById('lhPortalFilter')?.value || '';
  try {
    const qs = new URLSearchParams({ page, limit: 25, ...(portal ? { portal } : {}) });
    const { data: items, pagination } = await api(`/security/login-history?${qs}`);

    area.innerHTML = `
      <div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <h2 style="font-size:17px;font-weight:700">Login History</h2>
        <select id="lhPortalFilter" style="padding:7px 10px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px">
          <option value="">All Portals</option>
          <option value="admin"  ${portal==='admin'?'selected':''}>Admin</option>
          <option value="teacher"${portal==='teacher'?'selected':''}>Teacher</option>
          <option value="parent" ${portal==='parent'?'selected':''}>Parent</option>
        </select>
      </div>
      <div class="card">
        ${!items.length
          ? `<div class="empty-state" style="padding:32px"><span class="material-icons-round empty-icon">history</span><p class="empty-title">No login attempts recorded yet</p></div>`
          : `<div class="table-wrap"><table>
              <thead><tr><th>When</th><th>Portal</th><th>Identifier</th><th>Result</th><th>Reason</th><th>IP</th></tr></thead>
              <tbody>${items.map(r => `
                <tr>
                  <td>${new Date(r.createdAt).toLocaleString('en-IN')}</td>
                  <td><span class="badge badge-default">${esc(r.portal)}</span></td>
                  <td>${esc(r.identifier || '')}</td>
                  <td><span class="badge ${r.success ? 'badge-approved' : 'badge-rejected'}">${r.success ? 'Success' : 'Failed'}</span></td>
                  <td style="font-size:12px;color:var(--txt-sm)">${esc(r.reason || '')}</td>
                  <td style="font-size:12px;color:var(--txt-sm)">${esc(r.ipAddress || '')}</td>
                </tr>`).join('')}
              </tbody></table></div>`}
        ${pagination ? `<div style="display:flex;justify-content:center;gap:8px;padding:14px">
          <button class="btn btn-secondary" ${pagination.page<=1?'disabled':''} onclick="loginHistoryPage(${pagination.page-1})">Prev</button>
          <span style="align-self:center;font-size:12px;color:var(--txt-sm)">Page ${pagination.page} of ${pagination.pages||1}</span>
          <button class="btn btn-secondary" ${pagination.page>=(pagination.pages||1)?'disabled':''} onclick="loginHistoryPage(${pagination.page+1})">Next</button>
        </div>` : ''}
      </div>`;

    document.getElementById('lhPortalFilter')?.addEventListener('change', () => loginHistoryPage(1));
  } catch (err) {
    area.innerHTML = `<div class="form-card"><div class="alert alert-error">${esc(err.message)}</div></div>`;
  }
}
window.loginHistoryPage = loginHistoryPage;

/* ══════════════════════════════════════════════════════════════════
   AUDIT LOGS
   ══════════════════════════════════════════════════════════════════ */
async function auditLogsPage(page = 1) {
  const area = document.getElementById('contentArea');
  try {
    const qs = new URLSearchParams({ page, limit: 25 });
    const { data: items, pagination } = await api(`/security/audit-logs?${qs}`);

    area.innerHTML = `
      <h2 style="font-size:17px;font-weight:700;margin-bottom:16px">Audit Logs</h2>
      <div class="card">
        ${!items.length
          ? `<div class="empty-state" style="padding:32px"><span class="material-icons-round empty-icon">fact_check</span><p class="empty-title">No admin actions recorded yet</p></div>`
          : `<div class="table-wrap"><table>
              <thead><tr><th>When</th><th>Admin</th><th>Method</th><th>Path</th><th>Status</th><th>IP</th></tr></thead>
              <tbody>${items.map(r => `
                <tr>
                  <td>${new Date(r.createdAt).toLocaleString('en-IN')}</td>
                  <td>${esc(r.adminName || '—')}</td>
                  <td><span class="badge badge-default">${esc(r.method)}</span></td>
                  <td style="font-size:12px;font-family:monospace">${esc(r.path)}</td>
                  <td><span class="badge ${r.statusCode < 400 ? 'badge-approved' : 'badge-rejected'}">${r.statusCode}</span></td>
                  <td style="font-size:12px;color:var(--txt-sm)">${esc(r.ipAddress || '')}</td>
                </tr>`).join('')}
              </tbody></table></div>`}
        ${pagination ? `<div style="display:flex;justify-content:center;gap:8px;padding:14px">
          <button class="btn btn-secondary" ${pagination.page<=1?'disabled':''} onclick="auditLogsPage(${pagination.page-1})">Prev</button>
          <span style="align-self:center;font-size:12px;color:var(--txt-sm)">Page ${pagination.page} of ${pagination.pages||1}</span>
          <button class="btn btn-secondary" ${pagination.page>=(pagination.pages||1)?'disabled':''} onclick="auditLogsPage(${pagination.page+1})">Next</button>
        </div>` : ''}
      </div>`;
  } catch (err) {
    area.innerHTML = `<div class="form-card"><div class="alert alert-error">${esc(err.message)}</div></div>`;
  }
}
window.auditLogsPage = auditLogsPage;

// ── 30. PARENT PORTAL ADMIN ───────────────────────────────────────
async function parentPortalAdminPage() {
  const area = document.getElementById('contentArea');
  try {
    const { data: parents } = await api('/admin-parent-portal');
    const active   = parents.filter(p => p.isPortalActive).length;
    const inactive = parents.length - active;

    area.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
        <div>
          <h2 style="font-size:17px;font-weight:700">👨‍👩‍👧 Parent Portal Accounts</h2>
          <div style="font-size:12px;color:var(--txt-sm)">${active} active · ${inactive} not activated</div>
        </div>
        <div style="display:flex;gap:8px">
          <input type="search" id="ppSearch" placeholder="Search parents…" style="padding:7px 12px;border:1.5px solid var(--bd);border-radius:8px;font-size:13px;width:200px" oninput="filterPortalParents(this.value)">
        </div>
      </div>

      <div class="alert alert-info" style="margin-bottom:16px;display:flex;align-items:center;gap:8px">
        <span class="material-icons-round">info</span>
        Set a portal email and password to activate a parent's portal access. <strong>Parents cannot change their own password</strong> — only admin can reset it here.
      </div>

      <div class="card" id="ppList">
        ${renderPortalParentList(parents)}
      </div>`;

    window._ppParents = parents;
  } catch (err) {
    area.innerHTML = `<div class="form-card"><div class="alert alert-error">${esc(err.message)}</div></div>`;
  }
}

function renderPortalParentList(parents) {
  if (!parents.length) return `<div class="empty-state" style="padding:32px"><span class="material-icons-round empty-icon">family_restroom</span><p class="empty-title">No parents found</p></div>`;
  return parents.map(p => {
    const name     = esc(p.fatherName || p.motherName || 'Unknown');
    const children = (p.students || []).map(s => esc(s.studentName)).join(', ') || '—';
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--bg)" data-ppname="${(p.fatherName||p.motherName||'').toLowerCase()}" data-ppemail="${(p.portalEmail||'').toLowerCase()}">
      <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#f97316,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">
        ${(p.fatherName||p.motherName||'P').charAt(0).toUpperCase()}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px">${name}</div>
        <div style="font-size:11px;color:var(--txt-sm)">${esc(p.fatherPhone||p.motherPhone||'')} · Children: ${children}</div>
        ${p.portalEmail ? `<div style="font-size:11px;color:var(--txt-sm);font-family:monospace">📧 ${esc(p.portalEmail)}</div>` : ''}
        ${p.isPortalActive && p.mustChangePassword ? `<div style="font-size:10px;color:var(--txt-sm)">🔑 Using a temporary password — use "Reset" to set a new one if it needs to be re-shared</div>` : ''}
        ${p.autoGenerated ? `<div style="font-size:10px;color:var(--ok,#16a34a)">✨ Auto-generated at enrollment</div>` : ''}
        ${p.lastLoginAt ? `<div style="font-size:10px;color:var(--txt-sm)">Last login: ${fmtDate(p.lastLoginAt)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        <span class="badge ${p.isPortalActive ? 'badge-active' : 'badge-inactive'}">${p.isPortalActive ? 'Active' : 'Not Activated'}</span>
        <div style="display:flex;gap:4px;margin-top:4px">
          <button class="btn btn-secondary" style="font-size:11px;padding:4px 8px" onclick="activateParentPortal('${p._id}','${name}')">
            <span class="material-icons-round" style="font-size:13px">key</span>Set Access
          </button>
          ${p.isPortalActive ? `
          <button class="btn btn-secondary" style="font-size:11px;padding:4px 8px" onclick="resetParentPassword('${p._id}','${name}')">
            <span class="material-icons-round" style="font-size:13px">lock_reset</span>Reset
          </button>
          <button class="btn btn-secondary" style="font-size:11px;padding:4px 8px;color:var(--err)" onclick="deactivateParentPortal('${p._id}','${name}')">
            <span class="material-icons-round" style="font-size:13px">block</span>Revoke
          </button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterPortalParents(q) {
  const rows = document.querySelectorAll('#ppList [data-ppname]');
  const lq   = q.toLowerCase();
  rows.forEach(r => {
    const match = r.dataset.ppname.includes(lq) || r.dataset.ppemail.includes(lq);
    r.style.display = match ? '' : 'none';
  });
}
window.filterPortalParents = filterPortalParents;

async function activateParentPortal(id, name) {
  const email = prompt(`Set portal email for ${name}:`);
  if (!email) return;
  const pw = prompt(`Set temporary password for ${name}:\n(min 6 characters)`);
  if (!pw) return;
  if (pw.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
  try {
    await api(`/admin-parent-portal/${id}/activate`, { method: 'POST', body: JSON.stringify({ portalEmail: email, password: pw }) });
    toast(`Portal access set for ${name}. Share credentials securely.`, 'success');
    parentPortalAdminPage();
  } catch (err) { toast(err.message, 'error'); }
}
window.activateParentPortal = activateParentPortal;

async function resetParentPassword(id, name) {
  const pw = prompt(`Set new temporary password for ${name}:\n(min 6 characters)`);
  if (!pw) return;
  if (pw.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
  try {
    await api(`/admin-parent-portal/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword: pw }) });
    toast(`Password reset for ${name}. Share the new password securely.`, 'success');
  } catch (err) { toast(err.message, 'error'); }
}
window.resetParentPassword = resetParentPassword;

async function deactivateParentPortal(id, name) {
  if (!confirm(`Revoke portal access for ${name}? They will not be able to log in.`)) return;
  try {
    await api(`/admin-parent-portal/${id}/deactivate`, { method: 'POST' });
    toast(`Portal access revoked for ${name}`, 'success');
    parentPortalAdminPage();
  } catch (err) { toast(err.message, 'error'); }
}
window.deactivateParentPortal = deactivateParentPortal;

// ── 31. STORAGE MONITOR ───────────────────────────────────────────
async function storageMonitorPage() {
  const area = document.getElementById('contentArea');
  area.innerHTML = '<div class="loader-center"><span class="spin spin-lg"></span></div>';
  try {
    const { data: d } = await api('/storage/stats');

    const progBar = (pct, level) => {
      const colors = { ok:'var(--green)', caution:'var(--teal)', warning:'var(--amber)', danger:'var(--err)', critical:'#9b2c2c' };
      const color  = colors[level] || 'var(--green)';
      return `<div style="height:10px;background:var(--bg);border-radius:6px;overflow:hidden;margin:6px 0">
        <div style="width:${Math.min(100,pct)}%;height:100%;border-radius:6px;background:${color};transition:width .5s"></div>
      </div>`;
    };

    const levelBadge = l => {
      const map = { ok:'badge-active', caution:'badge-approved', warning:'badge-pending', danger:'badge-absent', critical:'badge-absent' };
      const lbl = { ok:'Good', caution:'Caution', warning:'Warning', danger:'Danger', critical:'Critical' };
      return `<span class="badge ${map[l]||'badge-default'}">${lbl[l]||l}</span>`;
    };

    const mg  = d.mongo      || {};
    const cl  = d.cloudinary || {};
    const cnt = d.counts     || {};
    const cap = d.capacity   || {};

    const recHtml = (d.recommendations || []).map(r => `
      <div class="alert alert-${r.level==='danger'?'error':r.level==='warning'?'warning':'info'}" style="margin-bottom:8px;display:flex;gap:8px;align-items:center">
        <span class="material-icons-round">${r.level==='danger'?'error':r.level==='warning'?'warning':'info'}</span>
        ${esc(r.text)}
      </div>`).join('');

    area.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:16px">
        <h2 style="font-size:17px;font-weight:700">💾 Storage Monitor</h2>
        <button class="btn btn-secondary" onclick="storageMonitorPage()"><span class="material-icons-round" style="font-size:15px">refresh</span>Refresh</button>
      </div>

      ${recHtml ? `<div style="margin-bottom:16px">${recHtml}</div>` : ''}

      <div class="row-2" style="margin-bottom:16px">
        <!-- MongoDB -->
        <div class="card">
          <div class="card-head">
            <span class="card-title">🗄️ MongoDB Atlas</span>
            ${mg.level ? levelBadge(mg.level) : ''}
          </div>
          <div class="card-body">
            ${mg.error ? `<div class="alert alert-error">${esc(mg.error)}</div>` : `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div><div style="font-size:22px;font-weight:700">${mg.usedMB}MB</div><div style="font-size:11px;color:var(--txt-sm)">Used</div></div>
              <div><div style="font-size:22px;font-weight:700">${mg.freeMB}MB</div><div style="font-size:11px;color:var(--txt-sm)">Free</div></div>
            </div>
            ${progBar(mg.usedPct, mg.level)}
            <div style="font-size:12px;color:var(--txt-sm);margin-top:4px">${mg.usedPct}% of ${mg.totalMB}MB free tier used</div>
            <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px">
              <div style="background:var(--bg);border-radius:8px;padding:8px;text-align:center">
                <div style="font-weight:700">${mg.objects||0}</div><div style="color:var(--txt-sm)">Documents</div>
              </div>
              <div style="background:var(--bg);border-radius:8px;padding:8px;text-align:center">
                <div style="font-weight:700">${mg.collections||0}</div><div style="color:var(--txt-sm)">Collections</div>
              </div>
              <div style="background:var(--bg);border-radius:8px;padding:8px;text-align:center">
                <div style="font-weight:700">${mg.indexes||0}</div><div style="color:var(--txt-sm)">Indexes</div>
              </div>
            </div>`}
          </div>
        </div>

        <!-- Cloudinary -->
        <div class="card">
          <div class="card-head">
            <span class="card-title">☁️ Cloudinary</span>
            ${cl.level ? levelBadge(cl.level) : ''}
          </div>
          <div class="card-body">
            ${cl.error ? `<div class="alert alert-warning" style="font-size:12px"><span class="material-icons-round" style="font-size:14px">warning</span> ${esc(cl.error)}</div>` : `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div><div style="font-size:22px;font-weight:700">${cl.usedMB}MB</div><div style="font-size:11px;color:var(--txt-sm)">Used</div></div>
              <div><div style="font-size:22px;font-weight:700">${cl.freeMB}MB</div><div style="font-size:11px;color:var(--txt-sm)">Free</div></div>
            </div>
            ${progBar(cl.usedPct, cl.level)}
            <div style="font-size:12px;color:var(--txt-sm);margin-top:4px">${cl.usedPct}% of ${cl.totalMB}MB free tier used</div>
            <div style="margin-top:12px;font-size:12px">
              <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bg)"><span style="color:var(--txt-sm)">Total Resources</span><strong>${cl.totalResources||0}</strong></div>
              <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bg)"><span style="color:var(--txt-sm)">Plan</span><strong>${esc(cl.plan||'Free')}</strong></div>
              <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:var(--txt-sm)">Credits Used</span><strong>${cl.creditsUsed||0}</strong></div>
            </div>`}
          </div>
        </div>
      </div>

      <!-- Record Counts -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-head"><span class="card-title">📊 Record Counts</span></div>
        <div class="card-body">
          <div class="stats-grid">
            ${[
              ['Students',    cnt.totalStudents,    'child_care',    'stat-blue'],
              ['Teachers',    cnt.totalTeachers,    'school',        'stat-green'],
              ['Parents',     cnt.totalParents,     'family_restroom','stat-purple'],
              ['Admissions',  cnt.totalAdmissions,  'assignment',    'stat-amber'],
              ['Gallery',     cnt.totalGallery,     'photo_library', 'stat-teal'],
              ['Student Docs',cnt.totalStudentDocs,'description',   'stat-orange'],
              ['Attendance',  cnt.totalAttendance,  'how_to_reg',    'stat-red'],
              ['Fee Records', cnt.totalFeePayments, 'payments',      'stat-blue']
            ].map(([l,v,ic,c]) => `
              <div class="stat-card ${c}" style="padding:12px 16px">
                <div><div class="stat-label">${l}</div><div class="stat-value">${v||0}</div></div>
                <div class="stat-icon"><span class="material-icons-round">${ic}</span></div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Capacity Estimator -->
      ${cap.studentsRemaining !== undefined ? `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head"><span class="card-title">📈 Capacity Estimator</span><span style="font-size:12px;color:var(--txt-sm)">${esc(cap.note||'')}</span></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">
            ${[
              ['Students Remaining',   cap.studentsRemaining,   'child_care',    '#dbeafe','#1e40af'],
              ['Teachers Remaining',   cap.teachersRemaining,   'school',        '#dcfce7','#166534'],
              ['Attendance Records',   cap.attendanceRemaining, 'how_to_reg',    '#fef9c3','#854d0e'],
              ['Fee Records',          cap.feeRecordsRemaining, 'payments',      '#f3e8ff','#7e22ce'],
              ['Months Left (est.)',   cap.estimatedMonthsLeft === 999 ? '∞' : cap.estimatedMonthsLeft, 'schedule','#ffedd5','#9a3412']
            ].map(([l,v,ic,bg,c]) => `
              <div style="background:${bg};border-radius:10px;padding:14px;text-align:center">
                <span class="material-icons-round" style="color:${c};font-size:22px;margin-bottom:4px;display:block">${ic}</span>
                <div style="font-size:20px;font-weight:700;color:${c}">${typeof v === 'number' ? v.toLocaleString('en-IN') : v}</div>
                <div style="font-size:11px;color:var(--txt-sm);margin-top:3px">${l}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>` : ''}

      <!-- Collections breakdown -->
      ${d.collections && d.collections.length ? `
      <div class="card">
        <div class="card-head"><span class="card-title">🗂️ Collections Breakdown</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Collection</th><th>Documents</th><th>Storage</th><th>Avg Size</th></tr></thead>
            <tbody>
              ${d.collections.map(c => `
                <tr>
                  <td><div class="td-main">${esc(c.name)}</div></td>
                  <td>${c.count.toLocaleString('en-IN')}</td>
                  <td>${(c.storageBytes/1024).toFixed(1)} KB</td>
                  <td>${c.avgObjBytes ? (c.avgObjBytes/1024).toFixed(2)+' KB' : '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      <div style="font-size:11px;color:var(--txt-sm);margin-top:12px;text-align:right">Last updated: ${new Date(d.timestamp||Date.now()).toLocaleString('en-IN')}</div>`;
  } catch (err) {
    area.innerHTML = `<div class="form-card"><div class="alert alert-error"><span class="material-icons-round">error</span>${esc(err.message)}</div></div>`;
  }
}

// ── 32. ARCHIVE MANAGER ───────────────────────────────────────────
async function archivePage() {
  const area = document.getElementById('contentArea');
  try {
    const { data: archives } = await api('/archive');

    area.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
        <div>
          <h2 style="font-size:17px;font-weight:700">🗄️ Archive Manager</h2>
          <div style="font-size:12px;color:var(--txt-sm)">${archives.length} archive${archives.length===1?'':'s'} created</div>
        </div>
        <button class="btn btn-primary" onclick="showArchiveForm()">
          <span class="material-icons-round" style="font-size:15px">add</span>New Archive
        </button>
      </div>

      <div class="alert alert-warning" style="margin-bottom:16px;display:flex;align-items:center;gap:8px">
        <span class="material-icons-round">warning</span>
        Archive exports data for download. Deletion from database is irreversible — always verify the export first.
      </div>

      <div id="archiveFormWrap" style="display:none" class="card" style="margin-bottom:16px">
        <div class="card-head"><span class="card-title">Create Archive</span></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div class="form-group"><label class="form-label">Archive Name *</label><input type="text" id="archName" class="form-input" placeholder="e.g. Session 2024-25 Attendance"></div>
            <div class="form-group"><label class="form-label">Collection *</label>
              <select id="archColl" class="form-input">
                <option value="">Select collection</option>
                <option value="attendance">Student Attendance</option>
                <option value="teacher_attendance">Teacher Attendance</option>
                <option value="fees">Fee Payments</option>
                <option value="gallery">Gallery Images</option>
                <option value="students">Students (caution!)</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Export Format</label>
              <select id="archFmt" class="form-input">
                <option value="json">JSON</option>
                <option value="excel">Excel (.xlsx)</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Archive Before Date (optional)</label><input type="date" id="archBefore" class="form-input"></div>
          </div>
          <div class="form-group" style="margin-top:8px"><label class="form-label">Description</label><input type="text" id="archDesc" class="form-input" placeholder="Optional description"></div>
          <div style="display:flex;gap:10px;margin-top:12px">
            <button class="btn btn-primary" onclick="runArchive()"><span class="material-icons-round" style="font-size:15px">download</span>Export Archive</button>
            <button class="btn btn-secondary" onclick="document.getElementById('archiveFormWrap').style.display='none'">Cancel</button>
          </div>
        </div>
      </div>

      <div class="card">
        ${!archives.length
          ? `<div class="empty-state" style="padding:32px"><span class="material-icons-round empty-icon">archive</span><p class="empty-title">No archives yet</p><p class="empty-sub">Create your first archive to back up and export data.</p></div>`
          : archives.map(a => `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid var(--bg)">
            <span class="material-icons-round" style="color:${a.status==='Deleted'?'var(--err)':a.status==='Ready'?'var(--green)':'var(--amber)'};margin-top:2px">
              ${a.status==='Deleted'?'delete':'archive'}
            </span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px">${esc(a.name)}</div>
              <div style="font-size:11px;color:var(--txt-sm);margin-top:2px">
                ${a.collections?.map(c=>esc(c.name)+' ('+c.count+')')?.join(', ')||''}
                · ${fmtDate(a.archivedAt)}
                ${a.exportSizeKB ? '· '+a.exportSizeKB+'KB' : ''}
                ${a.archivedBy ? '· by '+esc(a.archivedBy.name||'') : ''}
              </div>
              ${a.deletedFromDB ? `<div style="font-size:10px;color:var(--err);margin-top:2px">Records deleted from database ${fmtDate(a.deletedAt)}</div>` : ''}
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <span class="badge badge-${a.status==='Ready'?'approved':a.status==='Deleted'?'inactive':'pending'}">${esc(a.status)}</span>
              ${!a.deletedFromDB && a.status==='Ready' ? `
              <button class="btn btn-secondary" style="font-size:11px;padding:4px 8px;color:var(--err);margin-left:4px" onclick="purgeArchive('${a._id}','${esc(a.name)}')">
                <span class="material-icons-round" style="font-size:13px">delete_forever</span>Delete Records
              </button>` : ''}
            </div>
          </div>`).join('')}
      </div>`;
  } catch (err) {
    area.innerHTML = `<div class="form-card"><div class="alert alert-error">${esc(err.message)}</div></div>`;
  }
}

function showArchiveForm() {
  const el = document.getElementById('archiveFormWrap');
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}
window.showArchiveForm = showArchiveForm;

async function runArchive() {
  const name   = document.getElementById('archName')?.value?.trim();
  const coll   = document.getElementById('archColl')?.value;
  const fmt    = document.getElementById('archFmt')?.value || 'json';
  const before = document.getElementById('archBefore')?.value;
  const desc   = document.getElementById('archDesc')?.value?.trim();

  if (!name || !coll) { toast('Archive name and collection are required', 'error'); return; }

  const body = { name, collectionName: coll, description: desc, formats: [fmt] };
  if (before) body.filter = { before };

  try {
    toast('Creating archive… this may take a moment', 'info');
    const res = await fetch(API + '/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: `Bearer ${S.token}` } : {}) },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.message || 'Archive failed');
    }
    // Trigger download
    const blob  = await res.blob();
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    const cd    = res.headers.get('Content-Disposition') || '';
    const match = cd.match(/filename="([^"]+)"/);
    a.href     = url;
    a.download = match ? match[1] : `archive-${coll}-${Date.now()}.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Archive exported successfully!', 'success');
    setTimeout(archivePage, 1000);
  } catch (err) { toast(err.message, 'error'); }
}
window.runArchive = runArchive;

async function purgeArchive(id, name) {
  const confirmed = prompt(`Type "DELETE" to permanently delete archived records for "${name}" from the database.\n\nThis cannot be undone.`);
  if (confirmed !== 'DELETE') { toast('Deletion cancelled', 'info'); return; }
  try {
    const { data } = await api(`/archive/${id}/purge`, { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE' }) });
    toast(`Deleted ${data.deletedCount} records and ${data.cloudDeleted} Cloudinary files`, 'success');
    archivePage();
  } catch (err) { toast(err.message, 'error'); }
}
window.purgeArchive = purgeArchive;

// ── 33. BACKUP & EXPORT PAGE ──────────────────────────────────────
async function backupPage() {
  const area = document.getElementById('contentArea');

  area.innerHTML = `
    <div style="margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700">💾 Backup & Export</h2>
      <div style="font-size:12px;color:var(--txt-sm)">One-click data exports for backup and reporting</div>
    </div>

    <div class="alert alert-info" style="margin-bottom:16px;display:flex;align-items:center;gap:8px">
      <span class="material-icons-round">info</span>
      These exports generate CSV/Excel files from live data. For archiving and deletion, use the Archive Manager.
    </div>

    <div class="row-2">
      <div class="card">
        <div class="card-head"><span class="card-title">📋 Quick Reports</span></div>
        <div class="card-body" style="display:grid;gap:10px">
          ${[
            ['Students List',     '/reports/students',     'child_care',    'All active students with parent & contact details'],
            ['Admissions List',   '/reports/admissions',   'assignment',    'All admission applications with status'],
            ['Fee Collection',    '/reports/fees',         'payments',      'All fee payment records'],
            ['Teachers List',     '/reports/teachers',     'school',        'All active teacher records']
          ].map(([lbl, ep, ic, desc]) => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg);border-radius:10px">
              <span class="material-icons-round" style="color:var(--blue)">${ic}</span>
              <div style="flex:1">
                <div style="font-weight:600;font-size:13px">${lbl}</div>
                <div style="font-size:11px;color:var(--txt-sm)">${desc}</div>
              </div>
              <button class="btn btn-secondary" style="font-size:12px;padding:6px 12px" onclick="downloadReport('${ep}','${lbl.toLowerCase().replace(/ /g,'-')}')">
                <span class="material-icons-round" style="font-size:14px">download</span>CSV
              </button>
            </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><span class="card-title">📅 Attendance Report</span></div>
        <div class="card-body">
          <div class="form-group" style="margin-bottom:10px">
            <label class="form-label">From Date</label>
            <input type="date" id="attFrom" class="form-input" value="${new Date(Date.now()-30*86400000).toISOString().split('T')[0]}">
          </div>
          <div class="form-group" style="margin-bottom:10px">
            <label class="form-label">To Date</label>
            <input type="date" id="attTo" class="form-input" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Program (optional)</label>
            <select id="attProg" class="form-input">
              <option value="">All Programs</option>
              ${['Play Group','Nursery','LKG','UKG'].map(p=>`<option>${p}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary" onclick="downloadAttReport()">
            <span class="material-icons-round" style="font-size:15px">download</span>Download Attendance CSV
          </button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-head"><span class="card-title">🗃️ Full Data Export (JSON)</span></div>
      <div class="card-body">
        <p style="font-size:13px;color:var(--txt-sm);margin-bottom:14px">Export individual collections as JSON archives for full backup. Use Archive Manager for scheduled backups with deletion support.</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          ${[
            ['Students',    'students',           'child_care'],
            ['Teachers',    'teachers',           'school'],
            ['Attendance',  'attendance',         'how_to_reg'],
            ['Fee Records', 'fees',               'payments'],
            ['Gallery',     'gallery',            'photo_library']
          ].map(([l,c,ic]) => `
            <button class="btn btn-secondary" onclick="quickArchiveExport('${c}','${l}')">
              <span class="material-icons-round" style="font-size:14px">${ic}</span>${l}
            </button>`).join('')}
        </div>
      </div>
    </div>`;
}

async function downloadReport(endpoint, filename) {
  try {
    const res = await fetch(API + endpoint, {
      headers: { ...(S.token ? { Authorization: `Bearer ${S.token}` } : {}) },
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `${filename}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast('Download started', 'success');
  } catch (err) { toast(err.message, 'error'); }
}
window.downloadReport = downloadReport;

async function downloadAttReport() {
  const from = document.getElementById('attFrom')?.value;
  const to   = document.getElementById('attTo')?.value;
  const prog = document.getElementById('attProg')?.value;
  if (!from || !to) { toast('Please select both from and to dates', 'error'); return; }
  let ep = `/reports/attendance?from=${from}&to=${to}`;
  if (prog) ep += `&program=${encodeURIComponent(prog)}`;
  await downloadReport(ep, 'attendance');
}
window.downloadAttReport = downloadAttReport;

async function quickArchiveExport(coll, label) {
  const body = { name: `${label} export ${new Date().toLocaleDateString('en-IN')}`, collectionName: coll, formats: ['json'] };
  try {
    toast(`Exporting ${label}…`, 'info');
    const res = await fetch(API + '/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: `Bearer ${S.token}` } : {}) },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    if (!res.ok) { const j = await res.json().catch(()=>({})); throw new Error(j.message||'Export failed'); }
    const blob  = await res.blob();
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url; a.download = `${coll}-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast(`${label} exported!`, 'success');
  } catch (err) { toast(err.message, 'error'); }
}
window.quickArchiveExport = quickArchiveExport;

// ── 24. INIT ──────────────────────────────────────────────────────
function init() {
  initLogin();
  initForceChange();

  if (S.token) {
    api('/auth/me')
      .then(({ data }) => {
        S.admin = data.admin;
        if (data.admin.mustChangePassword) showPage('forceChangePage');
        else bootAdmin();
      })
      .catch(() => {
        clearToken();
        showPage('loginPage');
      });
  } else {
    showPage('loginPage');
  }
}

init();
