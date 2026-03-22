import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyDiUes0g8qj-pCRD0kDdcPsmSMsrYDbmwU",
    authDomain: "recallgen-4b38d.firebaseapp.com",
    projectId: "recallgen-4b38d",
    storageBucket: "recallgen-4b38d.firebasestorage.app",
    messagingSenderId: "67954844866",
    appId: "1:67954844866:web:5f52423f12fd30644b475b",
    measurementId: "G-TYTK4RHRBH"
};
const SUPABASE_URL = 'https://xdudxyjihjyteukiaate.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdWR4eWppaGp5dGV1a2lhYXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3OTA4MDksImV4cCI6MjA4NjM2NjgwOX0.szi9C6EK9OZ1TrkYBI1oJZkFkSeDNTdcjnM2MuY8ti4';

// INIT
const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// TEMP STATE
let tempPfpFile = null;
let tempThemeBg = null;
let removeBg    = false;

// ISO password validation
function isValidPassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,12}$/.test(password);
}

// BURGER MENU
const burgerBtn = document.getElementById('burgerBtn');
const sidebar   = document.getElementById('sidebar');
const overlay   = document.getElementById('sidebarOverlay');

burgerBtn.addEventListener('click', () => {
    burgerBtn.classList.toggle('open');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
});
overlay.addEventListener('click', () => {
    burgerBtn.classList.remove('open');
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
});
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        burgerBtn.classList.remove('open');
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
    });
});

// PASSWORD TOGGLE (existing FA icons)
document.getElementById('toggle-new-pass').addEventListener('click', () => {
    const inp  = document.getElementById('new-password');
    const icon = document.getElementById('toggle-new-pass');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
});
document.getElementById('toggle-confirm-pass').addEventListener('click', () => {
    const inp  = document.getElementById('confirm-password');
    const icon = document.getElementById('toggle-confirm-pass');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
});

// ── PASSWORD STRENGTH INDICATOR
(function initStrengthIndicator() {
    const passwordField = document.getElementById('new-password');
    if (!passwordField) return;

    const passwordToggleDiv = passwordField.parentElement; // .password-toggle

    const strengthBar = document.createElement('div');
    strengthBar.id = 'settings-strength-bar';
    strengthBar.style.cssText = 'display:none; margin-top:8px;';
    strengthBar.innerHTML = `
        <div style="display:flex;gap:4px;margin-bottom:6px;">
            <div id="s-seg1" style="height:4px;flex:1;border-radius:3px;background:#e0e0e0;transition:background 0.3s;"></div>
            <div id="s-seg2" style="height:4px;flex:1;border-radius:3px;background:#e0e0e0;transition:background 0.3s;"></div>
            <div id="s-seg3" style="height:4px;flex:1;border-radius:3px;background:#e0e0e0;transition:background 0.3s;"></div>
            <div id="s-seg4" style="height:4px;flex:1;border-radius:3px;background:#e0e0e0;transition:background 0.3s;"></div>
        </div>
        <div id="s-strength-checklist" style="font-size:11px;display:flex;flex-direction:column;gap:3px;"></div>
    `;
    passwordToggleDiv.insertAdjacentElement('afterend', strengthBar);

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
        const bar = document.getElementById('settings-strength-bar');
        if (!val) { bar.style.display = 'none'; return; }
        bar.style.display = 'block';

        const { score, checks } = getStrength(val);
        const segs      = ['s-seg1','s-seg2','s-seg3','s-seg4'].map(id => document.getElementById(id));
        const checklist = document.getElementById('s-strength-checklist');

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
    });
})();

// ── PASSWORD MATCH INDICATOR
(function initMatchIndicator() {
    const confirmField  = document.getElementById('confirm-password');
    const passwordField = document.getElementById('new-password');
    if (!confirmField || !passwordField) return;

    const confirmToggleDiv = confirmField.parentElement; // .password-toggle

    const matchLabel = document.createElement('div');
    matchLabel.id = 'settings-match-label';
    matchLabel.style.cssText = 'display:none; margin-top:8px; font-size:12px; font-weight:500;';
    confirmToggleDiv.insertAdjacentElement('afterend', matchLabel);

    confirmField.addEventListener('input', updateMatch);
    passwordField.addEventListener('input', updateMatch);

    function updateMatch() {
        const np = passwordField.value;
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
})();

// LOAD USER SETTINGS
async function loadSettings(user) {
    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.uid)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Error loading settings:", error);
        return;
    }

    document.getElementById('acc-email').value = user.email || '';

    if (data) {
        if (data.profile_pic && data.profile_pic.startsWith('http')) {
            document.getElementById('nav-pfp').src      = data.profile_pic;
            document.getElementById('settings-pfp').src = data.profile_pic;
        }
        if (data.theme_bg) {
            document.body.style.backgroundImage    = `url('${data.theme_bg}')`;
            document.body.style.backgroundSize     = "cover";
            document.body.style.backgroundPosition = "center";
            const bgPreview = document.getElementById('bg-preview');
            bgPreview.style.backgroundImage = `url('${data.theme_bg}')`;
            bgPreview.classList.add('has-image');
        }
        if (data.theme_color) {
            document.getElementById('theme-color').value                   = data.theme_color;
            document.getElementById('color-hex').textContent               = data.theme_color;
            document.getElementById('color-preview-bar').style.background  = data.theme_color;
            document.documentElement.style.setProperty('--primary-teal', data.theme_color);
            highlightActiveSwatch(data.theme_color);
        }
        document.getElementById('acc-username').value = data.username || '';
    }
}

