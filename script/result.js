import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

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

let allResults  = [];
let activeFilter = 'All';

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
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        burgerBtn.classList.remove('open');
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
    });
});

//  AUTH 
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "login.html"; return; }

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

    await loadResults(user.uid);
});

//  LOGOUT 
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});

//  LOAD RESULTS 
async function loadResults(userId) {
    const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', userId)
        .order('taken_at', { ascending: false });

    if (error) {
        document.getElementById('results-list').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load results.</p>
            </div>`;
        return;
    }

    allResults = data || [];
    updateStats();
    renderResults();
}

//  UPDATE STATS 
function updateStats() {
    const total = allResults.length;
    const avg   = total ? Math.round(allResults.reduce((s, r) => s + r.percentage, 0) / total) : 0;
    const best  = total ? Math.max(...allResults.map(r => r.percentage)) : 0;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-avg').textContent   = total ? `${avg}%` : '—';
    document.getElementById('stat-best').textContent  = total ? `${best}%` : '—';
}

//  RENDER RESULTS 
function renderResults() {
    const list = document.getElementById('results-list');
    const filtered = activeFilter === 'All'
        ? allResults
        : allResults.filter(r => r.quiz_type === activeFilter);

    if (!filtered.length) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>${activeFilter === 'All'
                    ? 'No quizzes taken yet. <a href="quiz.html">Take your first quiz!</a>'
                    : `No ${activeFilter} quizzes yet.`}
                </p>
            </div>`;
        return;
    }

    list.innerHTML = filtered.map(r => {
        const scoreClass = r.percentage >= 75 ? 'high' : r.percentage >= 50 ? 'mid' : 'low';
        const date       = new Date(r.taken_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
        const time       = new Date(r.taken_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
        const moduleName = r.module_name.replace(/^\d+\./, '') || r.module_name;

        return `
        <div class="result-item" data-id="${r.id}">
            <div class="result-score ${scoreClass}">
                <span class="pct">${r.percentage}%</span>
                <span class="lbl">score</span>
            </div>
            <div class="result-info">
                <div class="result-module">${moduleName}</div>
                <div class="result-meta">
                    <span><i class="fas fa-check-circle"></i> ${r.score}/${r.total} correct</span>
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                    <span><i class="fas fa-clock"></i> ${time}</span>
                </div>
            </div>
            <div class="result-type-pill">${r.quiz_type}</div>
            <button class="btn-delete" data-id="${r.id}" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>`;
    }).join('');

    // Attach delete listeners
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteResult(btn.dataset.id);
        });
    });
}

//DELETE RESULT
async function deleteResult(id) {
    const confirm = await Swal.fire({
        title: 'Delete this result?',
        text: 'This cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff4757',
        cancelButtonColor: '#aaa',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel'
    });

    if (!confirm.isConfirmed) return;

    const { error } = await supabase
        .from('quiz_results')
        .delete()
        .eq('id', id);

    if (error) {
        Swal.fire('Error', error.message, 'error');
        return;
    }

    // Remove from local array and re-render
    allResults = allResults.filter(r => r.id !== id);
    updateStats();
    renderResults();

    Swal.fire({
        title: 'Deleted!',
        icon: 'success',
        timer: 1000,
        showConfirmButton: false
    });
}

//FILTER BUTTONS
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderResults();
    });
});