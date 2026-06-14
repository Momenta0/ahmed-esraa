/* ================================================================
   script-ui.js — Wedding Digital Invitation
   UI logic only — NO Firebase dependency.
   This file runs in all environments including file:// and GitHub Pages.

   Sections:
     1. Envelope Animation
     2. Language Toggle (EN ↔ AR)
     3. Countdown Timer
     4. Scroll Reveal
     5. Add to Calendar (.ics download)
     6. RSVP — Attend Toggle
     7. RSVP — Signature Canvas
================================================================ */


/* ────────────────────────────────────────────────────────────────
   1. ENVELOPE ANIMATION
   Tap anywhere → flap CSS animation → overlay fades out.
   This is the fix for the "envelope not opening" bug.
   Root cause was: script.js used ES module imports which crash
   silently when opened via file:// — this file has no imports.
──────────────────────────────────────────────────────────────── */
const envScreen = document.getElementById('envelope-screen');
const envWrap   = document.getElementById('env-wrap');
const tapText   = document.getElementById('env-tap-text');

envScreen.addEventListener('click', () => {
  envWrap.classList.add('open');                             // triggers CSS flap rotation
  setTimeout(() => envScreen.classList.add('hidden'), 700); // fade out after 700ms
});


/* ────────────────────────────────────────────────────────────────
   2. LANGUAGE TOGGLE  (English ↔ Arabic)
   Single button — always shows the OTHER language as label.
   Swaps all [data-en]/[data-ar] text and input placeholders.
   Flips document direction ltr ↔ rtl.
──────────────────────────────────────────────────────────────── */
// Exposed on window so script.js (Firebase module) can read the current language
window.currentLang = 'en';
let currentLang = window.currentLang;

function toggleLang() {
  currentLang        = currentLang === 'en' ? 'ar' : 'en';
  window.currentLang = currentLang; // keep window in sync for script.js
  const isAr  = currentLang === 'ar';

  document.documentElement.lang = currentLang;
  document.body.dir              = isAr ? 'rtl' : 'ltr';

  // Button always shows the other language
  document.getElementById('lang-btn').textContent = isAr ? 'English' : 'عربي';

  // Envelope tap hint
  tapText.textContent = isAr ? 'اضغط للفتح' : 'Tap to open';

  // Swap all translatable text nodes
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = isAr ? el.dataset.ar : el.dataset.en;
  });

  // Swap all input / textarea placeholders
  document.querySelectorAll('[data-placeholder-en]').forEach(el => {
    el.placeholder = isAr ? el.dataset.placeholderAr : el.dataset.placeholderEn;
  });
}

// Expose globally — called via onclick="toggleLang()" in HTML
window.toggleLang = toggleLang;


/* ────────────────────────────────────────────────────────────────
   3. COUNTDOWN TIMER
   Updates every second. Shows 🎉 when target date passes.
   🔧 Change the date string to the real wedding date.
      Format: 'YYYY-MM-DDTHH:MM:SS'
──────────────────────────────────────────────────────────────── */
const weddingDate = new Date('2027-06-15T18:00:00');

