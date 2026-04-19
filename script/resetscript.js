import { initializeApp }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, verifyPasswordResetCode, confirmPasswordReset }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey:            "AIzaSyDiUes0g8qj-pCRD0kDdcPsmSMsrYDbmwU",
    authDomain:        "recallgen-4b38d.firebaseapp.com",
    projectId:         "recallgen-4b38d",
    storageBucket:     "recallgen-4b38d.firebasestorage.app",
    messagingSenderId: "67954844866",
    appId:             "1:67954844866:web:5f52423f12fd30644b475b",
    measurementId:     "G-TYTK4RHRBH"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ─── Auto-detect login URL — works sa localhost at GitHub Pages ───────────────
function getLoginURL() {
    const origin   = window.location.origin;
    const pathname = window.location.pathname;
    const folder   = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    return `${origin}${folder}login.html`;
}

// Validation: strict 12–15 chars (for submit)
function isValidPassword(pw) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>\/?`~]).{12,15}$/.test(pw);
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
const eyeOpen  = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/><circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const eyeSlash = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18M10.477 10.477A3 3 0 0013.523 13.523M6.343 6.343A9.953 9.953 0 002.458 12C3.732 16.057 7.523 19 12 19c1.7 0 3.298-.425 4.657-1.172M9.88 4.129A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.974 9.974 0 01-1.945 3.228"/></svg>`;

// ─── Show/hide toggle ─────────────────────────────────────────────────────────
function setupToggle(btnId, fieldId) {
    const btn   = document.getElementById(btnId);
    const field = document.getElementById(fieldId);
    btn.innerHTML = eyeOpen;
    let visible = false;
    btn.addEventListener('click', () => {
        visible       = !visible;
        field.type    = visible ? 'text' : 'password';
        btn.innerHTML = visible ? eyeSlash : eyeOpen;
    });
}

// ─── Password strength indicator ──────────────────────────────────────────────
function updateStrengthUI(val) {
    const wrap = document.getElementById('strength-wrap');
    if (!val) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';

    const checks = {
        length:    val.length >= 12,  // ✅ no upper limit for indicator
        lowercase: /[a-z]/.test(val),
        uppercase: /[A-Z]/.test(val),
        number:    /\d/.test(val),
        special:   /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>\/?`~]/.test(val)
    };
    const score = Object.values(checks).filter(Boolean).length;
    const segs  = ['seg1', 'seg2', 'seg3', 'seg4'].map(id => document.getElementById(id));
    const cl    = document.getElementById('strength-checklist');

    let color, text;
    if (score <= 2)       { color = '#e53935'; text = 'Weak'; }
    else if (score === 3) { color = '#fb8c00'; text = 'Fair'; }
    else if (score === 4) { color = '#fdd835'; text = 'Good'; }
    else                  { color = '#43a047'; text = 'Strong'; }

    segs.forEach((s, i) => { s.style.background = i < score ? color : '#e0e0e0'; });

    cl.innerHTML =
        `<div style="color:${color};display:flex;align-items:center;gap:5px;font-weight:600;margin-bottom:2px;">
            <span style="font-size:11px;">●</span><span>${text}</span>
         </div>` +
        [
            { key: 'length',    label: '12–15 characters' },
            { key: 'lowercase', label: 'Lowercase letter (a–z)' },
            { key: 'uppercase', label: 'Uppercase letter (A–Z)' },
            { key: 'number',    label: 'Number (0–9)' },
            { key: 'special',   label: 'Special character (!@#$%^&* etc.)' }
        ].map(item =>
            `<div style="color:${checks[item.key] ? '#43a047' : '#e53935'};display:flex;align-items:center;gap:5px;">
                <span style="font-size:10px;">${checks[item.key] ? '✔' : '✘'}</span>
                <span>${item.label}</span>
             </div>`
        ).join('');
}

// ─── Password match + enable/disable submit ───────────────────────────────────
function updateMatchUI() {
    const pw  = document.getElementById('new-password').value;
    const cpw = document.getElementById('confirm-password').value;
    const lbl = document.getElementById('match-label');
    const btn = document.getElementById('reset-btn');

    if (!cpw) { lbl.style.display = 'none'; btn.disabled = true; return; }
    lbl.style.display = 'block';

    if (!isValidPassword(pw)) {
        lbl.style.color = '#e53935';
        lbl.textContent = '✘ Password does not meet requirements';
        btn.disabled    = true;
    } else if (pw !== cpw) {
        lbl.style.color = '#e53935';
        lbl.textContent = '✘ Passwords do not match';
        btn.disabled    = true;
    } else {
        lbl.style.color = '#43a047';
        lbl.textContent = '✔ Passwords match';
        btn.disabled    = false;
    }
}

// ─── Read URL params ──────────────────────────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const oobCode = params.get('oobCode');
const mode    = params.get('mode');

const loadingEl = document.getElementById('loading-state');
const invalidEl = document.getElementById('invalid-state');
const resetEl   = document.getElementById('reset-state');

function showOnly(el) {
    [loadingEl, invalidEl, resetEl].forEach(e => e.style.display = 'none');
    el.style.display = 'block';
}

// ─── Init ─────────────────────────────────────────────────────────────────────
if (!oobCode || mode !== 'resetPassword') {
    showOnly(invalidEl);
} else {
    showOnly(loadingEl);

    verifyPasswordResetCode(auth, oobCode)
        .then(() => {
            showOnly(resetEl);

            setupToggle('toggle-new',     'new-password');
            setupToggle('toggle-confirm', 'confirm-password');

            document.getElementById('new-password').addEventListener('input', () => {
                updateStrengthUI(document.getElementById('new-password').value);
                updateMatchUI();
            });
            document.getElementById('confirm-password').addEventListener('input', updateMatchUI);

            // ─── Submit ───────────────────────────────────────────────────────
            document.getElementById('reset-btn').addEventListener('click', async () => {
                const pw  = document.getElementById('new-password').value;
                const btn = document.getElementById('reset-btn');

                if (!isValidPassword(pw)) {
                    Swal.fire({
                        title: 'Invalid Password',
                        html: `Password must be <b>12–15 characters</b> and include:<br>
                               &bull; Uppercase letter (A–Z)<br>
                               &bull; Lowercase letter (a–z)<br>
                               &bull; Number (0–9)<br>
                               &bull; Special character (!@#$%^&* etc.)`,
                        icon: 'warning',
                        confirmButtonColor: '#2D5A53'
                    });
                    return;
                }

                btn.disabled    = true;
                btn.textContent = 'Resetting...';

                try {
                    await confirmPasswordReset(auth, oobCode, pw);
                    await Swal.fire({
                        title: 'Password Reset!',
                        text:  'Your password has been updated successfully.',
                        icon:  'success',
                        confirmButtonColor: '#2D5A53',
                        confirmButtonText:  'Go to Login'
                    });
                    window.location.href = getLoginURL();
                } catch (err) {
                    btn.disabled    = false;
                    btn.textContent = 'Reset Password';

                    let msg = 'Something went wrong. Please try again.';
                    if (err.code === 'auth/expired-action-code') msg = 'This reset link has expired. Please request a new one.';
                    if (err.code === 'auth/invalid-action-code') msg = 'This reset link is invalid or already used.';
                    if (err.code === 'auth/weak-password')       msg = 'Password is too weak. Please follow the requirements.';

                    Swal.fire({ title: 'Error!', text: msg, icon: 'error', confirmButtonColor: '#d33' });
                }
            });
        })
        .catch(() => showOnly(invalidEl));
}