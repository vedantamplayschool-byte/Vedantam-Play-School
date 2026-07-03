/* ===================================================
   VEDANTAM PLAY SCHOOL – script.js  (Premium Edition)
   =================================================== */
'use strict';

/* ===================================================
   NAVBAR — scroll shadow + active link highlight
   =================================================== */
const navbar   = document.getElementById('navbar');
const navLinkEls = document.querySelectorAll('.nav-links a:not(.nav-cta)');
const allSections = document.querySelectorAll('main section[id]');
const backToTop   = document.getElementById('backToTop');

function onScroll() {
  const sy = window.scrollY;
  navbar.classList.toggle('scrolled', sy > 20);
  if (backToTop) backToTop.classList.toggle('visible', sy > 400);

  // Active nav highlight
  let current = '';
  allSections.forEach(sec => {
    if (sy >= sec.offsetTop - 110) current = sec.id;
  });
  navLinkEls.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}
window.addEventListener('scroll', onScroll, { passive: true });

/* ===================================================
   HAMBURGER MENU
   =================================================== */
const hamburger = document.getElementById('hamburger');
const navMenu   = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  const isOpen = hamburger.classList.toggle('open');
  navMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

navMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', closeMenu);
});

document.addEventListener('click', e => {
  if (!navbar.contains(e.target)) closeMenu();
});

function closeMenu() {
  hamburger.classList.remove('open');
  navMenu.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

/* ===================================================
   SMOOTH SCROLL (anchor links)
   =================================================== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    let target;
    try { target = document.querySelector(href); } catch (_) { return; }
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ===================================================
   SCROLL REVEAL (stagger by data-delay)
   =================================================== */
const revealEls = document.querySelectorAll('[data-reveal]');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay || '0', 10);
      setTimeout(() => {
        entry.target.classList.add('revealed');
      }, delay);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

revealEls.forEach(el => revealObserver.observe(el));

/* ===================================================
   COUNT-UP ANIMATION
   =================================================== */
function animateCount(el) {
  const target  = parseInt(el.dataset.target, 10);
  const duration = 1800;
  const step     = 16;
  const increment = target / (duration / step);
  let current    = 0;

  const timer = setInterval(() => {
    current = Math.min(current + increment, target);
    el.textContent = Math.floor(current) + (target >= 100 ? '+' : '+');
    if (current >= target) {
      el.textContent = target + '+';
      clearInterval(timer);
    }
  }, step);
}

const countEls = document.querySelectorAll('.count-up');
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.counted) {
      entry.target.dataset.counted = 'true';
      animateCount(entry.target);
      countObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
countEls.forEach(el => countObserver.observe(el));

/* ===================================================
   GALLERY FILTER
   =================================================== */
const filterBtns   = document.querySelectorAll('.filter-btn');
const galleryItems = document.querySelectorAll('.gallery-item');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;

    galleryItems.forEach((item, i) => {
      const show = filter === 'all' || item.dataset.cat === filter;
      if (show) {
        item.classList.remove('hidden');
        item.style.animationDelay = (i * 60) + 'ms';
        item.style.animation = 'none';
        requestAnimationFrame(() => {
          item.style.animation = '';
        });
      } else {
        item.classList.add('hidden');
      }
    });
  });
});

/* ===================================================
   LIGHTBOX
   =================================================== */
const lightbox       = document.getElementById('lightbox');
const lightboxImg    = document.getElementById('lightboxImg');
const lightboxCaption= document.getElementById('lightboxCaption');
const lightboxClose  = document.getElementById('lightboxClose');
const lbPrev         = document.getElementById('lbPrev');
const lbNext         = document.getElementById('lbNext');

let lightboxItems = [];
let lbIndex = 0;

function buildLightboxItems() {
  lightboxItems = Array.from(document.querySelectorAll('.gallery-item[data-lightbox]:not(.hidden)'));
}

function openLightbox(idx) {
  buildLightboxItems();
  if (!lightboxItems.length) return;
  lbIndex = Math.max(0, Math.min(idx, lightboxItems.length - 1));
  showLbItem(lbIndex);
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  lightboxClose.focus();
}

function showLbItem(idx) {
  const item = lightboxItems[idx];
  if (!item) return;
  const img = item.querySelector('img');
  lightboxImg.src = img ? img.src : '';
  lightboxImg.alt = img ? img.alt : '';
  lightboxCaption.textContent = item.dataset.title || '';
  // reset animation
  lightboxImg.style.animation = 'none';
  requestAnimationFrame(() => { lightboxImg.style.animation = ''; });
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
}

function lbNavigate(dir) {
  buildLightboxItems();
  lbIndex = (lbIndex + dir + lightboxItems.length) % lightboxItems.length;
  showLbItem(lbIndex);
}

// Open on click
document.querySelectorAll('.gallery-item[data-lightbox]').forEach((item, i) => {
  item.addEventListener('click', () => {
    buildLightboxItems();
    const visIdx = lightboxItems.indexOf(item);
    openLightbox(visIdx >= 0 ? visIdx : 0);
  });
});

lightboxClose?.addEventListener('click', closeLightbox);
lbPrev?.addEventListener('click', () => lbNavigate(-1));
lbNext?.addEventListener('click', () => lbNavigate(1));

