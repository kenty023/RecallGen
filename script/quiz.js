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
const API_URL = 'https://my-api-2ya0.onrender.com/generate-quiz';

//  INIT
const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

//  STATE
let currentUser = null;
let selectedMod = null;
let currentType = 'multiple';
let questions   = [];
let curIdx      = 0;
let score       = 0;
let answered    = false;
let ttsEnabled  = true;
let answerLog   = [];

// ── TIMER STATE ──
let timerInterval = null;
let quizStartTime = null;
let quizElapsed   = 0;
let quizTotalTime = 0;

const typeMap = {
    multiple:  'multiple_choice',
    truefalse: 'true_or_false',
    fillblank: 'identification'
};

function getDisplayName(storageFilename) {
    return storageFilename.replace(/^\d+_/, '');
}

// ── TIMER HELPERS ──
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function startTimer() {
    stopTimer();
    quizStartTime = Date.now();
    quizElapsed   = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        quizElapsed = Math.floor((Date.now() - quizStartTime) / 1000);
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const el = document.getElementById('quiz-timer');
    if (el) el.textContent = formatTime(quizElapsed);
}

// TEXT TO SPEECH
function speak(text) {
    if (!ttsEnabled) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang  = 'en-US';
    utter.rate  = 0.95;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
}

function stopSpeech() {
    window.speechSynthesis.cancel();
}

// ══════════════════════════════════════════
// TAKE QUIZ DROPDOWN TOGGLE
// ══════════════════════════════════════════
const toggle = document.getElementById('take-quiz-toggle');
const sub    = document.getElementById('quiz-sub');
const arrow  = document.getElementById('quiz-arrow');

// Track open state
let dropdownOpen = false;

function openDropdown() {
    dropdownOpen = true;
    sub.classList.add('open');
    arrow.style.transform = 'rotate(180deg)';
    toggle.classList.add('dropdown-open');
}

function closeDropdown() {
    dropdownOpen = false;
    sub.classList.remove('open');
    arrow.style.transform = 'rotate(0deg)';
    toggle.classList.remove('dropdown-open');
}

function toggleDropdown() {
    if (dropdownOpen) {
        closeDropdown();
    } else {
        openDropdown();
    }
}

// Auto-open on page load since this is the active quiz page
openDropdown();

// Toggle on click
toggle.addEventListener('click', toggleDropdown);

// ══════════════════════════════════════════

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
document.querySelectorAll('.nav-item:not(#take-quiz-toggle)').forEach(item => {
    item.addEventListener('click', () => {
        stopSpeech();
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
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.uid)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
            const username = data.username && data.username.trim() !== ''
                ? data.username
                : user.email.split('@')[0];

            document.getElementById('display-username').innerText = username;

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
        } else {
            document.getElementById('display-username').innerText = user.email.split('@')[0];
        }
    } catch(e) {
        console.error("Profile load failed:", e);
        document.getElementById('display-username').innerText = user.email.split('@')[0];
    }

    await loadModules();
    await initProfileDropdown(currentUser, supabase);

    const params    = new URLSearchParams(window.location.search);
    const autoFile  = params.get('file');
    const autoType  = params.get('type');
    const retakeId  = params.get('retake');

    if (autoFile) {
        const { data: storageFiles } = await supabase.storage
            .from('modules')
            .list(currentUser.uid, { limit: 100 });

        const matchedFile = (storageFiles || []).find(f => getDisplayName(f.name) === autoFile);
        const storageName = matchedFile ? matchedFile.name : autoFile;

        selectedMod = {
            fileName:     storageName,
            displayName:  autoFile,
            supabasePath: `${currentUser.uid}/${storageName}`
        };

        document.getElementById('selected-mod-name').textContent = autoFile;
        const ext     = autoFile.split('.').pop().toLowerCase();
        const iconMap = { pdf:'fa-file-pdf', docx:'fa-file-word', doc:'fa-file-word', txt:'fa-file-alt', pptx:'fa-file-powerpoint' };
        document.querySelector('.selected-mod-bar i').className = `fas ${iconMap[ext] || 'fa-file-alt'}`;

        if (autoType) {
            currentType = autoType;
            document.querySelectorAll('.type-card').forEach(c => {
                c.classList.remove('selected');
                if (c.dataset.type === autoType) c.classList.add('selected');
            });
        }

        setStep(2);
        showScreen('screen-setup');

        if (retakeId) {
            setTimeout(() => startRetake(retakeId), 300);
        } else if (params.get('autogenerate') === '1') {
            setTimeout(() => {
                document.getElementById('btn-generate').click();
            }, 300);
        }
    }
});

