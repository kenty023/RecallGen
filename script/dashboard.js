import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { initProfileDropdown } from './profiledropdown.js';

// ── CONFIG ────────────────────────────────────────────────────────────────────
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

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// ── HELPERS ───────────────────────────────────────────────────────────────────
const getDisplayName = f => f.replace(/^\d+_/, '');

function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf')                            return 'fas fa-file-pdf';
    if (['png','jpg','jpeg','gif'].includes(ext)) return 'fas fa-file-image';
    if (['doc','docx'].includes(ext))             return 'fas fa-file-word';
    if (ext === 'pptx')                           return 'fas fa-file-powerpoint';
    if (ext === 'txt')                            return 'fas fa-file-alt';
    return 'fas fa-file';
}

function timeAgo(dateStr) {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60)        return 'just now';
    if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800)    return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function getActivityConfig(type) {
    const map = {
        upload:            { icon: 'fa-cloud-upload-alt', iconClass: 'upload',            badgeClass: 'upload',            badgeText: 'Upload'      },
        quiz:              { icon: 'fa-brain',            iconClass: 'quiz',              badgeClass: 'quiz',              badgeText: 'Quiz'        },
        rename:            { icon: 'fa-pencil-alt',       iconClass: 'rename',            badgeClass: 'rename',            badgeText: 'Rename'      },
        delete:            { icon: 'fa-trash',            iconClass: 'delete',            badgeClass: 'delete',            badgeText: 'Delete'      },
        password_reset:    { icon: 'fa-key',              iconClass: 'password',          badgeClass: 'password',          badgeText: 'Security'    },
        settings_pfp:      { icon: 'fa-user-circle',      iconClass: 'settings_pfp',      badgeClass: 'settings_pfp',      badgeText: 'Profile Pic' },
        settings_username: { icon: 'fa-id-badge',         iconClass: 'settings_username', badgeClass: 'settings_username', badgeText: 'Username'    },
        settings_color:    { icon: 'fa-palette',          iconClass: 'settings_color',    badgeClass: 'settings_color',    badgeText: 'Theme'       },
        settings_bg:       { icon: 'fa-image',            iconClass: 'settings_bg',       badgeClass: 'settings_bg',       badgeText: 'Background'  },
    };
    return map[type] || { icon: 'fa-bolt', iconClass: 'upload', badgeClass: 'upload', badgeText: type };
}

// ── BURGER MENU ───────────────────────────────────────────────────────────────
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
document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => {
    burgerBtn.classList.remove('open');
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
}));

// ── QUICKSTART BANNER ─────────────────────────────────────────────────────────
const qsLinks = ['dashboard.html', 'modules.html', 'quiz.html'];
document.querySelectorAll('.qs-step').forEach((step, i) => {
    step.style.cursor = 'pointer';
    step.addEventListener('click', () => window.location.href = qsLinks[i]);
});
document.getElementById('qs-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('quickstart-banner').classList.add('hidden');
});

function applyThemeColorToBanner(hex) {
    if (!hex) return;
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);

    const banner = document.getElementById('quickstart-banner');
    if (banner) {
        banner.style.background  = `linear-gradient(135deg, rgba(${r},${g},${b},0.12), rgba(${r},${g},${b},0.04))`;
        banner.style.borderColor = `rgba(${r},${g},${b},0.3)`;
    }
    document.querySelectorAll('.qs-step-icon').forEach(el => {
        el.style.background = `rgba(${r},${g},${b},0.12)`;
        el.style.color = hex;
    });
    document.querySelectorAll('.qs-step-num').forEach(el => el.style.background = hex);
    const qsTitle = document.querySelector('.qs-title');
    if (qsTitle) qsTitle.style.color = hex;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        if (localStorage.getItem('isRegistering') === 'true') {
            localStorage.removeItem('isRegistering');
            return;
        }
        window.location.href = 'login.html';
        return;
    }
    currentUser = user;

    try {
        const { data } = await supabase
            .from('user_settings').select('*')
            .eq('user_id', user.uid).single();

        if (data) {
            document.getElementById('display-username').innerText = data.username?.trim() || user.email.split('@')[0];
            if (data.profile_pic?.startsWith('http'))
                document.getElementById('nav-pfp').src = data.profile_pic;
            if (data.theme_bg) {
                document.body.style.backgroundImage    = `url('${data.theme_bg}')`;
                document.body.style.backgroundSize     = 'cover';
                document.body.style.backgroundPosition = 'center';
            }
            if (data.theme_color) {
                document.documentElement.style.setProperty('--primary-teal', data.theme_color);
                applyThemeColorToBanner(data.theme_color);
            }
        } else {
            document.getElementById('display-username').innerText = user.email.split('@')[0];
        }
    } catch (e) {
        console.error(e);
        document.getElementById('display-username').innerText = user.email.split('@')[0];
    }

    await loadActivity();
    await loadRecentModules(user.uid);
    await initProfileDropdown(user, supabase);
});