// Close on backdrop click
lightbox?.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox();
});

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (lightbox?.hidden === false) {
    if (e.key === 'ArrowLeft')  lbNavigate(-1);
    if (e.key === 'ArrowRight') lbNavigate(1);
    if (e.key === 'Escape')     closeLightbox();
  }
});

/* ===================================================
   TESTIMONIALS SLIDER (with touch swipe)
   =================================================== */
const track  = document.getElementById('testimonialsTrack');
const dotsEl = document.getElementById('sliderDots');
const tCards = track ? Array.from(track.querySelectorAll('.testimonial-card')) : [];
let sliderCurrent = 0;
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
    d.addEventListener('click', () => { clearInterval(autoTimer); goTo(i); startAuto(); });
    dotsEl.appendChild(d);
  }
}

function goTo(idx) {
  const visible = getVisible();
  const max = Math.max(0, tCards.length - visible);
  sliderCurrent = Math.max(0, Math.min(idx, max));
  const cardW = tCards[0] ? tCards[0].offsetWidth + 24 : 0;
  track.style.transform = `translateX(-${sliderCurrent * cardW}px)`;
  dotsEl.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === sliderCurrent));
}

function initSlider() {
  const visible = getVisible();
  renderDots(Math.max(1, tCards.length - visible + 1));
  goTo(0);
}

function startAuto() {
  clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    const visible = getVisible();
    const max = Math.max(0, tCards.length - visible);
    goTo(sliderCurrent < max ? sliderCurrent + 1 : 0);
  }, 4500);
}

document.getElementById('prevBtn')?.addEventListener('click', () => {
  clearInterval(autoTimer);
  const visible = getVisible();
  const max = Math.max(0, tCards.length - visible);
  goTo(sliderCurrent > 0 ? sliderCurrent - 1 : max);
  startAuto();
});
document.getElementById('nextBtn')?.addEventListener('click', () => {
  clearInterval(autoTimer);
  const visible = getVisible();
  const max = Math.max(0, tCards.length - visible);
  goTo(sliderCurrent < max ? sliderCurrent + 1 : 0);
  startAuto();
});

// Touch swipe
let touchStartX = 0;
track?.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
track?.addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 40) {
    clearInterval(autoTimer);
    const visible = getVisible();
    const max = Math.max(0, tCards.length - visible);
    if (diff > 0) goTo(sliderCurrent < max ? sliderCurrent + 1 : 0);
    else          goTo(sliderCurrent > 0 ? sliderCurrent - 1 : max);
    startAuto();
  }
}, { passive: true });

if (track && tCards.length) {
  initSlider();
  startAuto();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initSlider, 150);
  }, { passive: true });
}

/* ===================================================
   FAQ ACCORDION
   =================================================== */
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
  const btn = item.querySelector('.faq-question');
  btn.addEventListener('click', () => {
    const isActive = item.classList.contains('active');

    // Close all others
    faqItems.forEach(other => {
      if (other !== item) {
        other.classList.remove('active');
        other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      }
    });

    // Toggle current
    item.classList.toggle('active', !isActive);
    btn.setAttribute('aria-expanded', String(!isActive));
  });
});

/* ===================================================
   ADMISSION FORM
   =================================================== */
const admissionForm = document.getElementById('admissionForm');
const formSuccess   = document.getElementById('formSuccess');

admissionForm?.addEventListener('submit', e => {
  e.preventDefault();
  const inputs = admissionForm.querySelectorAll('[required]');
  let valid = true;

  inputs.forEach(inp => {
    const ok = inp.value.trim() !== '';
    inp.style.borderColor = ok ? '' : '#F9A825';
    inp.style.boxShadow   = ok ? '' : '0 0 0 4px rgba(249,168,37,0.15)';
    if (!ok) valid = false;
  });

  if (!valid) {
    // Shake animation on invalid
    admissionForm.style.animation = 'shake 0.4s ease';
    setTimeout(() => { admissionForm.style.animation = ''; }, 400);
    return;
  }

  const btn = admissionForm.querySelector('button[type=submit]');
  btn.textContent = '⏳ Sending…';
  btn.disabled = true;

  setTimeout(() => {
    admissionForm.hidden = true;
    formSuccess.hidden   = false;
  }, 1200);
});

admissionForm?.querySelectorAll('input, select, textarea').forEach(inp => {
  inp.addEventListener('input', () => {
    inp.style.borderColor = '';
    inp.style.boxShadow   = '';
  });
});

// Inject shake keyframe
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-8px); }
    40%     { transform: translateX(8px); }
    60%     { transform: translateX(-6px); }
    80%     { transform: translateX(6px); }
  }
`;
document.head.appendChild(styleEl);

/* ===================================================
   BACK TO TOP
   =================================================== */
backToTop?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ===================================================
   BUTTON RIPPLE EFFECT
   =================================================== */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect   = btn.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      position:absolute; border-radius:50%; pointer-events:none;
      width:${size}px; height:${size}px;
      left:${e.clientX - rect.left - size/2}px;
      top:${e.clientY - rect.top - size/2}px;
      background:rgba(255,255,255,0.25);
      transform:scale(0); animation:rippleAnim 0.55s linear;
    `;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});

const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes rippleAnim {
    to { transform: scale(3); opacity: 0; }
  }
`;
document.head.appendChild(rippleStyle);