// AUTH
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "login.html"; return; }
    await loadSettings(user);
});

// LOGOUT
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});

// PROFILE PICTURE PREVIEW
document.getElementById('pfp-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    tempPfpFile = file;
    document.getElementById('pfp-filename').textContent = file.name;
    const reader = new FileReader();
    reader.onload = () => {
        document.getElementById('settings-pfp').src = reader.result;
        document.getElementById('nav-pfp').src       = reader.result;
    };
    reader.readAsDataURL(file);
});

// THEME COLOR
document.getElementById('theme-color').addEventListener('input', function() {
    const hex = this.value;
    document.getElementById('color-hex').textContent              = hex;
    document.getElementById('color-preview-bar').style.background = hex;
    document.documentElement.style.setProperty('--primary-teal', hex);
    highlightActiveSwatch(hex);
});

document.querySelectorAll('.preset-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        document.getElementById('theme-color').value                  = color;
        document.getElementById('color-hex').textContent              = color;
        document.getElementById('color-preview-bar').style.background = color;
        document.documentElement.style.setProperty('--primary-teal', color);
        highlightActiveSwatch(color);
    });
});

function highlightActiveSwatch(hex) {
    document.querySelectorAll('.preset-swatch').forEach(s => {
        s.classList.toggle('active', s.dataset.color.toLowerCase() === hex.toLowerCase());
    });
}

// BACKGROUND PREVIEW
document.getElementById('theme-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    removeBg = false;
    const reader = new FileReader();
    reader.onload = () => {
        tempThemeBg = reader.result;
        document.body.style.backgroundImage    = `url('${tempThemeBg}')`;
        document.body.style.backgroundSize     = "cover";
        document.body.style.backgroundPosition = "center";
        const bgPreview = document.getElementById('bg-preview');
        bgPreview.style.backgroundImage = `url('${tempThemeBg}')`;
        bgPreview.classList.add('has-image');
    };
    reader.readAsDataURL(file);
});

document.getElementById('btn-remove-bg').addEventListener('click', () => {
    tempThemeBg = null;
    removeBg    = true;
    document.body.style.backgroundImage = '';
    const bgPreview = document.getElementById('bg-preview');
    bgPreview.style.backgroundImage = '';
    bgPreview.classList.remove('has-image');
    document.getElementById('theme-upload').value = '';
});

// SAVE SETTINGS
document.getElementById('save-settings-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const newUsername = document.getElementById('acc-username').value.trim();
    const newPassword = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;

    if (newPassword || confirmPass) {
        if (!isValidPassword(newPassword)) {
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
        if (newPassword !== confirmPass) {
            Swal.fire('Mismatch', 'Passwords do not match.', 'warning');
            return;
        }
    }

    Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const dataToSave = {
            user_id:     user.uid,
            email:       user.email,
            username:    newUsername,
            theme_color: document.getElementById('theme-color').value,
            updated_at:  new Date().toISOString()
        };

        if (tempPfpFile) {
            const fileExt  = tempPfpFile.name.split('.').pop();
            const filePath = `profile-pictures/${user.uid}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, tempPfpFile, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
            dataToSave.profile_pic = `${publicUrl}?t=${Date.now()}`;
        }

        if (removeBg) {
            dataToSave.theme_bg = '';
        } else if (tempThemeBg) {
            dataToSave.theme_bg = tempThemeBg;
        }

        const { error: saveError } = await supabase
            .from('user_settings')
            .upsert(dataToSave, { onConflict: 'user_id' });
        if (saveError) throw saveError;

        if (newPassword) {
            const { value: currentPassword } = await Swal.fire({
                title: 'Confirm Identity',
                text: 'Enter your current password to change it:',
                input: 'password',
                inputPlaceholder: 'Current password',
                showCancelButton: true,
                confirmButtonColor: 'var(--primary-teal)',
                inputAttributes: { autocomplete: 'current-password' }
            });

            if (currentPassword) {
                const credential = EmailAuthProvider.credential(user.email, currentPassword);
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPassword);
                document.getElementById('new-password').value     = '';
                document.getElementById('confirm-password').value = '';
                document.getElementById('settings-strength-bar').style.display  = 'none';
                document.getElementById('settings-match-label').style.display   = 'none';
            }
        }

        tempPfpFile = null;
        tempThemeBg = null;
        removeBg    = false;

        Swal.fire({ title: 'Saved!', icon: 'success', timer: 1500, showConfirmButton: false });

    } catch (error) {
        console.error("Save error:", error);
        let msg = error.message;
        if (error.code === 'auth/wrong-password')        msg = 'Incorrect current password.';
        if (error.code === 'auth/too-many-requests')     msg = 'Too many attempts. Try again later.';
        if (error.code === 'auth/requires-recent-login') msg = 'Please logout and login again before changing your password.';
        Swal.fire('Error', msg, 'error');
    }
});