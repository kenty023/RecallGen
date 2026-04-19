/* ================================================================
   MULTIPLAYER JS — paste at the BOTTOM of quiz.js
   (before the last closing line)

   REQUIRED: Add these imports at the TOP of quiz.js alongside 
   your existing Firebase imports:

   import {
       getDatabase, ref, set, get, onValue, update, push, remove
   } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

   Then init the database after your existing Firebase init:
   const db = getDatabase(app);

   ================================================================ */


/* ─────────────────────────────────────────────
   MP STATE
   ───────────────────────────────────────────── */
let mpState = {
    roomCode:    null,
    isHost:      false,
    displayName: null,
    questions:   [],
    curQ:        0,
    score:       0,
    answered:    false,
    timerInterval: null,
    timeLeft:    20,
    lobbyPoll:   null,
    selectedMod: null,
    currentType: 'multiple'
};


/* ─────────────────────────────────────────────
   SCREEN 0: MODE PICKER
   ───────────────────────────────────────────── */

// On page load, show mode picker instead of modules directly.
// Replace the existing showScreen('screen-modules') call in onAuthStateChanged
// with showScreen('screen-mode')   ← change this one line in your auth handler

document.getElementById('btn-solo').addEventListener('click', () => {
    showScreen('screen-modules');
    setStep(1);
});

document.getElementById('btn-multi').addEventListener('click', () => {
    showScreen('screen-mp-gate');
});


/* ─────────────────────────────────────────────
   MP GATE: HOST or JOIN
   ───────────────────────────────────────────── */

document.getElementById('mp-gate-back').addEventListener('click', () => {
    showScreen('screen-mode');
});

document.getElementById('mp-opt-host').addEventListener('click', () => {
    mpState.isHost = true;
    const name = document.getElementById('display-username').textContent || 'Host';
    mpState.displayName = name;
    const code = generateRoomCode();
    mpState.roomCode = code;
    document.getElementById('lobby-code-display').textContent = code;
    document.getElementById('lobby-host-view').style.display  = 'block';
    document.getElementById('lobby-guest-view').style.display = 'none';
    document.getElementById('lobby-host-actions').style.display = 'block';
    loadLobbyModules();
    initRoom(code, name);
    startLobbyPoll(code);
    showScreen('screen-mp-lobby');
});

document.getElementById('mp-opt-join').addEventListener('click', () => {
    mpState.isHost = false;
    showScreen('screen-mp-join');
});

document.getElementById('mp-join-back').addEventListener('click', () => {
    showScreen('screen-mp-gate');
});


/* ─────────────────────────────────────────────
   JOIN ROOM
   ───────────────────────────────────────────── */

document.getElementById('btn-do-join').addEventListener('click', async () => {
    const name = document.getElementById('join-display-name').value.trim();
    const code = document.getElementById('join-room-code').value.trim().toUpperCase();
    const errEl = document.getElementById('join-error');
    errEl.style.display = 'none';

    if (!name)  { showJoinError('Please enter your display name.'); return; }
    if (!code || code.length !== 6) { showJoinError('Please enter a valid 6-character room code.'); return; }

    try {
        const roomRef = ref(db, `rooms/${code}`);
        const snap    = await get(roomRef);

        if (!snap.exists()) { showJoinError('Room not found. Check the code and try again.'); return; }
        const room = snap.val();
        if (room.status === 'started') { showJoinError('This quiz has already started. Ask the host to create a new room.'); return; }

        mpState.displayName = name;
        mpState.roomCode    = code;

        // Register player in Firebase
        await update(ref(db, `rooms/${code}/players/${name}`), { score: 0, done: false, joinedAt: Date.now() });

        // Show lobby as guest
        document.getElementById('lobby-code-guest').textContent  = code;
        document.getElementById('lobby-host-view').style.display  = 'none';
        document.getElementById('lobby-guest-view').style.display = 'block';
        document.getElementById('lobby-host-actions').style.display = 'none';

        startLobbyPoll(code);
        showScreen('screen-mp-lobby');

    } catch(e) {
        showJoinError('Connection error: ' + e.message);
    }
});

