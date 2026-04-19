import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { initProfileDropdown } from './profiledropdown.js';

//  CONFIG 
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

//  INIT 
const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

function getDisplayName(storageFilename) {
    return storageFilename.replace(/^\d+_/, '');
}

// ── LOG ACTIVITY HELPER ──────────────────────────────────────────────────────
async function logActivity(type, description, fileName = null, meta = null) {
    try {
        await supabase.from('activity_logs').insert({
            user_id:     currentUser.uid,
            type,
            description,
            file_name:   fileName,
            meta:        meta ? JSON.stringify(meta) : null,
            created_at:  new Date().toISOString()
        });
    } catch (e) {
        console.warn('logActivity failed:', e.message);
    }
}

// ── KEBAB DROPDOWN STYLES
const style = document.createElement('style');
style.textContent = `
.kebab-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 8px;
    color: #888;
    font-size: 1.1rem;
    transition: background 0.15s, color 0.15s;
    line-height: 1;
    flex-shrink: 0;
}
.kebab-btn:hover { background: rgba(0,0,0,0.07); color: #555; }

.kebab-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.13);
    border: 1px solid rgba(0,0,0,0.08);
    min-width: 160px;
    z-index: 999;
    overflow: hidden;
    animation: kebabIn 0.15s ease;
}
@keyframes kebabIn {
    from { opacity:0; transform:translateY(-6px) scale(0.97); }
    to   { opacity:1; transform:translateY(0) scale(1); }
}
.kebab-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    font-size: 0.85rem;
    color: #444;
    cursor: pointer;
    transition: background 0.12s;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    font-family: 'Poppins', sans-serif;
}
.kebab-option:hover { background: #f5f5f5; }
.kebab-option.danger { color: #ff4757; }
.kebab-option.danger:hover { background: #fff0f1; }
.kebab-option i { width: 16px; text-align: center; font-size: 0.8rem; }
.kebab-divider {
    height: 1px;
    background: rgba(0,0,0,0.07);
    margin: 4px 0;
}
.mod-actions { position: relative; }

.rename-input {
    border: 1.5px solid var(--primary-teal, #2d5a53);
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 0.9rem;
    font-family: 'Poppins', sans-serif;
    outline: none;
    width: 100%;
    max-width: 300px;
    background: #fff;
}
.rename-actions {
    display: flex;
    gap: 6px;
    margin-top: 6px;
}
.rename-save-btn, .rename-cancel-btn {
    border: none;
    border-radius: 7px;
    padding: 4px 12px;
    font-size: 0.78rem;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    transition: opacity 0.15s;
}
.rename-save-btn { background: var(--primary-teal, #2d5a53); color: #fff; }
.rename-cancel-btn { background: rgba(0,0,0,0.07); color: #666; }
.rename-save-btn:hover, .rename-cancel-btn:hover { opacity: 0.85; }
`;
document.head.appendChild(style);

//  CLOSE ALL OPEN DROPDOWNS 
function closeAllDropdowns() {
    document.querySelectorAll('.kebab-menu').forEach(m => m.remove());
}
document.addEventListener('click', closeAllDropdowns);

//  BURGER MENU 
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
document.querySelectorAll('.nav-item:not(#take-quiz-toggle)').forEach(item => {
    item.addEventListener('click', () => {
        burgerBtn.classList.remove('open');
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
    });
});

//  AUTH 
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "login.html"; return; }
    currentUser = user;

    try {
        const { data } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.uid)
            .single();

        if (data) {
            if (data.profile_pic && data.profile_pic.startsWith('http')) {
                document.getElementById('nav-pfp').src = data.profile_pic;
            }
            if (data.theme_bg) {
                document.body.style.backgroundImage    = `url('${data.theme_bg}')`;
                document.body.style.backgroundSize     = "cover";
                document.body.style.backgroundPosition = "center";
            }
            if (data.theme_color) {
                document.documentElement.style.setProperty('--primary-teal', data.theme_color);
            }
            const usernameEl = document.getElementById('display-username');
            if (usernameEl) {
                usernameEl.innerText = data.username?.trim() || user.email.split('@')[0];
            }
        }
    } catch(e) { console.error(e); }

    await loadModules();
    await initProfileDropdown(user, supabase);
});

