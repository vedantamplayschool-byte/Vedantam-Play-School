/* ===================================================
   VEDANTAM PLAY SCHOOL – script.js
   =================================================== */
'use strict';

/* ---- Navbar: scroll shadow + active link ---- */
const navbar  = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-links a:not(.nav-cta)');
const sections = document.querySelectorAll('main section[id]');

function onScroll() {
  // shadow on scroll
  navbar.classList.toggle('scrolled', window.scrollY > 20);

  // back-to-top visibility
  backToTop.classList.toggle('visible', window.scrollY > 400);

  // active nav link
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 100) current = sec.id;
  });
  navLinks.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}

window.addEventListener('scroll', onScroll, { passive: true });

/* ---- Mobile hamburger ---- */
const hamburger = document.getElementById('hamburger');
const navMenu   = document.getElementById('navLinks');

hamburger.setAttribute('aria-expanded', 'false');
hamburger.setAttribute('aria-controls', 'navLinks');
navMenu.setAttribute('id', 'navLinks');

hamburger.addEventListener('click', () => {
  const isOpen = hamburger.classList.toggle('open');
  navMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

// close menu on link click
navMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navMenu.classList.remove('open');
  });
});

// close menu on outside click
document.addEventListener('click', e => {
  if (!navbar.contains(e.target)) {
    hamburger.classList.remove('open');
    navMenu.classList.remove('open');
  }
});

/* ---- Gallery filter ---- */
const filterBtns = document.querySelectorAll('.filter-btn');
const galleryItems = document.querySelectorAll('.gallery-item');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    galleryItems.forEach(item => {
      const show = filter === 'all' || item.dataset.cat === filter;
      item.classList.toggle('hidden', !show);
    });
  });
});

/* ---- Testimonials slider ---- */
const track  = document.getElementById('testimonialsTrack');
const dotsEl = document.getElementById('sliderDots');
const cards  = track ? track.querySelectorAll('.testimonial-card') : [];
let current  = 0;
let autoTimer;

function getVisible() {
  const w = window.innerWidth;
  if (w <= 640) return 1;
  if (w <= 1100) return 2;
  return 3;
}

function renderDots(total) {
  dotsEl.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const d = document.createElement('span');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(d);
  }
}

function goTo(idx) {
  const visible = getVisible();
  const max     = Math.max(0, cards.length - visible);
  current       = Math.max(0, Math.min(idx, max));

  const cardW   = cards[0] ? cards[0].offsetWidth + 24 : 0;
  track.style.transform = `translateX(-${current * cardW}px)`;

  dotsEl.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === current));
}

function initSlider() {
  const visible = getVisible();
  const total   = Math.max(1, cards.length - visible + 1);
  renderDots(total);
  goTo(0);
}

document.getElementById('prevBtn')?.addEventListener('click', () => {
  clearInterval(autoTimer);
  const visible = getVisible();
  const max = Math.max(0, cards.length - visible);
  goTo(current > 0 ? current - 1 : max); // wrap to last
  startAuto();
});
document.getElementById('nextBtn')?.addEventListener('click', () => {
  clearInterval(autoTimer);
  const visible = getVisible();
  const max = Math.max(0, cards.length - visible);
  goTo(current < max ? current + 1 : 0);
  startAuto();
});

function startAuto() {
  autoTimer = setInterval(() => {
    const visible = getVisible();
    const max = Math.max(0, cards.length - visible);
    goTo(current < max ? current + 1 : 0);
  }, 4500);
}

if (track && cards.length) {
  initSlider();
  startAuto();
  window.addEventListener('resize', () => { initSlider(); }, { passive: true });
}

/* ---- Admission form ---- */
const admissionForm = document.getElementById('admissionForm');
const formSuccess   = document.getElementById('formSuccess');

admissionForm?.addEventListener('submit', e => {
  e.preventDefault();
  const inputs = admissionForm.querySelectorAll('[required]');
  let valid = true;

  inputs.forEach(inp => {
    const ok = inp.value.trim() !== '';
    inp.style.borderColor = ok ? '' : 'var(--orange)';
    if (!ok) valid = false;
  });

  if (!valid) return;

  // Simulate async submission
  const btn = admissionForm.querySelector('button[type=submit]');
  btn.textContent = 'Sending…';
  btn.disabled = true;

  setTimeout(() => {
    admissionForm.hidden  = true;
    formSuccess.hidden    = false;
  }, 1000);
});

// Reset field error on input
admissionForm?.querySelectorAll('input, select, textarea').forEach(inp => {
  inp.addEventListener('input', () => { inp.style.borderColor = ''; });
});

/* ---- Back to top ---- */
const backToTop = document.getElementById('backToTop');
backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---- Scroll reveal ---- */
const revealEls = document.querySelectorAll(
  '.feature-card, .program-card, .facility-item, .testimonial-card, .contact-card, .step, .gallery-item, .about-img-grid, .about-content, .hero-content, .hero-visual'
);

revealEls.forEach(el => el.setAttribute('data-reveal', ''));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => revealObserver.observe(el));

/* ---- Smooth anchor clicks for same-page links ---- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const href = anchor.getAttribute('href');
    if (!href || href === '#') return; // ignore bare # links
    let target;
    try { target = document.querySelector(href); } catch (_) { return; }
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});