function showJoinError(msg) {
    const el = document.getElementById('join-error');
    el.textContent = msg;
    el.style.display = 'block';
}


/* ─────────────────────────────────────────────
   INIT ROOM (Firebase Realtime Database)
   ───────────────────────────────────────────── */

async function initRoom(code, hostName) {
    await set(ref(db, `rooms/${code}`), {
        host:      hostName,
        status:    'waiting',   // waiting | generating | started | done
        createdAt: Date.now(),
        players: {
            [hostName]: { score: 0, done: false, joinedAt: Date.now() }
        }
    });
}


/* ─────────────────────────────────────────────
   LOBBY — live player list + watch for start
   ───────────────────────────────────────────── */

function startLobbyPoll(code) {
    const roomRef = ref(db, `rooms/${code}`);

    onValue(roomRef, (snap) => {
        if (!snap.exists()) return;
        const room = snap.val();

        // Update player chips
        const players = room.players || {};
        renderPlayerChips(players, room.host);

        // Update start button
        const count = Object.keys(players).length;
        document.getElementById('players-count').textContent = count;

        if (mpState.isHost) {
            const startBtn = document.getElementById('btn-start-mp');
            const hasModule = mpState.selectedMod !== null;
            startBtn.disabled = !hasModule;
            document.getElementById('mp-start-hint').textContent = hasModule
                ? (count === 1 ? 'Waiting for others to join...' : `${count} player${count>1?'s':''} ready — let\'s go!`)
                : 'Select a module to enable start';
        }

        // Guest: watch for game start
        if (!mpState.isHost && room.status === 'started' && room.questions) {
            mpState.questions = room.questions;
            startMpQuiz();
        }

        // Host: watch for generating → started
        if (mpState.isHost && room.status === 'started' && room.questions && mpState.curQ === 0 && !document.getElementById('screen-mp-quiz').classList.contains('active')) {
            mpState.questions = room.questions;
            startMpQuiz();
        }
    });
}

function renderPlayerChips(players, host) {
    const wrap = document.getElementById('players-chips');
    wrap.innerHTML = '';
    Object.keys(players).forEach(name => {
        const chip = document.createElement('div');
        chip.className = `player-chip${name === host ? ' player-host' : ''}`;
        chip.innerHTML = `
            <span class="player-dot"></span>
            ${name}
            ${name === host ? '<span class="player-host-tag">HOST</span>' : ''}
            ${name === mpState.displayName && name !== host ? '<span class="player-host-tag" style="background:rgba(108,99,255,0.1);color:#6c63ff;">YOU</span>' : ''}
        `;
        wrap.appendChild(chip);
    });
}


/* ─────────────────────────────────────────────
   COPY ROOM CODE
   ───────────────────────────────────────────── */

document.getElementById('btn-copy-code').addEventListener('click', function() {
    navigator.clipboard.writeText(mpState.roomCode).catch(() => {});
    this.innerHTML = '<i class="fas fa-check"></i> Copied!';
    this.classList.add('copied');
    setTimeout(() => {
        this.innerHTML = '<i class="fas fa-copy"></i> Copy Code';
        this.classList.remove('copied');
    }, 2000);
});


/* ─────────────────────────────────────────────
   LOBBY MODULE PICKER (host only)
   ───────────────────────────────────────────── */

