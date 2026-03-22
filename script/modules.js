// ── IMPORTS ────────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ── CONFIG ─────────────────────────────────────────────────────────────
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

// ── INIT ───────────────────────────────────────────────────────────────
const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// ── BURGER MENU ────────────────────────────────────────────────────────
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

// ── AUTH ───────────────────────────────────────────────────────────────
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
        }
    } catch(e) { console.error(e); }

    await loadModules();
});

// ── LOGOUT ─────────────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});

// ── HELPERS ────────────────────────────────────────────────────────────
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

// ── LOAD MODULES ───────────────────────────────────────────────────────
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

    // Update stats
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

// ── RENDER MODULE ITEM ─────────────────────────────────────────────────
function renderModuleItem(file, container) {
    const date = new Date(file.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const size = formatSize(file.metadata?.size);
    const icon = getIcon(file.name);

    const item = document.createElement('div');
    item.className = 'module-item';
    item.dataset.filename = file.name;

    item.innerHTML = `
        <div class="mod-file-icon"><i class="fas ${icon}"></i></div>
        <div class="mod-file-info">
            <div class="mod-file-name">
                <span class="name-text">${file.name}</span>
                <i class="fas fa-pencil-alt edit-icon"></i>
            </div>
            <div class="mod-file-meta">
                <span><i class="fas fa-weight-hanging"></i> ${size}</span>
                <span><i class="fas fa-calendar"></i> ${date}</span>
            </div>
        </div>
        <div class="mod-actions">
            <button class="mod-btn mod-btn-rename" title="Rename"><i class="fas fa-pencil-alt"></i></button>
            <button class="mod-btn mod-btn-delete" title="Delete"><i class="fas fa-trash"></i></button>
        </div>`;

    // Rename button
    item.querySelector('.mod-btn-rename').addEventListener('click', () => startRename(item, file));

    // Delete button
    item.querySelector('.mod-btn-delete').addEventListener('click', () => deleteModule(item, file));

    container.appendChild(item);
}

// ── START RENAME ───────────────────────────────────────────────────────
function startRename(item, file) {
    const nameDiv   = item.querySelector('.mod-file-name');
    const actionsDiv = item.querySelector('.mod-actions');
    const ext        = file.name.split('.').pop();
    const nameNoExt  = file.name.replace(`.${ext}`, '');

    // Replace name text with input
    nameDiv.innerHTML = `
        <input class="rename-input" type="text" value="${nameNoExt}" maxlength="100">`;

    const input = nameDiv.querySelector('.rename-input');
    input.focus();
    input.select();

    // Replace buttons with confirm/cancel
    actionsDiv.innerHTML = `
        <button class="mod-btn mod-btn-confirm" title="Save"><i class="fas fa-check"></i></button>
        <button class="mod-btn mod-btn-cancel" title="Cancel"><i class="fas fa-times"></i></button>`;

    // Confirm
    actionsDiv.querySelector('.mod-btn-confirm').addEventListener('click', () => {
        confirmRename(item, file, input.value.trim(), ext);
    });

    // Cancel
    actionsDiv.querySelector('.mod-btn-cancel').addEventListener('click', () => {
        // Restore original
        nameDiv.innerHTML = `
            <span class="name-text">${file.name}</span>
            <i class="fas fa-pencil-alt edit-icon"></i>`;
        actionsDiv.innerHTML = `
            <button class="mod-btn mod-btn-rename" title="Rename"><i class="fas fa-pencil-alt"></i></button>
            <button class="mod-btn mod-btn-delete" title="Delete"><i class="fas fa-trash"></i></button>`;
        actionsDiv.querySelector('.mod-btn-rename').addEventListener('click', () => startRename(item, file));
        actionsDiv.querySelector('.mod-btn-delete').addEventListener('click', () => deleteModule(item, file));
    });

    // Enter key to confirm
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') confirmRename(item, file, input.value.trim(), ext);
        if (e.key === 'Escape') actionsDiv.querySelector('.mod-btn-cancel').click();
    });
}

// ── CONFIRM RENAME ─────────────────────────────────────────────────────
async function confirmRename(item, file, newNameNoExt, ext) {
    if (!newNameNoExt) {
        Swal.fire('Empty name', 'Please enter a valid filename.', 'warning');
        return;
    }

    const newName    = `${newNameNoExt}.${ext}`;
    if (newName === file.name) {
        // No change — cancel
        item.querySelector('.mod-btn-cancel')?.click();
        return;
    }

    const oldPath = `${currentUser.uid}/${file.name}`;
    const newPath = `${currentUser.uid}/${newName}`;

    Swal.fire({ title: 'Renaming...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        // 1. Download original file
        const { data: blob, error: dlErr } = await supabase.storage
            .from('modules')
            .download(oldPath);
        if (dlErr) throw dlErr;

        // 2. Upload with new name
        const { error: upErr } = await supabase.storage
            .from('modules')
            .upload(newPath, blob, { upsert: false });
        if (upErr) throw upErr;

        // 3. Delete old file
        const { error: delErr } = await supabase.storage
            .from('modules')
            .remove([oldPath]);
        if (delErr) throw delErr;

        // 4. Update quiz_results module_name if any
        await supabase
            .from('quiz_results')
            .update({ module_name: newName })
            .eq('user_id', currentUser.uid)
            .eq('module_name', file.name);

        Swal.fire({ title: 'Renamed!', icon: 'success', timer: 1200, showConfirmButton: false });

        // Update the item display
        item.dataset.filename = newName;
        const nameDiv    = item.querySelector('.mod-file-name');
        const actionsDiv = item.querySelector('.mod-actions');

        nameDiv.innerHTML = `
            <span class="name-text">${newName}</span>
            <i class="fas fa-pencil-alt edit-icon"></i>`;
        actionsDiv.innerHTML = `
            <button class="mod-btn mod-btn-rename" title="Rename"><i class="fas fa-pencil-alt"></i></button>
            <button class="mod-btn mod-btn-delete" title="Delete"><i class="fas fa-trash"></i></button>`;

        const newFile = { ...file, name: newName };
        actionsDiv.querySelector('.mod-btn-rename').addEventListener('click', () => startRename(item, newFile));
        actionsDiv.querySelector('.mod-btn-delete').addEventListener('click', () => deleteModule(item, newFile));

    } catch(err) {
        console.error(err);
        Swal.fire('Error', err.message, 'error');
    }
}

// ── DELETE MODULE ──────────────────────────────────────────────────────
async function deleteModule(item, file) {
    const confirm = await Swal.fire({
        title: 'Delete module?',
        text: `"${file.name}" will be permanently deleted.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff4757',
        cancelButtonColor: '#aaa',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
    });

    if (!confirm.isConfirmed) return;

    const { error } = await supabase.storage
        .from('modules')
        .remove([`${currentUser.uid}/${file.name}`]);

    if (error) { Swal.fire('Error', error.message, 'error'); return; }

    item.remove();

    // Update stats
    const remaining = document.querySelectorAll('.module-item').length;
    document.getElementById('stat-count').textContent = remaining;

    Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1000, showConfirmButton: false });
}