// ── RETAKE: load stored questions from quiz_answer_details ──
async function startRetake(retakeId) {
    setStep(3);
    showScreen('screen-generating');
    setGenStep(1);

    try {
        setGenStep(2);

        const { data: details, error } = await supabase
            .from('quiz_answer_details')
            .select('*')
            .eq('result_id', retakeId)
            .eq('user_id', currentUser.uid)
            .order('question_no', { ascending: true });

        if (error) throw new Error(`Could not load stored questions: ${error.message}`);
        if (!details || !details.length) throw new Error('No stored questions found for this result.');

        setGenStep(3);

        questions = details.map(d => {
            let choices = null;
            if (d.options) {
                try {
                    choices = typeof d.options === 'string' ? JSON.parse(d.options) : d.options;
                } catch(_) {
                    choices = null;
                }
            }

            if (currentType === 'multiple' && choices) {
                const answerIdx = choices.indexOf(d.correct_answer);
                return {
                    q:            d.question,
                    choices:      choices,
                    answer:       answerIdx >= 0 ? answerIdx : 0,
                    hints:        null,
                    correctLabel: d.correct_answer
                };
            } else if (currentType === 'truefalse') {
                return {
                    q:            d.question,
                    choices:      null,
                    answer:       d.correct_answer.toLowerCase() === 'true',
                    hints:        null,
                    correctLabel: d.correct_answer
                };
            } else {
                return {
                    q:            d.question,
                    choices:      null,
                    answer:       d.correct_answer,
                    hints:        [d.correct_answer.toLowerCase()],
                    correctLabel: d.correct_answer
                };
            }
        });

        setGenStep(4);
        await new Promise(r => setTimeout(r, 400));

        answerLog = [];
        curIdx = 0;
        score  = 0;

        const labels = { multiple:'Multiple Choice', truefalse:'True / False', fillblank:'Identification' };
        document.getElementById('type-pill').textContent = labels[currentType];
        document.getElementById('tot-q').textContent     = questions.length;

        showScreen('screen-quiz');
        startTimer();
        renderQuestion();

    } catch(err) {
        console.error(err);
        stopTimer();
        Swal.fire({
            title: 'Retake Failed',
            text:  err.message || 'Could not load the stored questions. Try taking the quiz again.',
            icon:  'error',
            confirmButtonColor: 'var(--primary-teal)'
        }).then(() => { setStep(2); showScreen('screen-setup'); });
    }
}

//  HELPERS
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function setStep(n) {
    [1,2,3].forEach(i => {
        const s = document.getElementById(`step${i}`);
        s.classList.remove('active', 'done');
        if (i < n)        s.classList.add('done');
        else if (i === n) s.classList.add('active');
    });
    [1,2].forEach(i =>
        document.getElementById(`line${i}`).classList.toggle('done', i < n)
    );
}

function setGenStep(n) {
    [1,2,3,4].forEach(i => {
        const s = document.getElementById(`gs${i}`);
        s.classList.remove('active', 'done');
        if (i < n)        s.classList.add('done');
        else if (i === n) s.classList.add('active');
    });
}