async function loadLobbyModules() {
    const container = document.getElementById('lobby-modules-container');
    try {
        const { data, error } = await supabase.storage
            .from('modules')
            .list(currentUser.uid, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

        if (error) throw error;
        const files = data.filter(f => f.name !== '.emptyFolderPlaceholder');

        if (!files.length) {
            container.className = 'state-center';
            container.innerHTML = `<i class="fas fa-folder-open"></i><p>No modules. <a href="dashboard.html" style="color:var(--primary-teal)">Upload one first.</a></p>`;
            return;
        }

        container.className = 'lobby-modules-grid';
        container.innerHTML = '';
        const iconMap = { pdf:'fa-file-pdf', docx:'fa-file-word', doc:'fa-file-word', txt:'fa-file-alt', pptx:'fa-file-powerpoint' };

        files.forEach(file => {
            const ext  = file.name.split('.').pop().toLowerCase();
            const icon = iconMap[ext] || 'fa-file';
            const card = document.createElement('div');
            card.className = 'lobby-mod-card';
            card.innerHTML = `
                <div class="mod-icon"><i class="fas ${icon}"></i></div>
                <div class="lobby-mod-name">${file.name}</div>`;
            card.addEventListener('click', () => {
                document.querySelectorAll('.lobby-mod-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                mpState.selectedMod = { fileName: file.name, supabasePath: `${currentUser.uid}/${file.name}` };
                document.getElementById('lobby-config').style.display = 'block';
                // Enable start button
                const startBtn = document.getElementById('btn-start-mp');
                startBtn.disabled = false;
                document.getElementById('mp-start-hint').textContent = 'Ready! Start whenever you like.';
            });
            container.appendChild(card);
        });
    } catch(e) {
        container.innerHTML = `<p style="color:#aaa;font-size:0.8rem;">Failed to load modules.</p>`;
    }
}


/* ─────────────────────────────────────────────
   HOST: START QUIZ — generate then broadcast
   ───────────────────────────────────────────── */

document.getElementById('btn-start-mp').addEventListener('click', async () => {
    if (!mpState.selectedMod) return;

    const btn = document.getElementById('btn-start-mp');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    document.getElementById('mp-start-hint').textContent = 'Generating quiz from your module...';

    await update(ref(db, `rooms/${mpState.roomCode}`), { status: 'generating' });

    try {
        const type  = document.getElementById('lobby-type').value;
        const count = document.getElementById('lobby-qcount').value;
        const typeMap2 = { multiple:'multiple_choice', truefalse:'true_or_false', fillblank:'identification' };

        // Download from Supabase
        const { data: fileBlob, error: dlErr } = await supabase.storage
            .from('modules')
            .download(mpState.selectedMod.supabasePath);
        if (dlErr) throw new Error(dlErr.message);

        // Send to quiz API
        const formData = new FormData();
        formData.append('file', new File([fileBlob], mpState.selectedMod.fileName, { type: 'application/pdf' }));
        formData.append('quiz_type', typeMap2[type]);
        formData.append('question_count', count.toString());

        const res  = await fetch(API_URL, { method: 'POST', body: formData });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        if (!data.quiz || !data.quiz.length) throw new Error('No questions returned.');

        const questions = data.quiz.slice(0, parseInt(count)).map(q => ({
            q:      q.question,
            choices: q.choices || null,
            answer: type === 'multiple'
                        ? (q.choices || []).indexOf(q.answer)
                        : type === 'truefalse'
                            ? q.answer.toLowerCase() === 'true'
                            : q.answer,
            correctLabel: q.answer
        }));

        mpState.questions   = questions;
        mpState.currentType = type;

        // Broadcast to room
        await update(ref(db, `rooms/${mpState.roomCode}`), {
            status:    'started',
            questions: questions,
            quizType:  type,
            startedAt: Date.now()
        });

        startMpQuiz();

    } catch(e) {
        await update(ref(db, `rooms/${mpState.roomCode}`), { status: 'waiting' });
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-play"></i> Start Quiz';
        document.getElementById('mp-start-hint').textContent = 'Error: ' + e.message;
    }
});

function startMpQuiz() {
    // Pull quiz type from room if guest
    mpState.curQ     = 0;
    mpState.score    = 0;
    mpState.answered = false;
    document.getElementById('mp-tot-q').textContent = mpState.questions.length;

    // Watch room for quiz type
    get(ref(db, `rooms/${mpState.roomCode}/quizType`)).then(snap => {
        if (snap.exists()) mpState.currentType = snap.val();
        showScreen('screen-mp-quiz');
        renderMpQuestion();
    });
}

function renderMpQuestion() {
    mpState.answered = false;
    const q     = mpState.questions[mpState.curQ];
    const total = mpState.questions.length;
    mpState.timeLeft = 20;

    document.getElementById('mp-cur-q').textContent       = mpState.curQ + 1;
    document.getElementById('mp-prog-fill').style.width   = `${((mpState.curQ+1)/total)*100}%`;
    document.getElementById('mp-q-text').textContent      = q.q;
    document.getElementById('mp-live-score').textContent  = mpState.score;
    document.getElementById('mp-feedback').style.display  = 'none';
    document.getElementById('mp-feedback').className      = 'feedback';

    const timer = document.getElementById('mp-timer');
    timer.textContent = '20';
    timer.classList.remove('urgent');

    const wrap = document.getElementById('mp-answers-wrap');
    wrap.innerHTML = '';

    if      (mpState.currentType === 'multiple')  buildMpMultiple(q, wrap);
    else if (mpState.currentType === 'truefalse') buildMpTF(q, wrap);
    else                                           buildMpFITB(q, wrap);

    clearInterval(mpState.timerInterval);
    mpState.timerInterval = setInterval(() => {
        mpState.timeLeft--;
        timer.textContent = mpState.timeLeft;
        if (mpState.timeLeft <= 5) timer.classList.add('urgent');
        if (mpState.timeLeft <= 0) {
            clearInterval(mpState.timerInterval);
            if (!mpState.answered) {
                mpState.answered = true;
                showMpFeedback(false, '');
                saveMpScore();
                setTimeout(nextMpQuestion, 2000);
            }
        }
    }, 1000);
}

function buildMpMultiple(q, wrap) {
    const grid = document.createElement('div');
    grid.className = 'choices-grid';
    ['A','B','C','D'].forEach((L, i) => {
        if (!q.choices || !q.choices[i]) return;
        const btn = document.createElement('button');
        btn.className   = 'choice-btn';
        btn.dataset.idx = i;
        btn.innerHTML   = `<div class="choice-letter">${L}</div><span>${q.choices[i]}</span>`;
        btn.addEventListener('click', () => { if (!mpState.answered) submitMpAnswer('multiple', parseInt(btn.dataset.idx), q, grid); });
        grid.appendChild(btn);
    });
    wrap.appendChild(grid);
}

function buildMpTF(q, wrap) {
    const grid = document.createElement('div');
    grid.className = 'tf-grid';
    ['True','False'].forEach(label => {
        const btn = document.createElement('button');
        btn.className   = `tf-btn ${label.toLowerCase()}-btn`;
        btn.dataset.val = label.toLowerCase();
        btn.innerHTML   = `<i class="fas fa-${label==='True'?'check':'times'}"></i>${label}`;
        btn.addEventListener('click', () => { if (!mpState.answered) submitMpAnswer('truefalse', label.toLowerCase(), q, grid); });
        grid.appendChild(btn);
    });
    wrap.appendChild(grid);
}

function buildMpFITB(q, wrap) {
    const div = document.createElement('div');
    div.className = 'fitb-wrap';
    const inp = document.createElement('input');
    inp.type        = 'text';
    inp.className   = 'fitb-input';
    inp.placeholder = 'Type your answer and press Enter...';
    inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && inp.value.trim() && !mpState.answered) submitMpAnswer('fillblank', inp.value.trim(), q, inp);
    });
    div.appendChild(inp);
    wrap.appendChild(div);
    setTimeout(() => inp.focus(), 50);
}

