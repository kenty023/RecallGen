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

let allResults   = [];
let activeFilter = 'All';

// ── DARK MODE HELPER ──
function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

// ── TIMER HELPER ──
function formatTime(seconds) {
    if (!seconds && seconds !== 0) return null;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// ── PROGRESS RING HELPER ──
function scoreRing(percentage, scoreClass) {
    const color = scoreClass === 'high' ? '#2ed573'
                : scoreClass === 'mid'  ? '#ffa502'
                :                         '#ff4757';
    const r = 26;
    const circumference = 2 * Math.PI * r;
    const filled = (percentage / 100) * circumference;

    return `
        <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
            <circle cx="30" cy="30" r="${r}"
                fill="none" stroke="${color}" stroke-opacity="0.15"
                stroke-width="4"/>
            <circle cx="30" cy="30" r="${r}"
                fill="none" stroke="${color}" stroke-width="4"
                stroke-linecap="round"
                stroke-dasharray="${filled} ${circumference}"
                stroke-dashoffset="0"/>
        </svg>
    `;
}

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

    await loadResults(user.uid);
    await initProfileDropdown(user, supabase);
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

    const bestResult = total
        ? allResults.reduce((best, r) => r.percentage > best.percentage ? r : best, allResults[0])
        : null;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-avg').textContent   = total ? `${avg}%` : '—';
    document.getElementById('stat-best').textContent  = bestResult ? `${bestResult.score}/${bestResult.total}` : '—';
}