//  LOAD MODULES
async function loadModules() {
    const container = document.getElementById('modules-container');
    try {
        const { data, error } = await supabase.storage
            .from('modules')
            .list(currentUser.uid, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

        if (error) throw error;
        const files = data.filter(f => f.name !== '.emptyFolderPlaceholder');

        if (!files.length) {
            container.className = 'state-center';
            container.innerHTML = `
                <i class="fas fa-folder-open"></i>
                <p style="font-weight:600;">No modules found</p>
                <p>Upload a module from the <a href="dashboard.html" style="color:var(--primary-teal);font-weight:600;">Dashboard</a> first.</p>`;
            return;
        }

        container.className = 'modules-grid';
        container.innerHTML = '';
        const iconMap = { pdf:'fa-file-pdf', docx:'fa-file-word', doc:'fa-file-word', txt:'fa-file-alt', pptx:'fa-file-powerpoint' };

        files.forEach(file => {
            const displayName = getDisplayName(file.name);
            const ext  = displayName.split('.').pop().toLowerCase();
            const icon = iconMap[ext] || 'fa-file';
            const kb   = file.metadata?.size ? Math.round(file.metadata.size / 1024) + ' KB' : '';
            const card = document.createElement('div');
            card.className = 'module-card';
            card.innerHTML = `
                <button class="mod-delete-btn" title="Delete module"><i class="fas fa-trash"></i></button>
                <div class="mod-icon"><i class="fas ${icon}"></i></div>
                <div class="mod-name">${displayName}</div>
                ${kb ? `<div class="mod-date">${kb}</div>` : ''}`;

            card.addEventListener('click', () => {
                document.querySelectorAll('.module-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedMod = {
                    fileName:     file.name,
                    displayName:  displayName,
                    supabasePath: `${currentUser.uid}/${file.name}`
                };
                document.getElementById('btn-to-setup').disabled = false;
            });

            card.querySelector('.mod-delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();

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

                if (storageError) {
                    Swal.fire('Error', storageError.message, 'error');
                    return;
                }

        await supabase
            .from('user_modules')
            .delete()
            .eq('user_id', currentUser.uid)
            .eq('file_name', file.name);

        // ── LOG: DELETE ──────────────────────────────────────────────────────────
        await supabase.from('activity_logs').insert({
            user_id:     currentUser.uid,
            type:        'delete',
            description: `Deleted module "${displayName}"`,
            file_name:   displayName,
            created_at:  new Date().toISOString()
        });

        card.remove();

        Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1000, showConfirmButton: false });

                if (selectedMod?.fileName === file.name) {
                    selectedMod = null;
                    document.getElementById('btn-to-setup').disabled = true;
                }
            });

            container.appendChild(card);
        });
    } catch(err) {
        console.error("loadModules error:", err);
        container.className = 'state-center';
        container.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Failed to load modules.</p>
            <p style="font-size:0.78rem;">${err.message}</p>`;
    }
}

// NAVIGATION
document.getElementById('btn-to-setup').addEventListener('click', () => {
    const name = selectedMod.displayName || getDisplayName(selectedMod.fileName);
    document.getElementById('selected-mod-name').textContent = name;
    const ext     = name.split('.').pop().toLowerCase();
    const iconMap = { pdf:'fa-file-pdf', docx:'fa-file-word', doc:'fa-file-word', txt:'fa-file-alt', pptx:'fa-file-powerpoint' };
    document.querySelector('.selected-mod-bar i').className = `fas ${iconMap[ext] || 'fa-file-alt'}`;
    setStep(2); showScreen('screen-setup');
});

document.getElementById('btn-back').addEventListener('click', () => {
    stopSpeech();
    stopTimer();
    setStep(1); showScreen('screen-modules');
});

//  QUIZ TYPE
document.querySelectorAll('.type-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        currentType = card.dataset.type;
    });
});

//  SLIDER
document.getElementById('q-slider').addEventListener('input', function() {
    document.getElementById('q-badge').textContent = this.value;
    document.getElementById('q-label').textContent = this.value;
});

//  GENERATE
document.getElementById('btn-generate').addEventListener('click', async () => {
    const totalQ = parseInt(document.getElementById('q-slider').value);
    setStep(3); showScreen('screen-generating'); setGenStep(1);

    try {
        const { data: fileBlob, error: dlErr } = await supabase.storage
            .from('modules')
            .download(selectedMod.supabasePath);

        if (dlErr) throw new Error(`Could not download file: ${dlErr.message}`);
        setGenStep(2);

        const displayName = selectedMod.displayName || getDisplayName(selectedMod.fileName);

        const formData = new FormData();
        formData.append('file', new File([fileBlob], displayName, { type: 'application/pdf' }));
        formData.append('quiz_type', typeMap[currentType]);
        formData.append('question_count', totalQ.toString());
        setGenStep(3);

        const res = await fetch(API_URL, { method: 'POST', body: formData });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const data = await res.json();
        if (!data.quiz || !data.quiz.length) throw new Error('No questions returned. Try a different file.');
        setGenStep(4);

        questions = data.quiz.slice(0, totalQ).map(q => ({
            q:       q.question,
            choices: q.choices || null,
            answer:  currentType === 'multiple'
                        ? (q.choices || []).indexOf(q.answer)
                        : currentType === 'truefalse'
                            ? q.answer.toLowerCase() === 'true'
                            : q.answer,
            hints:        currentType === 'fillblank' ? [q.answer.toLowerCase()] : null,
            correctLabel: currentType === 'multiple'
                            ? q.answer
                            : currentType === 'truefalse'
                                ? (q.answer.toLowerCase() === 'true' ? 'True' : 'False')
                                : q.answer
        }));

        await new Promise(r => setTimeout(r, 400));

        answerLog = [];
        curIdx = 0; score = 0;
        const labels = { multiple:'Multiple Choice', truefalse:'True / False', fillblank:'Identification' };
        document.getElementById('type-pill').textContent = labels[currentType];
        document.getElementById('tot-q').textContent     = questions.length;
        showScreen('screen-quiz');

        startTimer();
        renderQuestion();

    } catch(err) {
        console.error(err);
        stopTimer();
        Swal.fire({
            title: 'Generation Failed',
            text:  err.message || 'Could not generate questions. Make sure the file is a readable PDF.',
            icon:  'error',
            confirmButtonColor: 'var(--primary-teal)'
        }).then(() => { setStep(2); showScreen('screen-setup'); });
    }
});

//  RENDER QUESTION
function renderQuestion() {
    answered = false;
    const q  = questions[curIdx];
    document.getElementById('cur-q').textContent        = curIdx + 1;
    document.getElementById('prog-fill').style.width    = `${((curIdx+1)/questions.length)*100}%`;
    document.getElementById('q-text').textContent       = q.q;
    const wrap = document.getElementById('answers-wrap');
    wrap.innerHTML = '';
    document.getElementById('feedback').style.display   = 'none';
    document.getElementById('feedback').className       = 'feedback';
    document.getElementById('btn-submit').style.display = 'inline-flex';
    document.getElementById('btn-submit').disabled      = true;
    document.getElementById('btn-next').style.display   = 'none';

    updateTtsBtn();
    speak(`Question ${curIdx + 1}. ${q.q}`);

    if      (currentType === 'multiple')  buildMultiple(q, wrap);
    else if (currentType === 'truefalse') buildTF(q, wrap);
    else                                  buildFITB(q, wrap);
}

//  TTS BUTTON
function updateTtsBtn() {
    const btn = document.getElementById('tts-btn');
    if (!btn) return;
    btn.innerHTML = ttsEnabled
        ? '<i class="fas fa-volume-up"></i>'
        : '<i class="fas fa-volume-mute"></i>';
    btn.title = ttsEnabled ? 'Mute TTS' : 'Unmute TTS';
}

function applySelectedStyle(btn, isSelected) {
    if (isSelected) {
        btn.classList.add('selected');
    } else {
        btn.classList.remove('selected');
    }
}

function buildMultiple(q, wrap) {
    const grid = document.createElement('div');
    grid.className = 'choices-grid';
    ['A','B','C','D'].forEach((L, i) => {
        if (!q.choices || !q.choices[i]) return;
        const btn = document.createElement('button');
        btn.className   = 'choice-btn';
        btn.dataset.idx = i;
        btn.innerHTML   = `<div class="choice-letter">${L}</div><span>${q.choices[i]}</span>`;
        btn.addEventListener('click', () => {
            if (answered) return;
            grid.querySelectorAll('.choice-btn').forEach(b => applySelectedStyle(b, false));
            applySelectedStyle(btn, true);
            document.getElementById('btn-submit').disabled = false;
        });
        grid.appendChild(btn);
    });
    wrap.appendChild(grid);
}

function buildTF(q, wrap) {
    const grid = document.createElement('div');
    grid.className = 'tf-grid';
    ['True','False'].forEach(label => {
        const btn = document.createElement('button');
        btn.className   = `tf-btn ${label.toLowerCase()}-btn`;
        btn.dataset.val = label.toLowerCase();
        btn.innerHTML   = `<i class="fas fa-${label==='True'?'check':'times'}" style="margin-right:8px;"></i>${label}`;
        btn.addEventListener('click', () => {
            if (answered) return;
            grid.querySelectorAll('.tf-btn').forEach(b => applySelectedStyle(b, false));
            applySelectedStyle(btn, true);
            document.getElementById('btn-submit').disabled = false;
        });
        grid.appendChild(btn);
    });
    wrap.appendChild(grid);
}

function buildFITB(q, wrap) {
    const div = document.createElement('div');
    div.className = 'fitb-wrap';
    const inp = document.createElement('input');
    inp.type        = 'text';
    inp.className   = 'fitb-input';
    inp.placeholder = 'Type your answer here...';
    inp.addEventListener('input', () =>
        document.getElementById('btn-submit').disabled = inp.value.trim() === ''
    );
    inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !document.getElementById('btn-submit').disabled) doSubmit();
    });
    div.appendChild(inp);
    wrap.appendChild(div);
    setTimeout(() => inp.focus(), 50);
}

//  SUBMIT
document.getElementById('btn-submit').addEventListener('click', doSubmit);
document.getElementById('btn-next').addEventListener('click', () => {
    curIdx++;
    if (curIdx < questions.length) renderQuestion(); else showResults();
});

function doSubmit() {
    if (answered) return;
    answered = true;
    const q  = questions[curIdx];
    let ok   = false;
    let userAnswerLabel = '';

    if (currentType === 'multiple') {
        const sel = document.querySelector('.choice-btn.selected');
        if (!sel) return;
        ok = parseInt(sel.dataset.idx) === q.answer;
        userAnswerLabel = q.choices[parseInt(sel.dataset.idx)];
        document.querySelectorAll('.choice-btn').forEach((b, i) => {
            b.style.pointerEvents = 'none';
            if (i === q.answer) b.classList.add('correct');
            else if (b.classList.contains('selected') && !ok) b.classList.add('wrong');
        });
    } else if (currentType === 'truefalse') {
        const sel = document.querySelector('.tf-btn.selected');
        if (!sel) return;
        ok = (sel.dataset.val === 'true') === q.answer;
        userAnswerLabel = sel.dataset.val === 'true' ? 'True' : 'False';
        document.querySelectorAll('.tf-btn').forEach(b => {
            b.style.pointerEvents = 'none';
            if ((b.dataset.val === 'true') === q.answer) b.classList.add('correct');
            else if (b.classList.contains('selected') && !ok) b.classList.add('wrong');
        });
    } else {
        const inp     = document.querySelector('.fitb-input');
        const userAns = inp.value.trim().toLowerCase();
        const hints   = (q.hints || [q.answer]).map(h => h.toLowerCase());
        ok = hints.includes(userAns);
        userAnswerLabel = inp.value.trim();
        inp.disabled  = true;
        inp.classList.add(ok ? 'correct' : 'wrong');

        if (!ok) {
            const hint = document.createElement('div');
            hint.className   = 'fitb-hint';
            hint.textContent = `Correct answer: ${q.answer}`;
            inp.parentNode.appendChild(hint);
        }
    }

    if (ok) score++;

    answerLog.push({
        question_no:    curIdx + 1,
        question:       q.q,
        user_answer:    userAnswerLabel,
        correct_answer: q.correctLabel,
        is_correct:     ok,
        options:        q.choices || null
    });

    speak(ok ? 'Correct!' : 'Incorrect.');

    const fb = document.getElementById('feedback');
    fb.textContent   = ok ? '✓ Correct!' : '✗ Incorrect';
    fb.className     = `feedback ${ok ? 'correct' : 'wrong'}`;
    fb.style.display = 'block';
    document.getElementById('btn-submit').style.display = 'none';
    const nxt = document.getElementById('btn-next');
    nxt.style.display = 'inline-flex';
    nxt.innerHTML = curIdx < questions.length - 1
        ? 'Next <i class="fas fa-arrow-right" style="margin-left:6px;"></i>'
        : 'See Results <i class="fas fa-flag-checkered" style="margin-left:6px;"></i>';
}

// ── RENDER ANSWER REVIEW ──
function renderAnswerReview() {
    const container = document.getElementById('res-answers');
    if (!container) return;

    container.innerHTML = '';

    answerLog.forEach(a => {
        const row = document.createElement('div');
        row.className = `res-answer-row ${a.is_correct ? 'is-correct' : 'is-wrong'}`;
        row.dataset.correct = a.is_correct ? 'true' : 'false';

        const chipsHtml = a.is_correct
            ? `<span class="res-chip user-correct">
                    <i class="fas fa-check"></i> ${a.user_answer}
               </span>`
            : `<span class="res-chip user-wrong">
                    <i class="fas fa-user" style="font-size:0.6rem;"></i> Your answer: ${a.user_answer}
               </span>
               <span class="res-chip answer-correct">
                    <i class="fas fa-check"></i> Correct: ${a.correct_answer}
               </span>`;

        // FIX: removed duplicate res-row-score div (right-side ✓/✗)
        row.innerHTML = `
            <div class="res-row-icon ${a.is_correct ? 'correct' : 'wrong'}">
                <i class="fas fa-${a.is_correct ? 'check' : 'times'}"></i>
            </div>
            <div class="res-row-body">
                <div class="res-row-qnum">Question ${a.question_no}</div>
                <div class="res-row-question">${a.question}</div>
                <div class="res-row-chips">${chipsHtml}</div>
            </div>`;

        container.appendChild(row);
    });
}

// ── TAB FILTER ──
function initResultTabs() {
    document.querySelectorAll('.res-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.res-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.dataset.filter;
            document.querySelectorAll('.res-answer-row').forEach(row => {
                if (filter === 'all') {
                    row.style.display = '';
                } else if (filter === 'correct') {
                    row.style.display = row.dataset.correct === 'true' ? '' : 'none';
                } else {
                    row.style.display = row.dataset.correct === 'false' ? '' : 'none';
                }
            });
        });
    });
}

// ── ANIMATE SCORE RING ──
function animateRing(pct) {
    const circle = document.getElementById('res-ring-fill');
    if (!circle) return;
    const circumference = 314;
    const offset = circumference - (pct / 100) * circumference;
    circle.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            circle.style.strokeDashoffset = offset;
        });
    });
}

//  RESULTS
async function showResults() {
    stopSpeech();
    stopTimer();
    quizTotalTime = quizElapsed;

    showScreen('screen-results');

    const pct = Math.round((score / questions.length) * 100);

    document.getElementById('res-pct').textContent     = `${pct}%`;
    document.getElementById('res-correct').textContent = score;
    document.getElementById('res-wrong').textContent   = questions.length - score;
    document.getElementById('res-total').textContent   = questions.length;

    const timeTakenEl = document.getElementById('res-time');
    if (timeTakenEl) timeTakenEl.textContent = formatTime(quizTotalTime);

    const wrongCount   = questions.length - score;
    const correctCount = score;
    const tabWrong   = document.getElementById('tab-wrong-count');
    const tabCorrect = document.getElementById('tab-correct-count');
    if (tabWrong)   tabWrong.textContent   = wrongCount;
    if (tabCorrect) tabCorrect.textContent = correctCount;

    document.querySelectorAll('.res-tab').forEach(t => {
        if (t.dataset.filter === 'all') t.childNodes[0].textContent = `All questions (${questions.length})`;
    });

    const rows = [
        [90, 'Outstanding!',    'You really know your stuff — perfect score territory!'],
        [75, 'Great job!',      'Almost perfect. Keep it up!'],
        [50, 'Good effort!',    'Review the topics you missed and try again.'],
        [0,  'Keep practicing!','You got this — review the items below and retry.']
    ];
    const [, title, sub] = rows.find(([min]) => pct >= min);
    document.getElementById('res-title').textContent = title;
    document.getElementById('res-sub').textContent   = sub;

    setTimeout(() => animateRing(pct), 100);

    speak(`Quiz complete! You got ${score} out of ${questions.length} correct. ${title}`);

    renderAnswerReview();
    initResultTabs();

    if (!currentUser) {
        console.error("No currentUser when trying to save result.");
        return;
    }

    try {
        const typeLabels = { multiple:'Multiple Choice', truefalse:'True / False', fillblank:'Identification' };
        const displayName = selectedMod.displayName || getDisplayName(selectedMod.fileName);

        // FIX: save time_taken as minutes (rounded) so analytics displays correctly
        const timeTakenMinutes = Math.round(quizTotalTime / 60) || 1;

        const { data: resultRow, error: resultErr } = await supabase
            .from('quiz_results')
            .insert({
                user_id:     currentUser.uid,
                module_name: displayName,
                quiz_type:   typeLabels[currentType],
                score:       score,
                total:       questions.length,
                percentage:  pct,
                time_taken:  timeTakenMinutes
            })
            .select('id')
            .single();

        if (resultErr) {
            console.error("quiz_results insert failed:", resultErr);
            throw new Error(`Failed to save quiz result: ${resultErr.message}`);
        }

        if (!resultRow || !resultRow.id) {
            throw new Error("quiz_results insert returned no ID.");
        }

        const detailRows = answerLog.map(a => ({
            result_id:      resultRow.id,
            user_id:        currentUser.uid,
            question_no:    a.question_no,
            question:       a.question,
            user_answer:    a.user_answer,
            correct_answer: a.correct_answer,
            is_correct:     a.is_correct,
            options:        a.options ? JSON.stringify(a.options) : null
        }));

        const { error: detailErr } = await supabase
            .from('quiz_answer_details')
            .insert(detailRows);

        if (detailErr) {
            console.error("quiz_answer_details insert failed:", detailErr);
        }

    } catch(e) {
        console.error("Failed to save result:", e);
        Swal.fire({
            title: 'Save Failed',
            text: 'Your score could not be saved. Check your connection and try again.',
            icon: 'warning',
            confirmButtonColor: 'var(--primary-teal)'
        });
    }
}

document.getElementById('btn-retry').addEventListener('click', () => {
    answerLog = [];
    curIdx = 0; score = 0;
    const circle = document.getElementById('res-ring-fill');
    if (circle) circle.style.strokeDashoffset = 314;
    document.querySelectorAll('.res-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.res-tab[data-filter="all"]')?.classList.add('active');
    setStep(3); showScreen('screen-quiz');
    startTimer();
    renderQuestion();
});

document.getElementById('btn-new').addEventListener('click', () => {
    stopSpeech();
    stopTimer();
    answerLog = [];
    selectedMod = null;
    document.querySelectorAll('.module-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('btn-to-setup').disabled = true;
    const circle = document.getElementById('res-ring-fill');
    if (circle) circle.style.strokeDashoffset = 314;
    setStep(1); showScreen('screen-modules');
});

//  TTS TOGGLE BUTTON
document.getElementById('tts-btn').addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    updateTtsBtn();
    if (!ttsEnabled) stopSpeech();
});

document.getElementById('logout-btn').addEventListener('click', () => {
    stopSpeech();
    stopTimer();
    signOut(auth).then(() => window.location.href = 'login.html');
});