function submitMpAnswer(type, userVal, q, container) {
    if (mpState.answered) return;
    mpState.answered = true;
    clearInterval(mpState.timerInterval);

    let ok = false;
    if (type === 'multiple') {
        ok = userVal === q.answer;
        container.querySelectorAll('.choice-btn').forEach((b, i) => {
            b.style.pointerEvents = 'none';
            if (i === q.answer) b.classList.add('correct');
            else if (parseInt(b.dataset.idx) === userVal && !ok) b.classList.add('wrong');
        });
    } else if (type === 'truefalse') {
        ok = (userVal === 'true') === q.answer;
        container.querySelectorAll('.tf-btn').forEach(b => {
            b.style.pointerEvents = 'none';
            if ((b.dataset.val === 'true') === q.answer) b.classList.add('correct');
            else if (b.dataset.val === userVal && !ok) b.classList.add('wrong');
        });
    } else {
        const hints = (q.hints || [q.answer]).map(h => h.toLowerCase());
        ok = hints.includes(userVal.toLowerCase());
        container.disabled = true;
        container.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) {
            const hint = document.createElement('div');
            hint.className   = 'fitb-hint';
            hint.textContent = `Correct answer: ${q.answer}`;
            container.parentNode.appendChild(hint);
        }
    }

    const pts = ok ? Math.max(100, mpState.timeLeft * 15) : 0;
    if (ok) mpState.score += pts;
    document.getElementById('mp-live-score').textContent = mpState.score;

    showMpFeedback(ok, ok ? `+${pts} pts` : '');
    saveMpScore();
    setTimeout(nextMpQuestion, 2000);
}

