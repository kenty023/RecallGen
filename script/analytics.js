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

let allResults  = [];
let activeRange = 'week';
let charts      = {};

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

    await loadAllResults(user.uid);
});

// ── LOGOUT ─────────────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});

// ── LOAD ALL RESULTS ───────────────────────────────────────────────────
async function loadAllResults(userId) {
    const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', userId)
        .order('taken_at', { ascending: true });

    if (error) { console.error(error); return; }
    allResults = data || [];
    updateAll();
}

// ── FILTER BY RANGE ────────────────────────────────────────────────────
function getFilteredResults() {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (activeRange === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 6);
        return allResults.filter(r => new Date(r.taken_at) >= weekAgo);
    } else if (activeRange === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 29);
        return allResults.filter(r => new Date(r.taken_at) >= monthAgo);
    }
    return allResults;
}

// ── RANGE BUTTONS ──────────────────────────────────────────────────────
document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeRange = btn.dataset.range;
        updateAll();
    });
});

// ── UPDATE ALL ─────────────────────────────────────────────────────────
function updateAll() {
    const filtered = getFilteredResults();
    updateStatCards(filtered);
    renderConsistencyChart(filtered);
    renderTrendChart(filtered);
    renderTypeChart(filtered);
    renderPerfChart(filtered);
}

// ── STAT CARDS ─────────────────────────────────────────────────────────
function updateStatCards(data) {
    const total = data.length;
    const avg   = total ? Math.round(data.reduce((s, r) => s + r.percentage, 0) / total) : 0;

    // Score trend — compare first half vs second half
    let trend = '—';
    if (data.length >= 2) {
        const half    = Math.floor(data.length / 2);
        const firstH  = data.slice(0, half).reduce((s, r) => s + r.percentage, 0) / half;
        const secondH = data.slice(half).reduce((s, r) => s + r.percentage, 0) / (data.length - half);
        const diff    = Math.round(secondH - firstH);
        trend = diff >= 0 ? `+${diff}%` : `${diff}%`;
    }

    // Streak — consecutive days with at least 1 quiz
    const streak = calcStreak();

    document.getElementById('s-streak').textContent = streak > 0 ? `${streak} 🔥` : '0';
    document.getElementById('s-total').textContent  = total;
    document.getElementById('s-avg').textContent    = total ? `${avg}%` : '—';
    document.getElementById('s-trend').textContent  = trend;

    // Color trend
    const trendEl = document.getElementById('s-trend');
    if (trend.startsWith('+')) trendEl.style.color = '#2ed573';
    else if (trend.startsWith('-')) trendEl.style.color = '#ff4757';
    else trendEl.style.color = '';
}

function calcStreak() {
    if (!allResults.length) return 0;
    const days = new Set(allResults.map(r =>
        new Date(r.taken_at).toLocaleDateString('en-CA')
    ));
    let streak = 0;
    const today = new Date();
    let check   = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    while (days.has(check.toLocaleDateString('en-CA'))) {
        streak++;
        check.setDate(check.getDate() - 1);
    }
    return streak;
}

// ── CHART HELPERS ──────────────────────────────────────────────────────
function getColor() {
    return getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-teal').trim() || '#2D5A53';
}

function destroyChart(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

// ── CONSISTENCY CHART (Bar) ────────────────────────────────────────────
function renderConsistencyChart(data) {
    destroyChart('consistency');

    const days = activeRange === 'week' ? 7 : activeRange === 'month' ? 30 : 60;
    const labels = [];
    const counts = [];

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-CA');
        const label = activeRange === 'week'
            ? d.toLocaleDateString('en-US', { weekday: 'short' })
            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labels.push(label);
        counts.push(data.filter(r =>
            new Date(r.taken_at).toLocaleDateString('en-CA') === key
        ).length);
    }

    const color = getColor();
    const ctx = document.getElementById('chart-consistency').getContext('2d');
    charts.consistency = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Quizzes',
                data: counts,
                backgroundColor: counts.map(c => c > 0
                    ? color + 'cc'
                    : 'rgba(200,200,200,0.3)'),
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, font: { family: 'Poppins', size: 11 } },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    ticks: { font: { family: 'Poppins', size: 10 } },
                    grid: { display: false }
                }
            }
        }
    });
}

// ── TREND CHART (Line) ─────────────────────────────────────────────────
function renderTrendChart(data) {
    destroyChart('trend');
    if (!data.length) return;

    const color  = getColor();
    const labels = data.map((r, i) => `#${i + 1}`);
    const scores = data.map(r => r.percentage);

    // Moving average (3-quiz window)
    const ma = scores.map((_, i) => {
        const window = scores.slice(Math.max(0, i - 2), i + 1);
        return Math.round(window.reduce((a, b) => a + b, 0) / window.length);
    });

    const ctx = document.getElementById('chart-trend').getContext('2d');
    charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Score %',
                    data: scores,
                    borderColor: color,
                    backgroundColor: color + '22',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: color,
                    tension: 0.4,
                    fill: true,
                },
                {
                    label: 'Avg Trend',
                    data: ma,
                    borderColor: '#ffa502',
                    borderWidth: 2,
                    borderDash: [5, 4],
                    pointRadius: 0,
                    tension: 0.4,
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { font: { family: 'Poppins', size: 11 }, boxWidth: 12 }
                }
            },
            scales: {
                y: {
                    min: 0, max: 100,
                    ticks: {
                        callback: v => `${v}%`,
                        font: { family: 'Poppins', size: 11 }
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    ticks: { font: { family: 'Poppins', size: 10 } },
                    grid: { display: false }
                }
            }
        }
    });
}

// ── TYPE DONUT CHART ───────────────────────────────────────────────────
function renderTypeChart(data) {
    destroyChart('types');
    if (!data.length) return;

    const types  = ['Multiple Choice', 'True / False', 'Identification'];
    const counts = types.map(t => data.filter(r => r.quiz_type === t).length);

    const ctx = document.getElementById('chart-types').getContext('2d');
    charts.types = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: types,
            datasets: [{
                data: counts,
                backgroundColor: ['#2D5A53cc', '#ffa502cc', '#1a4a7acc'],
                borderWidth: 0,
                hoverOffset: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { family: 'Poppins', size: 11 }, boxWidth: 12, padding: 12 }
                }
            }
        }
    });
}

// ── PERFORMANCE BY TYPE (Horizontal Bar) ──────────────────────────────
function renderPerfChart(data) {
    destroyChart('perf');
    if (!data.length) return;

    const types = ['Multiple Choice', 'True / False', 'Identification'];
    const avgs  = types.map(t => {
        const group = data.filter(r => r.quiz_type === t);
        if (!group.length) return 0;
        return Math.round(group.reduce((s, r) => s + r.percentage, 0) / group.length);
    });

    const colors = avgs.map(a => a >= 75 ? '#2ed573cc' : a >= 50 ? '#ffa502cc' : '#ff4757cc');

    const ctx = document.getElementById('chart-perf').getContext('2d');
    charts.perf = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Multiple\nChoice', 'True /\nFalse', 'Identification'],
            datasets: [{
                label: 'Avg Score %',
                data: avgs,
                backgroundColor: colors,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: ctx => ` ${ctx.raw}%` }
                }
            },
            scales: {
                x: {
                    min: 0, max: 100,
                    ticks: {
                        callback: v => `${v}%`,
                        font: { family: 'Poppins', size: 11 }
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    ticks: { font: { family: 'Poppins', size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
}