//  LOGOUT 
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});

//  HELPERS 
function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const map = { pdf:'fa-file-pdf', docx:'fa-file-word', doc:'fa-file-word', txt:'fa-file-alt', pptx:'fa-file-powerpoint', png:'fa-file-image', jpg:'fa-file-image', jpeg:'fa-file-image' };
    return map[ext] || 'fa-file';
}

//  LOAD MODULES
async function loadModules() {
    const list = document.getElementById('modules-list');

    const { data, error } = await supabase.storage
        .from('modules')
        .list(currentUser.uid, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
        list.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load modules.</p></div>`;
        return;
    }

    const files = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder');

    const totalSize = files.reduce((s, f) => s + (f.metadata?.size || 0), 0);
    document.getElementById('stat-count').textContent = files.length;
    document.getElementById('stat-size').textContent  = formatSize(totalSize);

    if (!files.length) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No modules yet. <a href="dashboard.html">Upload your first module!</a></p>
            </div>`;
        return;
    }

    list.innerHTML = '';
    files.forEach(file => renderModuleItem(file, list));
}

//  RENDER MODULE ITEM 
function renderModuleItem(file, container) {
    const date        = new Date(file.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const size        = formatSize(file.metadata?.size);
    const displayName = getDisplayName(file.name);
    const icon        = getIcon(displayName);

    const item = document.createElement('div');
    item.className = 'module-item';
    item.dataset.filename = file.name;

    item.innerHTML = `
        <div class="mod-file-icon"><i class="fas ${icon}"></i></div>
        <div class="mod-file-info">
            <div class="mod-file-name">
                <span class="name-text">${displayName}</span>
            </div>
            <div class="mod-file-meta">
                <span><i class="fas fa-weight-hanging"></i> ${size}</span>
                <span><i class="fas fa-calendar"></i> ${date}</span>
            </div>
        </div>
        <div class="mod-actions">
            <button class="kebab-btn" title="More options">&#8942;</button>
        </div>`;

    const kebabBtn   = item.querySelector('.kebab-btn');
    const actionsDiv = item.querySelector('.mod-actions');

    kebabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();

        const menu = document.createElement('div');
        menu.className = 'kebab-menu';
        menu.innerHTML = `
            <button class="kebab-option" data-action="rename">
                <i class="fas fa-pencil-alt"></i> Rename
            </button>
            <button class="kebab-option" data-action="quiz">
                <i class="fas fa-brain"></i> Take Quiz
            </button>
            <div class="kebab-divider"></div>
            <button class="kebab-option danger" data-action="delete">
                <i class="fas fa-trash"></i> Delete
            </button>`;

        actionsDiv.appendChild(menu);

        menu.querySelector('[data-action="rename"]').addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            startRename(item, file);
        });

        menu.querySelector('[data-action="quiz"]').addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            window.location.href = `quiz.html?file=${encodeURIComponent(displayName)}`;
        });

        menu.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            deleteModule(item, file);
        });
    });

    container.appendChild(item);
}

//  START RENAME 
function startRename(item, file) {
    const nameDiv     = item.querySelector('.mod-file-name');
    const displayName = getDisplayName(file.name);
    const ext         = displayName.split('.').pop();
    const nameNoExt   = displayName.slice(0, -(ext.length + 1));

    nameDiv.innerHTML = `
        <input class="rename-input" type="text" value="${nameNoExt}" maxlength="100" />
        <div class="rename-actions">
            <button class="rename-save-btn"><i class="fas fa-check"></i> Save</button>
            <button class="rename-cancel-btn">Cancel</button>
        </div>`;

    const input = nameDiv.querySelector('.rename-input');
    input.focus();
    input.select();

    nameDiv.querySelector('.rename-save-btn').addEventListener('click', () => {
        confirmRename(item, file, input.value.trim(), ext);
    });

    nameDiv.querySelector('.rename-cancel-btn').addEventListener('click', () => {
        nameDiv.innerHTML = `<span class="name-text">${displayName}</span>`;
    });

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter')  confirmRename(item, file, input.value.trim(), ext);
        if (e.key === 'Escape') nameDiv.querySelector('.rename-cancel-btn').click();
    });
}