// GROUP results by module_name + quiz_type
function groupResults(results) {
    const map = new Map();
    for (const r of results) {
        const key = `${r.module_name}||${r.quiz_type}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(r);
    }
    return Array.from(map.values());
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

    const groups = groupResults(filtered);

    list.innerHTML = groups.map(group => {
        const latest     = group[0];
        const past       = group.slice(1);
        const scoreClass = latest.percentage >= 75 ? 'high' : latest.percentage >= 50 ? 'mid' : 'low';
        const date       = new Date(latest.taken_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
        const time       = new Date(latest.taken_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
        const moduleName = latest.module_name.replace(/^\d+\./, '') || latest.module_name;
        const groupKey   = encodeURIComponent(`${latest.module_name}||${latest.quiz_type}`).replace(/%/g, '');
        const hasHistory = past.length > 0;

        const timeFormatted = formatTime(latest.time_taken);
        const timeBadge = timeFormatted
            ? `<span class="time-badge"><i class="fas fa-stopwatch"></i>${timeFormatted}</span>`
            : '';

        const historyRows = [...past].reverse().map((attempt, idx) => {
            const aDate      = new Date(attempt.taken_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
            const aTime      = new Date(attempt.taken_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
            const aColor     = attempt.percentage >= 75 ? '#27ae60' : attempt.percentage >= 50 ? '#ffa502' : '#ff4757';
            const attemptNum = idx + 1;
            const aTimeFmt   = formatTime(attempt.time_taken);

            return `
            <div class="history-row" data-id="${attempt.id}" style="
                display:flex;align-items:center;gap:10px;
                padding:9px 12px;border-radius:10px;
                background:rgba(128,128,128,0.12);
                margin-bottom:6px;
                cursor:pointer;
                transition:background 0.15s;
            " onmouseover="this.style.background='rgba(128,128,128,0.22)'" onmouseout="this.style.background='rgba(128,128,128,0.12)'">
                <span style="min-width:40px;text-align:center;font-weight:700;color:${aColor};font-size:0.85rem;">
                    ${attempt.percentage}%
                </span>
                <span style="color:var(--text-main,inherit);opacity:0.8;font-size:0.75rem;flex:1;font-weight:600;">
                    Attempt ${attemptNum}
                </span>
                ${aTimeFmt ? `<span class="time-badge"><i class="fas fa-stopwatch"></i>${aTimeFmt}</span>` : ''}
                <span style="color:var(--text-main,inherit);opacity:0.55;font-size:0.72rem;">
                    <i class="fas fa-tag" style="margin-right:3px;font-size:0.62rem;"></i>${attempt.quiz_type}
                </span>
                <span style="color:var(--text-main,inherit);opacity:0.55;font-size:0.72rem;">
                    <i class="fas fa-calendar" style="margin-right:3px;font-size:0.62rem;"></i>${aDate}
                </span>
                <span style="color:var(--text-main,inherit);opacity:0.55;font-size:0.72rem;">
                    <i class="fas fa-clock" style="margin-right:3px;font-size:0.62rem;"></i>${aTime}
                </span>
                <span style="color:var(--primary-teal);font-size:0.68rem;font-weight:600;">View →</span>
            </div>`;
        }).join('');

        return `
        <div class="result-item-wrapper" style="margin-bottom:14px;">
            <div class="result-item" data-id="${latest.id}" style="
                border-radius:${hasHistory ? '16px 16px 0 0' : '16px'};
                margin-bottom:0;
                border-bottom:${hasHistory ? 'none' : ''};
            ">
                <div class="result-score ${scoreClass}">
                    ${scoreRing(latest.percentage, scoreClass)}
                    <span class="pct">${latest.percentage}%</span>
                    <span class="lbl">score</span>
                </div>
                <div class="result-info">
                    <div class="result-module">${moduleName}</div>
                    <div class="result-meta">
                        <span><i class="fas fa-check-circle"></i> ${latest.score}/${latest.total} correct</span>
                        ${timeBadge}
                        <span><i class="fas fa-calendar"></i> ${date}</span>
                        <span><i class="fas fa-clock"></i> ${time}</span>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <!-- View Answer button — opens the review modal, cursor becomes pointer here -->
                    <button class="btn-view-answer" data-id="${latest.id}" title="View Answers">
                        <i class="fas fa-eye"></i> <span>View Answer</span>
                    </button>
                    <!-- Retake button — reuses same questions, no AI regeneration -->
                    <button class="btn-retake" data-id="${latest.id}" title="Retake Quiz">
                        <i class="fas fa-redo"></i> <span>Retake</span>
                    </button>
                    <button class="btn-delete" data-id="${latest.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>

            ${hasHistory ? `
            <div class="history-toggle" data-group="${groupKey}" style="
                display:flex;align-items:center;justify-content:space-between;
                padding:7px 16px;
                background:rgba(128,128,128,0.1);
                border:1px solid rgba(128,128,128,0.2);
                border-top:none;
                border-radius:0 0 14px 14px;
                cursor:pointer;font-size:0.74rem;
                user-select:none;transition:background 0.15s;
            ">
                <span>
                    <i class="fas fa-history" style="margin-right:6px;color:var(--primary-teal);font-size:0.7rem;"></i>
                    <strong style="color:var(--primary-teal);">${past.length}</strong>
                    &nbsp;<span style="opacity:0.6;">past attempt${past.length > 1 ? 's' : ''}</span>
                </span>
                <i class="fas fa-chevron-down history-arrow" data-group="${groupKey}" style="
                    font-size:0.65rem;transition:transform 0.25s ease;color:var(--primary-teal);
                "></i>
            </div>

            <div class="history-panel" id="hist-${groupKey}" style="
                display:none;padding:10px 12px 6px;
                background:rgba(128,128,128,0.08);
                border:1px solid rgba(128,128,128,0.2);
                border-top:none;border-radius:0 0 14px 14px;
            ">
                <div style="font-size:0.68rem;opacity:0.45;margin-bottom:8px;font-weight:600;letter-spacing:0.5px;padding-left:4px;">
                    ATTEMPT HISTORY
                </div>
                ${historyRows}
            </div>
            ` : ''}
        </div>`;
    }).join('');

    // ── Event Listeners ──

    // View Answer button — opens modal, cursor is pointer on button only
    document.querySelectorAll('.btn-view-answer').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openReviewModal(btn.dataset.id);
        });
    });

    // History rows — clicking a past attempt opens that attempt's review
    document.querySelectorAll('.history-row').forEach(row => {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            openReviewModal(row.dataset.id);
        });
    });

    // History accordion toggle
    document.querySelectorAll('.history-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const key    = toggle.dataset.group;
            const panel  = document.getElementById(`hist-${key}`);
            const arrow  = document.querySelector(`.history-arrow[data-group="${key}"]`);
            const isOpen = panel.style.display !== 'none';

            panel.style.display       = isOpen ? 'none' : 'block';
            arrow.style.transform     = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            toggle.style.borderRadius = isOpen ? '0 0 14px 14px' : '0';
        });
    });

    // Retake — passes result ID to quiz.html so it reuses same stored questions
    document.querySelectorAll('.btn-retake').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const result = allResults.find(r => String(r.id) === String(btn.dataset.id));
            if (!result) return;

            const typeReverseMap = {
                'Multiple Choice': 'multiple',
                'True / False':    'truefalse',
                'Identification':  'fillblank'
            };

            const typeKey = typeReverseMap[result.quiz_type] || 'multiple';

            // Pass retake=<result_id> so quiz.js loads stored questions instead of generating new ones
            window.location.href = `quiz.html?file=${encodeURIComponent(result.module_name)}&type=${typeKey}&retake=${result.id}`;
        });
    });

    // Delete button
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteResult(btn.dataset.id);
        });
    });
}

//  REVIEW MODAL
async function openReviewModal(resultId) {
    const result = allResults.find(r => String(r.id) === String(resultId));
    if (!result) return;

    const dark = isDark();
    const timeFormatted = formatTime(result.time_taken);

    const modalBg      = dark ? '#1e2130' : '#ffffff';
    const headerBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const titleColor   = dark ? '#d0d3e8' : '#333333';
    const metaColor    = dark ? '#8b90a8' : '#aaaaaa';
    const closeBg      = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
    const closeColor   = dark ? '#c0c4d8' : '#555555';
    const qNumColor    = dark ? '#5a5f7a' : '#aaaaaa';
    const qTextColor   = dark ? '#d0d3e8' : '#333333';

    document.body.insertAdjacentHTML('beforeend', `
        <div id="review-modal-backdrop" style="
            position:fixed;inset:0;z-index:9999;
            background:rgba(0,0,0,0.55);
            backdrop-filter:blur(5px);
            -webkit-backdrop-filter:blur(5px);
            display:flex;align-items:center;justify-content:center;
            padding:16px;
            animation:fadeIn 0.2s ease;
        ">
            <div id="review-modal" style="
                background:${modalBg};
                border-radius:22px;
                width:min(calc(95vw - 280px - 32px), 90vw);
                max-width:none;
                height:88vh;
                max-height:88vh;
                display:flex;
                flex-direction:column;
                box-shadow:0 24px 70px rgba(0,0,0,0.45);
                animation:slideUp 0.25s ease;
                overflow:hidden;
            ">
                <!-- HEADER -->
                <div style="
                    padding:1.25rem 1.5rem;
                    border-bottom:1px solid ${headerBorder};
                    display:flex;align-items:center;justify-content:space-between;
                    flex-shrink:0;
                ">
                    <div style="min-width:0;flex:1;margin-right:12px;">
                        <div style="font-size:1rem;font-weight:600;color:${titleColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${result.module_name.replace(/^\d+\./, '')}
                        </div>
                        <div style="font-size:0.78rem;color:${metaColor};margin-top:2px;display:flex;flex-wrap:wrap;gap:6px;">
                            <span>${result.quiz_type}</span>
                            <span>· ${result.score}/${result.total} correct</span>
                            <span>· ${result.percentage}%</span>
                            ${timeFormatted ? `<span>· <i class="fas fa-stopwatch" style="margin-right:3px;"></i>${timeFormatted}</span>` : ''}
                        </div>
                    </div>
                    <button onclick="document.getElementById('review-modal-backdrop').remove()" style="
                        background:${closeBg};border:none;
                        width:32px;height:32px;border-radius:50%;
                        cursor:pointer;font-size:1rem;color:${closeColor};
                        display:flex;align-items:center;justify-content:center;
                        flex-shrink:0;
                    ">✕</button>
                </div>

                <!-- BODY -->
                <div id="review-modal-body" style="overflow-y:auto;padding:1.25rem 1.5rem;flex:1;background:${modalBg};">
                    <div style="text-align:center;padding:2rem;color:${metaColor};">
                        <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i>
                        <p style="margin-top:0.5rem;font-size:0.85rem;">Loading answers...</p>
                    </div>
                </div>
            </div>
        </div>
        <style>
            @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
            @keyframes slideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }

            @media (max-width: 768px) {
                #review-modal {
                    width: 100% !important;
                    height: 92vh !important;
                    max-height: 92vh !important;
                    border-radius: 18px !important;
                }
                #review-modal-backdrop {
                    padding: 10px !important;
                }
            }

            @media (max-width: 480px) {
                #review-modal {
                    width: 100% !important;
                    height: 95vh !important;
                    max-height: 95vh !important;
                    border-radius: 14px !important;
                }
                #review-modal-backdrop {
                    padding: 6px !important;
                }
            }
        </style>
    `);

    document.getElementById('review-modal-backdrop').addEventListener('click', (e) => {
        if (e.target.id === 'review-modal-backdrop') e.target.remove();
    });

    const user = auth.currentUser;
    const { data: details, error } = await supabase
        .from('quiz_answer_details')
        .select('*')
        .eq('result_id', resultId)
        .eq('user_id', user.uid)
        .order('question_no', { ascending: true });

    const body = document.getElementById('review-modal-body');

    if (error || !details || !details.length) {
        body.innerHTML = `
            <div style="text-align:center;padding:2rem;color:${metaColor};">
                <i class="fas fa-inbox" style="font-size:2rem;margin-bottom:0.75rem;display:block;"></i>
                <p style="font-size:0.85rem;">No answer details available for this quiz.</p>
                <p style="font-size:0.75rem;margin-top:0.25rem;color:${metaColor};">
                    Only quizzes taken after the update will show detailed answers.
                </p>
            </div>`;
        return;
    }

    body.innerHTML = details.map(d => {
        const correctBorder = dark ? 'rgba(39,174,96,0.35)'  : 'rgba(39,174,96,0.3)';
        const wrongBorder   = dark ? 'rgba(255,71,87,0.35)'  : 'rgba(255,71,87,0.3)';
        const correctBg     = dark ? 'rgba(39,174,96,0.08)'  : 'rgba(39,174,96,0.06)';
        const wrongBg       = dark ? 'rgba(255,71,87,0.08)'  : 'rgba(255,71,87,0.06)';

        return `
        <div style="
            margin-bottom:1rem;padding:1rem 1.1rem;border-radius:12px;
            border:1.5px solid ${d.is_correct ? correctBorder : wrongBorder};
            background:${d.is_correct ? correctBg : wrongBg};
        ">
            <div style="display:flex;gap:10px;align-items:flex-start;">
                <span style="
                    flex-shrink:0;width:22px;height:22px;border-radius:50%;
                    background:${d.is_correct ? '#27ae60' : '#ff4757'};
                    color:#fff;font-size:0.7rem;
                    display:flex;align-items:center;justify-content:center;margin-top:1px;
                "><i class="fas fa-${d.is_correct ? 'check' : 'times'}"></i></span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.7rem;color:${qNumColor};margin-bottom:4px;font-weight:500;">Question ${d.question_no}</div>
                    <div style="font-size:0.88rem;color:${qTextColor};font-weight:500;line-height:1.5;margin-bottom:8px;">${d.question}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        <span style="
                            font-size:0.75rem;padding:4px 10px;border-radius:20px;
                            background:${d.is_correct ? 'rgba(39,174,96,0.15)' : 'rgba(255,71,87,0.12)'};
                            color:${d.is_correct ? '#27ae60' : '#ff4757'};
                        ">
                            <i class="fas fa-user" style="margin-right:4px;font-size:0.65rem;"></i>
                            Your answer: <strong>${d.user_answer}</strong>
                        </span>
                        ${!d.is_correct ? `
                        <span style="
                            font-size:0.75rem;padding:4px 10px;border-radius:20px;
                            background:rgba(39,174,96,0.12);color:#27ae60;
                        ">
                            <i class="fas fa-check" style="margin-right:4px;font-size:0.65rem;"></i>
                            Correct: <strong>${d.correct_answer}</strong>
                        </span>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

//  DELETE RESULT
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

    allResults = allResults.filter(r => String(r.id) !== String(id));
    updateStats();
    renderResults();

    Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1000, showConfirmButton: false });
}

//  FILTER BUTTONS
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderResults();
    });
});

// TAKE QUIZ TOGGLE 
const toggle = document.getElementById('take-quiz-toggle');
const arrow  = document.getElementById('quiz-arrow');

arrow.style.transform = 'rotate(180deg)';

toggle.addEventListener('click', () => {
    window.location.href = 'quiz.html';
});