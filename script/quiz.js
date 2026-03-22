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

const typeMap = {
    multiple:  'multiple_choice',
    truefalse: 'true_or_false',
    fillblank: 'identification'
};

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

    loadModules();
});

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
                <p style="font-weight:600;color:#555;">No modules found</p>
                <p>Upload a module from the <a href="dashboard.html" style="color:var(--primary-teal);font-weight:600;">Dashboard</a> first.</p>`;
            return;
        }

        container.className = 'modules-grid';
        container.innerHTML = '';
        const iconMap = { pdf:'fa-file-pdf', docx:'fa-file-word', doc:'fa-file-word', txt:'fa-file-alt', pptx:'fa-file-powerpoint' };

        files.forEach(file => {
            const ext  = file.name.split('.').pop().toLowerCase();
            const icon = iconMap[ext] || 'fa-file';
            const kb   = file.metadata?.size ? Math.round(file.metadata.size / 1024) + ' KB' : '';
            const card = document.createElement('div');
            card.className = 'module-card';
            card.innerHTML = `
                <button class="mod-delete-btn" title="Delete module"><i class="fas fa-trash"></i></button>
                <div class="mod-icon"><i class="fas ${icon}"></i></div>
                <div class="mod-name">${file.name}</div>
                ${kb ? `<div class="mod-date">${kb}</div>` : ''}`;

            // Select card on click 
            card.addEventListener('click', () => {
                document.querySelectorAll('.module-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedMod = { fileName: file.name, supabasePath: `${currentUser.uid}/${file.name}` };
                document.getElementById('btn-to-setup').disabled = false;
            });

            // Delete button
            card.querySelector('.mod-delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirm = await Swal.fire({
                    title: 'Delete module?',
                    text: `${file.name} will be permanently deleted.`,
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

                if (error) {
                    Swal.fire('Error', error.message, 'error');
                    return;
                }

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
    document.getElementById('selected-mod-name').textContent = selectedMod.fileName;
    const ext     = selectedMod.fileName.split('.').pop().toLowerCase();
    const iconMap = { pdf:'fa-file-pdf', docx:'fa-file-word', doc:'fa-file-word', txt:'fa-file-alt', pptx:'fa-file-powerpoint' };
    document.querySelector('.selected-mod-bar i').className = `fas ${iconMap[ext] || 'fa-file-alt'}`;
    setStep(2); showScreen('screen-setup');
});

document.getElementById('btn-back').addEventListener('click', () => {
    stopSpeech();
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

        const formData = new FormData();
        formData.append('file', new File([fileBlob], selectedMod.fileName, { type: 'application/pdf' }));
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
            hints: currentType === 'fillblank' ? [q.answer.toLowerCase()] : null
        }));

        await new Promise(r => setTimeout(r, 400));

        curIdx = 0; score = 0;
        const labels = { multiple:'Multiple Choice', truefalse:'True / False', fillblank:'Identification' };
        document.getElementById('type-pill').textContent = labels[currentType];
        document.getElementById('tot-q').textContent     = questions.length;
        showScreen('screen-quiz');
        renderQuestion();

    } catch(err) {
        console.error(err);
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

//  BUILD ANSWER TYPES 
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
            grid.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
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
        btn.innerHTML   = `<i class="fas fa-${label==='True'?'check':'times'}"></i>${label}`;
        btn.addEventListener('click', () => {
            if (answered) return;
            grid.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
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

    if (currentType === 'multiple') {
        const sel = document.querySelector('.choice-btn.selected');
        if (!sel) return;
        ok = parseInt(sel.dataset.idx) === q.answer;
        document.querySelectorAll('.choice-btn').forEach((b, i) => {
            b.style.pointerEvents = 'none';
            if (i === q.answer) b.classList.add('correct');
            else if (b.classList.contains('selected') && !ok) b.classList.add('wrong');
        });
    } else if (currentType === 'truefalse') {
        const sel = document.querySelector('.tf-btn.selected');
        if (!sel) return;
        ok = (sel.dataset.val === 'true') === q.answer;
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
        inp.disabled  = true;
        inp.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) {
            const hint = document.createElement('div');
            hint.style.cssText = 'font-size:0.8rem;color:#888;margin-top:8px;';
            hint.textContent   = `Correct answer: ${q.answer}`;
            inp.parentNode.appendChild(hint);
        }
    }

    if (ok) score++;

    // Speak the result
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

//  RESULTS 
async function showResults() {
    stopSpeech();
    showScreen('screen-results');
    const pct = Math.round((score / questions.length) * 100);
    document.getElementById('res-pct').textContent     = `${pct}%`;
    document.getElementById('res-correct').textContent = score;
    document.getElementById('res-wrong').textContent   = questions.length - score;
    document.getElementById('res-total').textContent   = questions.length;
    const rows = [
        [90, 'Outstanding! 🎉', 'You really know your stuff!'],
        [75, 'Great Job!',       'Almost perfect — keep it up!'],
        [50, 'Good Effort!',     'Review the topics you missed.'],
        [0,  'Keep Practicing!', 'Try again to improve your score.']
    ];
    const [, title, sub] = rows.find(([min]) => pct >= min);
    document.getElementById('res-title').textContent = title;
    document.getElementById('res-sub').textContent   = sub;

    speak(`Quiz complete! You got ${score} out of ${questions.length} correct. ${title}`);

    // Save result to Supabase
    try {
        const typeLabels = { multiple:'Multiple Choice', truefalse:'True / False', fillblank:'Identification' };
        await supabase.from('quiz_results').insert({
            user_id:     currentUser.uid,
            module_name: selectedMod.fileName,
            quiz_type:   typeLabels[currentType],
            score:       score,
            total:       questions.length,
            percentage:  pct
        });
    } catch(e) {
        console.error("Failed to save result:", e);
    }
}


document.getElementById('btn-retry').addEventListener('click', () => {
    curIdx = 0; score = 0;
    setStep(3); showScreen('screen-quiz'); renderQuestion();
});

document.getElementById('btn-new').addEventListener('click', () => {
    stopSpeech();
    selectedMod = null;
    document.querySelectorAll('.module-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('btn-to-setup').disabled = true;
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
    signOut(auth).then(() => window.location.href = 'login.html');
});
