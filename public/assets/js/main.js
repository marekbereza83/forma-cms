'use strict';

/* ── Mobile navigation ────────────────────────────────────── */
const navToggle  = document.getElementById('nav-toggle');
const navClose   = document.getElementById('nav-close');
const navOverlay = document.getElementById('nav-overlay');

function openNav() {
  navOverlay.hidden = false;
  navToggle.setAttribute('aria-expanded', 'true');
  navClose?.focus();
}
function closeNav() {
  navOverlay.hidden = true;
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle?.focus();
}

navToggle?.addEventListener('click', openNav);
navClose?.addEventListener('click', closeNav);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !navOverlay?.hidden) closeNav(); });

/* ── FAQ accordion ────────────────────────────────────────── */
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    item.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(!isOpen));
  });
});

/* ── Scroll progress bar ──────────────────────────────────── */
const progressBar = document.getElementById('scroll-progress');
if (progressBar) {
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    progressBar.style.width = pct + '%';
  }, { passive: true });
}

/* ── Custom cursor (desktop only) ────────────────────────── */
if (!('ontouchstart' in window)) {
  const cursor = document.getElementById('custom-cursor');
  if (cursor) {
    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top  = e.clientY + 'px';
    }, { passive: true });

    document.querySelectorAll('button, a, .interactive-card, .hero-visual').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
    });

    /* Magnetic buttons */
    document.querySelectorAll('.btn-magnetic').forEach(btn => {
      btn.addEventListener('mousemove', function(e) {
        const r = this.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width  / 2) * 0.2;
        const y = (e.clientY - r.top  - r.height / 2) * 0.2;
        this.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener('mouseleave', function() {
        this.style.transform = 'translate(0,0)';
      });
    });
  }
}

const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Scroll reveal ────────────────────────────────────────── */
if (!noMotion) {
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        const counters = e.target.querySelectorAll('.counter-stat');
        counters.forEach(startCounter);
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal, .stagger-reveal').forEach(el => revealObs.observe(el));
}

/* ── Counter animation ────────────────────────────────────── */
function startCounter(el) {
  const target   = parseFloat(el.dataset.target) || 0;
  const suffix   = el.dataset.suffix || '';
  const decimals = String(target).includes('.') ? 1 : 0;
  const duration = 1800;
  const steps    = 50;
  let   current  = 0;
  const inc      = target / steps;

  const timer = setInterval(() => {
    current = Math.min(current + inc, target);
    el.textContent = current.toFixed(decimals) + suffix;
    if (current >= target) clearInterval(timer);
  }, duration / steps);
}

/* ── Parallax ─────────────────────────────────────────────── */
if (!noMotion) {
  const parallaxLayers = document.querySelectorAll('.parallax-layer');
  if (parallaxLayers.length) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      parallaxLayers.forEach(layer => {
        const speed = parseFloat(layer.dataset.speed) || 0.2;
        layer.style.transform = `translateY(${scrolled * speed}px)`;
      });
    }, { passive: true });
  }
}