function toArabicNumerals(str) {
  return str.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function formatNum(n) {
  const s = String(n).padStart(2, '0');
  return window.currentLang === 'ar' ? toArabicNumerals(s) : s;
}

function updateCountdown() {
  const diff = weddingDate - new Date();

  if (diff <= 0) {
    const row = document.querySelector('.countdown-row');
    if (row) row.innerHTML =
      '<p style="text-align:center;font-family:\'Great Vibes\',cursive;font-size:32px;color:var(--olive)">🎉</p>';
    return;
  }

  document.getElementById('cd-days').textContent  = formatNum(Math.floor(diff / 86400000));
  document.getElementById('cd-hours').textContent = formatNum(Math.floor((diff % 86400000) / 3600000));
  document.getElementById('cd-mins').textContent  = formatNum(Math.floor((diff % 3600000)  / 60000));
  document.getElementById('cd-secs').textContent  = formatNum(Math.floor((diff % 60000)    / 1000));
}

updateCountdown();
setInterval(updateCountdown, 1000);


/* ────────────────────────────────────────────────────────────────
   4. SCROLL REVEAL
   IntersectionObserver watches all .reveal elements.
   Adds .visible class when element enters viewport.
   Each element animates only once (observer is disconnected after).
──────────────────────────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(
  entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target); // fire once only
    }
  }),
  { threshold: 0.15 }
);

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


/* ────────────────────────────────────────────────────────────────
   5. ADD TO CALENDAR
   Generates a standard .ics file and triggers browser download.
   Works on all devices — opens in Apple Calendar, Google, Outlook.
   No backend or server needed.
──────────────────────────────────────────────────────────────── */
const calBtn = document.getElementById('add-cal-btn');
if (calBtn) {
  calBtn.addEventListener('click', e => {
    e.preventDefault();

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wedding Invitation//EN',
      'BEGIN:VEVENT',
      'DTSTART:20270615T180000',
      'DTEND:20270616T020000',
      'SUMMARY:Ahmed & Esraa Wedding',
      'LOCATION:JW Marriott Hotel,Cairo',
      'DESCRIPTION:You are invited to celebrate the wedding of Ahmed & Esraa.',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const link    = document.createElement('a');
    link.href     = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    link.download = 'ahmed-esraa-wedding.ics';
    link.click();
    URL.revokeObjectURL(link.href);
  });
}


/* ────────────────────────────────────────────────────────────────
   6. RSVP — ATTEND TOGGLE
   Yes / No buttons. Stores selection in `attending` variable.
   submitRSVP() in script.js reads this value on form submit.
──────────────────────────────────────────────────────────────── */
let attending = null; // 'yes' | 'no' | null

function selectAttend(val) {
  attending = val;
  document.getElementById('btn-yes').className = 'attend-btn' + (val === 'yes' ? ' sel-yes' : '');
  document.getElementById('btn-no').className  = 'attend-btn' + (val === 'no'  ? ' sel-no'  : '');
}

window.selectAttend = selectAttend;

// Expose attending value so script.js (Firebase) can read it
window.getAttending = () => attending;


/* ────────────────────────────────────────────────────────────────
   7. RSVP — SIGNATURE CANVAS
   Supports mouse (desktop) and touch (mobile).
   touch-action: none in CSS prevents page scroll while drawing.
   script.js reads the canvas via document.getElementById('sig-canvas').
──────────────────────────────────────────────────────────────── */
const sigCanvas = document.getElementById('sig-canvas');
const sigCtx    = sigCanvas.getContext('2d');
let   sigActive = false;

/* Set canvas resolution for sharp rendering on retina/HiDPI screens */
function initSigCanvas() {
  const dpr  = window.devicePixelRatio || 1;
  const rect = sigCanvas.getBoundingClientRect();
  sigCanvas.width  = rect.width  * dpr;
  sigCanvas.height = rect.height * dpr;
  sigCtx.scale(dpr, dpr);
  sigCtx.strokeStyle = '#3A3028';
  sigCtx.lineWidth   = 1.8;
  sigCtx.lineCap     = 'round';
  sigCtx.lineJoin    = 'round';
}
requestAnimationFrame(initSigCanvas);

/* Get pointer position relative to canvas top-left */
function getSigPos(e) {
  const rect = sigCanvas.getBoundingClientRect();
  const src  = e.touches ? e.touches[0] : e;
  return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}

// Mouse events
sigCanvas.addEventListener('mousedown',  e => {
  sigActive = true;
  const p = getSigPos(e);
  sigCtx.beginPath();
  sigCtx.moveTo(p.x, p.y);
});
sigCanvas.addEventListener('mousemove',  e => {
  if (!sigActive) return;
  const p = getSigPos(e);
  sigCtx.lineTo(p.x, p.y);
  sigCtx.stroke();
});
sigCanvas.addEventListener('mouseup',    () => sigActive = false);
sigCanvas.addEventListener('mouseleave', () => sigActive = false);

// Touch events
sigCanvas.addEventListener('touchstart', e => {
  e.preventDefault();
  sigActive = true;
  const p = getSigPos(e);
  sigCtx.beginPath();
  sigCtx.moveTo(p.x, p.y);
}, { passive: false });
sigCanvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!sigActive) return;
  const p = getSigPos(e);
  sigCtx.lineTo(p.x, p.y);
  sigCtx.stroke();
}, { passive: false });
sigCanvas.addEventListener('touchend', () => sigActive = false);

/* Clear the canvas */
function clearSig() {
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
}
window.clearSig = clearSig;

/* Returns true if no pixels have been drawn yet */
window.isSigEmpty = function() {
  const pixels = sigCtx.getImageData(0, 0, sigCanvas.width, sigCanvas.height).data;
  return !pixels.some((val, i) => i % 4 === 3 && val > 0);
};

