import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("✅ loginscript.js loaded");

const firebaseConfig = {
    apiKey: "AIzaSyDiUes0g8qj-pCRD0kDdcPsmSMsrYDbmwU",
    authDomain: "recallgen-4b38d.firebaseapp.com",
    projectId: "recallgen-4b38d",
    storageBucket: "recallgen-4b38d.firebasestorage.app",
    messagingSenderId: "67954844866",
    appId: "1:67954844866:web:5f52423f12fd30644b475b",
    measurementId: "G-TYTK4RHRBH"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

function isValidGmail(email) {
    return /^[^@\s]+@gmail\.com$/.test(email);
}

function isValidPassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,12}$/.test(password);
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOMContentLoaded fired");

    //  CONTACT
    const contactField = document.getElementById('reg-contact');
    if (contactField) {
        contactField.addEventListener('keydown', (e) => {
            const allowed = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
            if (allowed.includes(e.key)) return;
            if ((e.ctrlKey || e.metaKey) && ['a','c','v','x'].includes(e.key.toLowerCase())) return;
            if (!/^\d$/.test(e.key)) e.preventDefault();
        });
        contactField.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted     = (e.clipboardData || window.clipboardData).getData('text');
            const digitsOnly = pasted.replace(/\D/g, '');
            const start      = contactField.selectionStart;
            const end        = contactField.selectionEnd;
            contactField.value = contactField.value.slice(0, start) + digitsOnly + contactField.value.slice(end);
        });
    }

    //  SHOW/HIDE TOGGLE
    const eyeOpen  = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/><circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const eyeSlash = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18M10.477 10.477A3 3 0 0013.523 13.523M6.343 6.343A9.953 9.953 0 002.458 12C3.732 16.057 7.523 19 12 19c1.7 0 3.298-.425 4.657-1.172M9.88 4.129A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.974 9.974 0 01-1.945 3.228"/></svg>`;

    function addShowHideToggle(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        const parent = field.parentElement;
        parent.style.position = 'relative';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Toggle password visibility');
        btn.style.cssText = `position:absolute;right:10px;top:13px;background:none;border:none;cursor:pointer;padding:0;line-height:1;color:#888;`;
        btn.innerHTML = eyeOpen;
        parent.appendChild(btn);
        field.style.paddingRight = '36px';
        let visible = false;
        btn.addEventListener('click', () => {
            visible = !visible;
            field.type     = visible ? 'text' : 'password';
            btn.innerHTML  = visible ? eyeSlash : eyeOpen;
        });
    }

    addShowHideToggle('reg-password');
    addShowHideToggle('reg-confirm-password');
    addShowHideToggle('login-password');

    //  PASSWORD STRENGTH INDICATOR
    const passwordField = document.getElementById('reg-password');
    if (passwordField) {
        const inputGroup = passwordField.closest('.input-group') || passwordField.parentElement;

        const strengthBar = document.createElement('div');
        strengthBar.id = 'password-strength-bar';
        strengthBar.style.cssText = 'display:none; margin-top:6px;';
        strengthBar.innerHTML = `
            <div style="display:flex;gap:4px;margin-bottom:6px;">
                <div id="seg1" style="height:4px;flex:1;border-radius:3px;background:#e0e0e0;transition:background 0.3s;"></div>
                <div id="seg2" style="height:4px;flex:1;border-radius:3px;background:#e0e0e0;transition:background 0.3s;"></div>
                <div id="seg3" style="height:4px;flex:1;border-radius:3px;background:#e0e0e0;transition:background 0.3s;"></div>
                <div id="seg4" style="height:4px;flex:1;border-radius:3px;background:#e0e0e0;transition:background 0.3s;"></div>
            </div>
            <div id="strength-checklist" style="font-size:11px;display:flex;flex-direction:column;gap:3px;"></div>
        `;

        inputGroup.appendChild(strengthBar);

        function getStrength(val) {
            const checks = {
                length:    val.length >= 8 && val.length <= 12,
                lowercase: /[a-z]/.test(val),
                uppercase: /[A-Z]/.test(val),
                number:    /\d/.test(val),
                special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(val)
            };
            return { score: Object.values(checks).filter(Boolean).length, checks };
        }

        passwordField.addEventListener('input', () => {
            const val = passwordField.value;
            const bar = document.getElementById('password-strength-bar');
            if (!val) { bar.style.display = 'none'; return; }
            bar.style.display = 'block';

            const { score, checks } = getStrength(val);
            const segs      = ['seg1','seg2','seg3','seg4'].map(id => document.getElementById(id));
            const checklist = document.getElementById('strength-checklist');

            let color, text;
            if (score <= 2)       { color = '#e53935'; text = 'Weak'; }
            else if (score === 3) { color = '#fb8c00'; text = 'Fair'; }
            else if (score === 4) { color = '#fdd835'; text = 'Good'; }
            else                  { color = '#43a047'; text = 'Strong'; }

            segs.forEach((seg, i) => { seg.style.background = i < score ? color : '#e0e0e0'; });

            const strengthRow = `<div style="color:${color};display:flex;align-items:center;gap:5px;font-weight:600;margin-bottom:2px;">
                <span style="font-size:11px;">●</span><span>${text}</span>
            </div>`;

            checklist.innerHTML = strengthRow + [
                { key: 'length',    label: '8–12 characters' },
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
            updateMatch();
        });
    }

    //  PASSWORD MATCH INDICATOR

    const confirmField = document.getElementById('reg-confirm-password');
    if (confirmField && passwordField) {
        const confirmGroup = confirmField.closest('.input-group') || confirmField.parentElement;

        const matchLabel = document.createElement('div');
        matchLabel.id = 'reg-match-label';
        matchLabel.style.cssText = 'display:none; margin-top:6px; font-size:12px; font-weight:500;';

        confirmGroup.appendChild(matchLabel);

        confirmField.addEventListener('input', updateMatch);

        function updateMatch() {
            const np = passwordField ? passwordField.value : '';
            const cp = confirmField.value;
            if (!cp) { matchLabel.style.display = 'none'; return; }
            matchLabel.style.display = 'block';
            if (np === cp) {
                matchLabel.style.color = '#43a047';
                matchLabel.textContent = '✔ Passwords match';
            } else {
                matchLabel.style.color = '#e53935';
                matchLabel.textContent = '✘ Passwords do not match';
            }
        }
        window._regUpdateMatch = updateMatch;
    }
    function updateMatch() {
        if (window._regUpdateMatch) window._regUpdateMatch();
    }

    //  REGISTER
    const regForm = document.getElementById('register-form');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn   = regForm.querySelector('button[type="submit"]');
            const username    = document.getElementById('reg-username').value;
            const email       = document.getElementById('reg-email').value.trim();
            const contact     = document.getElementById('reg-contact').value;
            const password    = document.getElementById('reg-password').value;
            const confirmPass = document.getElementById('reg-confirm-password').value;

            if (!isValidGmail(email)) {
                Swal.fire('Invalid Email', 'Please use a valid Gmail address (e.g. yourname@gmail.com).', 'warning');
                return;
            }

            if (!isValidPassword(password)) {
                Swal.fire({
                    title: 'Weak Password',
                    html: `Password must be <b>8–12 characters</b> and include:<br>
                           &bull; At least 1 uppercase letter (A–Z)<br>
                           &bull; At least 1 lowercase letter (a–z)<br>
                           &bull; At least 1 number (0–9)<br>
                           &bull; At least 1 special character (!@#$%^&* etc.)`,
                    icon: 'warning'
                });
                return;
            }

            if (password !== confirmPass) {
                Swal.fire('Wait!', 'Passwords do not match!', 'warning');
                return;
            }

            submitBtn.disabled    = true;
            submitBtn.textContent = 'Creating...';

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                const setDocPromise  = setDoc(doc(db, "users", user.uid), {
                    username:  username,
                    contact:   contact,
                    email:     email,
                    role:      "user",
                    createdAt: serverTimestamp()
                });
                const timeoutPromise = new Promise(resolve => setTimeout(() => resolve("timeout"), 5000));
                await Promise.race([setDocPromise, timeoutPromise]);

                await Swal.fire({ title: 'Success!', text: 'Account created successfully!', icon: 'success', confirmButtonText: 'OK' });
                window.location.assign("login.html");

            } catch (error) {
                submitBtn.disabled    = false;
                submitBtn.textContent = 'Create Account';

                let msg = "Registration failed. Please try again.";
                if (error.code === 'auth/email-already-in-use') msg = "This email is already registered.";
                else if (error.code === 'auth/weak-password')   msg = "Password is too weak. At least 6 characters.";
                else if (error.code === 'auth/invalid-email')   msg = "Invalid email format.";

                Swal.fire({ title: 'Error!', text: msg, icon: 'error', confirmButtonColor: '#d33' });
            }
        });
    }

    //  LOGIN
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email      = document.getElementById('login-username').value;
            const password   = document.getElementById('login-password').value;
            const rememberMe = document.getElementById('remember-me')?.checked ?? false;

            try {
                const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
                await setPersistence(auth, persistence);
                await signInWithEmailAndPassword(auth, email, password);

                Swal.fire({
                    title: 'Welcome To RecallGen!',
                    text:  'Login Successful!',
                    icon:  'success',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => { window.location.href = "dashboard.html"; });

            } catch (error) {
                Swal.fire({ title: 'Login Failed', text: 'Invalid email or password.', icon: 'error', confirmButtonColor: '#d33' });
            }
        });
    }
});