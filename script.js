/* ================================================================
   script.js — Firebase RSVP Submit
   Uses Firebase Compat SDK (loaded via <script> tag in index.html)
   No import/export — no CSP issues — works everywhere

   Depends on:
     - firebase-app-compat.js    loaded before this file
     - firebase-firestore-compat.js  loaded before this file
     - script-ui.js              loaded before this file
       → window.currentLang
       → window.getAttending()
       → window.isSigEmpty()
================================================================ */


/* ────────────────────────────────────────────────────────────────
   1. FIREBASE CONFIG
   🔧 Replace with your real values from:
      Firebase Console → Project Settings → Your Apps → SDK Setup
──────────────────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyDlLSsLTWMGJZMCktTuCmnT9W5PWobZVVA",
  authDomain: "digital-invitations-c63dc.firebaseapp.com",
  projectId: "digital-invitations-c63dc",
  storageBucket: "digital-invitations-c63dc.firebasestorage.app",
  messagingSenderId: "823339122434",
  appId: "1:823339122434:web:4757dde339cd2b61c78c1b",
  measurementId: "G-VRCX5K5GD6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


/* ────────────────────────────────────────────────────────────────
   2. EVENT ID — READ FROM URL
   yoursite.com/invite/omar-salma  →  eventId = 'omar-salma'
   localhost:3000/index.html       →  eventId = 'default-event'
──────────────────────────────────────────────────────────────── */
// const pathSegments = window.location.pathname.split('/').filter(Boolean);
// const lastSegment  = pathSegments[pathSegments.length - 1] || '';
// const eventId      = (lastSegment && lastSegment !== 'index.html')
//   ? lastSegment
//   : 'default-event';
const eventId = window.EVENT_ID || 'default-event'; // 🔧 set in index.html


/* ────────────────────────────────────────────────────────────────
   3. SIGNATURE COMPRESSION
   Resize canvas to 400×150 and export as WebP quality 0.4
   Result: ~8–20KB — stored as base64 string in Firestore doc
──────────────────────────────────────────────────────────────── */
function compressSignature(sourceCanvas) {
  const offscreen  = document.createElement('canvas');
  offscreen.width  = 400;
  offscreen.height = 150;
  const ctx        = offscreen.getContext('2d');
  ctx.fillStyle    = '#F5F0E8';
  ctx.fillRect(0, 0, 400, 150);
  ctx.drawImage(sourceCanvas, 0, 0, 400, 150);
  return offscreen.toDataURL('image/webp', 0.4);
}


/* ────────────────────────────────────────────────────────────────
   4. RSVP FORM SUBMIT
   Flow:
     A → Validate name
     B → Compress signature if drawn
     C → Write response doc  →  events/{eventId}/responses/{autoId}
     D → Increment stats doc →  events/{eventId}/stats/summary
     E → Show success message
──────────────────────────────────────────────────────────────── */
async function submitRSVP() {

  // ── A: Validate ──
  const name = document.getElementById('rsvp-name').value.trim();
  const lang = window.currentLang || 'en';

  if (!name) {
    alert(lang === 'ar' ? 'يرجى إدخال اسمك الكريم' : 'Please enter your name');
    return;
  }

  const message   = document.getElementById('rsvp-msg').value.trim();
  const submitBtn = document.querySelector('#rsvp-form-content .btn-primary');

  submitBtn.disabled    = true;
  submitBtn.textContent = lang === 'ar' ? 'جاري الإرسال...' : 'Sending...';

  try {

    // ── B: Compress signature ──
    let signature = null;
    if (typeof window.isSigEmpty === 'function' && !window.isSigEmpty()) {
      signature = compressSignature(document.getElementById('sig-canvas'));
    }

    // ── C: Get attending value ──
    const attendingVal = typeof window.getAttending === 'function'
      ? window.getAttending()
      : null;

    // ── D: Write response doc ──
    await db
      .collection('events')
      .doc(eventId)
      .collection('responses')
      .add({
        name      : name,
        attending : attendingVal ?? 'not_selected',
        message   : message || '',
        signature : signature,
        lang      : lang,
        timestamp : firebase.firestore.FieldValue.serverTimestamp()
      });

    // ── E: Increment stats doc ──
    await db
      .collection('events')
      .doc(eventId)
      .collection('stats')
      .doc('summary')
      .set({
        total    : firebase.firestore.FieldValue.increment(1),
        attending: firebase.firestore.FieldValue.increment(attendingVal === 'yes' ? 1 : 0),
        declining: firebase.firestore.FieldValue.increment(attendingVal === 'no'  ? 1 : 0)
      }, { merge: true });

    // ── F: Show success ──
    showRSVPSuccess(lang);

  } catch (err) {
    console.error('RSVP submit error:', err);
    submitBtn.disabled    = false;
    submitBtn.textContent = lang === 'ar' ? 'إرسال التأكيد' : 'SEND CONFIRMATION';
    alert(lang === 'ar'
      ? 'حدث خطأ، يرجى المحاولة مرة أخرى'
      : 'Something went wrong. Please try again.');
  }
}

/* Hide form → show success → scroll into view */
function showRSVPSuccess(lang) {
  document.getElementById('rsvp-form-content').style.display = 'none';

  const success = document.getElementById('rsvp-success');
  success.style.display = 'block';

  success.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = lang === 'ar' ? el.dataset.ar : el.dataset.en;
  });

  document.getElementById('rsvp-section').scrollIntoView({
    behavior: 'smooth',
    block   : 'center'
  });
}

// Expose to HTML onclick="submitRSVP()"
window.submitRSVP = submitRSVP;