function showMpFeedback(ok, extra) {
    const fb = document.getElementById('mp-feedback');
    fb.textContent   = ok ? `✓ Correct! ${extra}` : '✗ Incorrect';
    fb.className     = `feedback ${ok ? 'correct' : 'wrong'}`;
    fb.style.display = 'block';
}

async function saveMpScore() {
    const isLast = mpState.curQ === mpState.questions.length - 1;
    await update(ref(db, `rooms/${mpState.roomCode}/players/${mpState.displayName}`), {
        score: mpState.score,
        done:  isLast
    });
}

function nextMpQuestion() {
    if (mpState.curQ < mpState.questions.length - 1) {
        mpState.curQ++;
        renderMpQuestion();
    } else {
        finishMpQuiz();
    }
}

async function finishMpQuiz() {
    clearInterval(mpState.timerInterval);
    await update(ref(db, `rooms/${mpState.roomCode}/players/${mpState.displayName}`), {
        score: mpState.score, done: true
    });

    const total = mpState.questions.length;
    const pct   = Math.round((mpState.score / (total * 200)) * 100);
    document.getElementById('mp-res-pct').textContent = `${mpState.score}`;

    const titles = [
        [300, 'Incredible! 🎉'], [200, 'Great job! 🔥'],
        [100, 'Good effort! 👍'], [0, 'Keep practicing! 💪']
    ];
    document.getElementById('mp-res-title').textContent = (titles.find(([min]) => mpState.score >= min) || titles[3])[1];

    showScreen('screen-mp-results');
    watchLeaderboard();
}

function watchLeaderboard() {
    const roomRef = ref(db, `rooms/${mpState.roomCode}/players`);
    onValue(roomRef, (snap) => {
        if (!snap.exists()) return;
        const players = snap.val();
        const sorted  = Object.entries(players).sort((a,b) => b[1].score - a[1].score);
        const allDone = sorted.every(([,p]) => p.done);
        const medals  = ['🥇','🥈','🥉'];

        document.getElementById('mp-lb-rows').innerHTML = sorted.map(([name, p], i) => `
            <div class="mp-lb-row${name === mpState.displayName ? ' me' : ''}">
                <span class="mp-lb-rank">${medals[i] || (i+1)}</span>
                <span class="mp-lb-name">
                    ${name}
                    ${name === mpState.displayName ? '<span class="mp-lb-you">YOU</span>' : ''}
                </span>
                <span class="mp-lb-score">${p.score} pts</span>
            </div>`).join('');

        document.getElementById('mp-lb-updating').style.display = allDone ? 'none' : 'flex';
    });
}

document.getElementById('mp-btn-home').addEventListener('click', () => {
    showScreen('screen-mode');
});


function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}