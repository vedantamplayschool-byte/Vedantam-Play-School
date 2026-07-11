'use strict';
window.VedantamAPIConfig=Object.freeze({
  baseUrl: window.VEDANTAM_API_BASE || document.querySelector('meta[name="vedantam-api-base"]')?.content || (location.hostname.endsWith('github.io') ? 'https://vedantam-play-school.onrender.com/api/v1' : '/api/v1'),
  endpoints: Object.freeze({
    admissions: '/admissions',
    contacts: '/contacts',
    newsletter: '/newsletter',
    gallery: '/gallery',
    teachers: '/teachers',
    testimonials: '/testimonials',
    notices: '/notices',
    events: '/events',
    heroSlides: '/hero-slides'
  })
});