//  CONFIRM RENAME 
async function confirmRename(item, file, newNameNoExt, ext) {
    if (!newNameNoExt) {
        Swal.fire('Empty name', 'Please enter a valid filename.', 'warning');
        return;
    }

    const newDisplayName = `${newNameNoExt}.${ext}`;
    const oldDisplayName = getDisplayName(file.name);

    if (newDisplayName === oldDisplayName) {
        item.querySelector('.rename-cancel-btn')?.click();
        return;
    }

    const timestampMatch  = file.name.match(/^(\d+_)/);
    const timestampPrefix = timestampMatch ? timestampMatch[1] : `${Date.now()}_`;
    const newStorageName  = `${timestampPrefix}${newDisplayName}`;

    const oldPath = `${currentUser.uid}/${file.name}`;
    const newPath = `${currentUser.uid}/${newStorageName}`;

    Swal.fire({ title: 'Renaming...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const { data: blob, error: dlErr } = await supabase.storage
            .from('modules').download(oldPath);
        if (dlErr) throw dlErr;

        const { error: upErr } = await supabase.storage
            .from('modules').upload(newPath, blob, { upsert: false });
        if (upErr) throw upErr;

        const { error: delErr } = await supabase.storage
            .from('modules').remove([oldPath]);
        if (delErr) throw delErr;

        const newPublicUrl = supabase.storage
            .from('modules').getPublicUrl(newPath).data.publicUrl;

        const { error: modErr } = await supabase
            .from('user_modules')
            .update({
                file_name:   newStorageName,
                file_url:    newPublicUrl,
                uploaded_at: new Date().toISOString()
            })
            .eq('user_id', currentUser.uid)
            .eq('file_name', file.name);
        if (modErr) console.warn('user_modules update failed:', modErr.message);

        const { error: quizErr } = await supabase
            .from('quiz_results')
            .update({ module_name: newDisplayName })
            .eq('user_id', currentUser.uid)
            .eq('module_name', oldDisplayName);
        if (quizErr) console.warn('quiz_results update failed:', quizErr.message);

        // ── LOG: RENAME ──────────────────────────────────────────────────────
        await logActivity(
            'rename',
            `Renamed module from "${oldDisplayName}" to "${newDisplayName}"`,
            newDisplayName,
            { old_name: oldDisplayName, new_name: newDisplayName }
        );

        Swal.fire({ title: 'Renamed!', icon: 'success', timer: 1200, showConfirmButton: false });

        const nameDiv = item.querySelector('.mod-file-name');
        nameDiv.innerHTML = `<span class="name-text">${newDisplayName}</span>`;
        item.dataset.filename = newStorageName;
        file.name = newStorageName;

    } catch (err) {
        console.error(err);
        Swal.fire('Error', err.message, 'error');
    }
}

//  DELETE MODULE 
async function deleteModule(item, file) {
    const displayName = getDisplayName(file.name);

    const confirm = await Swal.fire({
        title: 'Delete module?',
        text: `"${displayName}" will be permanently deleted.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff4757',
        cancelButtonColor: '#aaa',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
    });

    if (!confirm.isConfirmed) return;

    const { error: storageError } = await supabase.storage
        .from('modules')
        .remove([`${currentUser.uid}/${file.name}`]);

    if (storageError) { Swal.fire('Error', storageError.message, 'error'); return; }

    const { error: dbError } = await supabase
        .from('user_modules')
        .delete()
        .eq('user_id', currentUser.uid)
        .eq('file_name', file.name);

    if (dbError) console.warn('Could not remove from user_modules:', dbError.message);

// ── LOG: DELETE ──────────────────────────────────────────────────────────
    const { data: logData, error: logError } = await supabase
        .from('activity_logs')
        .insert({
            user_id:     currentUser.uid,
            type:        'delete',
            description: `Deleted module "${displayName}"`,
            file_name:   displayName,
            created_at:  new Date().toISOString()
        });

    console.log('LOG RESULT:', logData, logError);
}

// TAKE QUIZ TOGGLE
const toggle = document.getElementById('take-quiz-toggle');
const arrow  = document.getElementById('quiz-arrow');

arrow.style.transform = 'rotate(180deg)';

toggle.addEventListener('click', () => {
    window.location.href = 'quiz.html';
});