// ── LOGOUT ────────────────────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () =>
    signOut(auth).then(() => window.location.href = 'login.html')
);

// ── LOAD ACTIVITY ─────────────────────────────────────────────────────────────
async function loadActivity() {
    const list       = document.getElementById('activity-list');
    const countBadge = document.getElementById('activity-count');
    if (!list) return;

    const [logsRes, quizRes] = await Promise.all([
        supabase.from('activity_logs').select('*').eq('user_id', currentUser.uid).order('created_at', { ascending: false }).limit(20),
        supabase.from('quiz_results').select('*').eq('user_id', currentUser.uid).order('taken_at', { ascending: false }).limit(10)
    ]);

    const activities = [
        ...(logsRes.data || []).map(log => ({
            type: log.type, file_name: log.file_name,
            description: log.description,
            meta: log.meta ? JSON.parse(log.meta) : null,
            created_at: log.created_at
        })),
        ...(quizRes.data || []).map(q => ({
            type: 'quiz', file_name: q.module_name,
            meta: { score: q.score, total: q.total, percentage: q.percentage ?? (q.total ? Math.round((q.score/q.total)*100) : 0), quiz_type: q.quiz_type },
            created_at: q.taken_at
        }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (countBadge) countBadge.textContent = `${activities.length} recent`;
    list.innerHTML = '';

    if (!activities.length) {
        list.innerHTML = `
            <div class="activity-empty">
                <i class="fas fa-history"></i>
                <p>No activity yet. Start by uploading a module!</p>
            </div>`;

        // Auto-collapse when empty
        list.classList.add('collapsed');
        document.getElementById('activity-panel')?.classList.add('is-collapsed');
        const icon = document.getElementById('activity-toggle-icon');
        const btn  = document.getElementById('activity-toggle-btn');
        if (icon) icon.className = 'fas fa-chevron-down';
        if (btn)  btn.title = 'Show activity';
        return;
    }

    // Auto-expand when there is activity
    list.classList.remove('collapsed');
    document.getElementById('activity-panel')?.classList.remove('is-collapsed');
    const icon = document.getElementById('activity-toggle-icon');
    const btn  = document.getElementById('activity-toggle-btn');
    if (icon) icon.className = 'fas fa-chevron-up';
    if (btn)  btn.title = 'Hide activity';

    activities.slice(0, 10).forEach(act => {
        const cfg    = getActivityConfig(act.type);
        const time   = timeAgo(act.created_at);
        let metaLine = time;
        let descHTML = act.description || '';

        if (act.type === 'quiz' && act.meta) {
            const { score, total, percentage, quiz_type } = act.meta;
            metaLine = `${time} · ${score}/${total} correct · ${percentage}% · ${quiz_type || 'Quiz'}`;
            descHTML = `Took a quiz on <span class="activity-file">${act.file_name || ''}</span>`;
        } else if (act.type === 'upload') {
            descHTML = `Uploaded <span class="activity-file">${act.file_name || ''}</span>`;
        } else if (act.type === 'rename' && act.meta) {
            descHTML = `Renamed <span class="activity-file">${act.meta.old_name}</span> → <span class="activity-file">${act.meta.new_name}</span>`;
        } else if (act.type === 'delete') {
            descHTML = `Deleted <span class="activity-file">${act.file_name || ''}</span>`;
        } else if (act.type === 'password_reset') {
            descHTML = `<span class="activity-file">Password</span> was changed`;
        } else if (act.type === 'settings_pfp') {
            descHTML = `Updated <span class="activity-file">profile picture</span>`;
        } else if (act.type === 'settings_username' && act.meta) {
            descHTML = `Changed username to <span class="activity-file">${act.meta.new_name}</span>`;
        } else if (act.type === 'settings_color' && act.meta) {
            descHTML = `Changed theme color to <span class="activity-file" style="color:${act.meta.new_color}">${act.meta.new_color}</span>`;
        } else if (act.type === 'settings_bg') {
            descHTML = `${act.description?.includes('Removed') ? 'Removed' : 'Changed'} <span class="activity-file">background image</span>`;
        }

        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon ${cfg.iconClass}"><i class="fas ${cfg.icon}"></i></div>
            <div class="activity-info">
                <div class="activity-desc">${descHTML}</div>
                <div class="activity-meta">${metaLine}</div>
            </div>
            <span class="activity-badge ${cfg.badgeClass}">${cfg.badgeText}</span>`;
        list.appendChild(item);
    });
}

// ── CLEAR ACTIVITY ────────────────────────────────────────────────────────────
document.getElementById('activity-clear-btn')?.addEventListener('click', async () => {
    const result = await Swal.fire({
        title: 'Clear all activity?',
        text: 'This will permanently delete your activity history.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff4757',
        cancelButtonColor: '#aaa',
        confirmButtonText: 'Yes, clear it',
        cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;

    const { error } = await supabase
        .from('activity_logs')
        .delete()
        .eq('user_id', currentUser.uid);

    if (error) { Swal.fire('Error', error.message, 'error'); return; }

    Swal.fire({ title: 'Cleared!', icon: 'success', timer: 1000, showConfirmButton: false });
    await loadActivity();
});

// ── TOGGLE ACTIVITY PANEL ─────────────────────────────────────────────────────
const activityToggleBtn  = document.getElementById('activity-toggle-btn');
const activityToggleIcon = document.getElementById('activity-toggle-icon');
const activityList       = document.getElementById('activity-list');
const activityPanel      = document.getElementById('activity-panel');

let activityCollapsed = false;

activityToggleBtn?.addEventListener('click', () => {
    activityCollapsed = !activityCollapsed;
    activityList.classList.toggle('collapsed', activityCollapsed);
    activityPanel.classList.toggle('is-collapsed', activityCollapsed);
    activityToggleIcon.className = activityCollapsed
        ? 'fas fa-chevron-down'
        : 'fas fa-chevron-up';
    activityToggleBtn.title = activityCollapsed ? 'Show activity' : 'Hide activity';
});

// ── LOAD RECENT MODULES ───────────────────────────────────────────────────────
async function loadRecentModules(userId) {
    const listEl  = document.getElementById('recent-list');
    const countEl = document.getElementById('recent-count');
    if (!listEl) return;

    try {
        const { data, error } = await supabase
            .from('user_modules').select('*')
            .eq('user_id', userId)
            .order('uploaded_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        listEl.innerHTML = '';

        if (!data || !data.length) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>No uploads yet.<br>Upload your first module!</p>
                </div>`;
            if (countEl) countEl.textContent = '0 files';
            return;
        }

        if (countEl) countEl.textContent = `${data.length} file${data.length > 1 ? 's' : ''}`;

        data.forEach((module, index) => {
            const displayName = getDisplayName(module.file_name);
            const card = document.createElement('div');
            card.className = 'module-card';
            card.style.animationDelay = `${index * 0.1}s`;
            card.innerHTML = `
                <div class="module-icon"><i class="${getFileIcon(displayName)}"></i></div>
                <div class="module-info">
                    <div class="module-name" title="${displayName}">${displayName}</div>
                    <div class="module-date">${timeAgo(module.uploaded_at)}</div>
                </div>
                <button class="module-open-btn" title="Open file">
                    <i class="fas fa-external-link-alt"></i>
                </button>`;

            card.querySelector('.module-open-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(module.file_url, '_blank');
            });
            card.addEventListener('click', () => window.open(module.file_url, '_blank'));
            listEl.appendChild(card);
        });

    } catch (err) {
        console.error('Error loading recent modules:', err);
        listEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Could not load recent files.</p>
            </div>`;
    }
}

// ── UPLOAD HANDLER ────────────────────────────────────────────────────────────
const fileInput = document.getElementById('file-input');
const dropZone  = document.getElementById('drop-zone');

fileInput?.addEventListener('change', (e) => handleUpload(e.target.files[0]));
dropZone?.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary-teal)'; });
dropZone?.addEventListener('dragleave', ()  => { dropZone.style.borderColor = '#ddd'; });
dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#ddd';
    if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
});

async function handleUpload(file) {
    if (!file || !currentUser) return;
    if (file.size > 50 * 1024 * 1024) {
        Swal.fire('File too large', 'Maximum file size is 50MB.', 'warning');
        return;
    }

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${currentUser.uid}/${fileName}`;

    Swal.fire({ title: 'Uploading...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const { error: uploadError } = await supabase.storage.from('modules').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('modules').getPublicUrl(filePath);

        await supabase.from('user_modules').insert({
            user_id: currentUser.uid, file_name: fileName,
            file_url: publicUrl, uploaded_at: new Date().toISOString()
        });
        await supabase.from('activity_logs').insert({
            user_id: currentUser.uid, type: 'upload',
            description: `Uploaded ${file.name}`, file_name: file.name,
            created_at: new Date().toISOString()
        });

        Swal.fire({ title: 'Upload Complete!', text: 'Your module has been uploaded successfully.', icon: 'success', timer: 1500, showConfirmButton: false });

        await loadActivity();
        await loadRecentModules(currentUser.uid);

    } catch (error) {
        console.error('Upload Error:', error);
        Swal.fire('Upload Failed', error.message, 'error');
    }
}