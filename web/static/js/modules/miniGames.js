// miniGames.js — Lesson-integrated mini-game engine
// Games: Bug Hunt, Output Predictor, Syntax Recall

const GAME_CONFIG = {
    questionsPerRound: 5,
    timeLimitMs: 60000,
    baseXP: 50,
    streakBonusXP: 10,
    perfectBonusXP: 100,
};

// ─── Question Generators ────────────────────────────────────────

function generateBugHuntQuestions(lesson) {
    const lines = lesson.goCode.split('\n').filter(l => l.trim().length > 0);
    const questions = [];
    const bugTypes = [
        { name: 'missing-colon', apply: line => line.replace(':=', '='), desc: 'Short variable declaration := replaced with =' },
        { name: 'wrong-quote', apply: line => line.replace(/"/g, "'"), desc: 'Double quotes replaced with single quotes' },
        { name: 'missing-paren', apply: line => line.replace(')', ''), desc: 'Missing closing parenthesis' },
        { name: 'wrong-func', apply: line => line.replace('Println', 'Printlm'), desc: 'Typo in function name' },
        { name: 'missing-import', apply: line => line.replace('fmt.', 'fmtt.'), desc: 'Typo in package name' },
        { name: 'extra-semicolon', apply: line => line + ';', desc: 'Unnecessary semicolon added' },
        { name: 'wrong-bracket', apply: line => line.replace('{', '['), desc: 'Curly brace replaced with square bracket' },
        { name: 'capitalization', apply: line => line.replace(/func (\w)/, (m, c) => 'func ' + c.toLowerCase()), desc: 'Exported function name lowercased' },
    ];

    // Generate questions from actual code lines
    for (let i = 0; i < lines.length && questions.length < 8; i++) {
        const line = lines[i];
        for (const bug of bugTypes) {
            const bugged = bug.apply(line);
            if (bugged !== line && bugged.trim().length > 0) {
                questions.push({
                    type: 'bug-hunt',
                    code: lines.map((l, idx) => ({
                        text: idx === i ? bugged : l,
                        lineNum: idx + 1,
                        isBuggy: idx === i,
                    })),
                    bugLine: i + 1,
                    bugDesc: bug.desc,
                    original: line,
                    fixed: line,
                });
                break;
            }
        }
    }

    return shuffle(questions).slice(0, GAME_CONFIG.questionsPerRound);
}

function generateOutputPredictorQuestions(lesson) {
    const questions = [];

    // From challenge expected output
    if (lesson.challenge && lesson.challenge.expectedOutput) {
        const correct = lesson.challenge.expectedOutput.trim();
        questions.push({
            type: 'output-predictor',
            code: lesson.challenge.solution || lesson.goCode,
            correctAnswer: correct,
            options: generateOutputOptions(correct),
        });
    }

    // From test cases
    if (lesson.testCases) {
        for (const tc of lesson.testCases) {
            if (tc.expectedOutput && tc.expectedOutput.trim()) {
                const correct = tc.expectedOutput.trim();
                questions.push({
                    type: 'output-predictor',
                    code: tc.wrapperCode || lesson.goCode,
                    correctAnswer: correct,
                    options: generateOutputOptions(correct),
                });
            }
        }
    }

    // From the main Go code + explanation
    if (lesson.goCode && lesson.challenge && lesson.challenge.expectedOutput) {
        const correct = lesson.challenge.expectedOutput.trim();
        const firstLine = correct.split('\n')[0];
        if (firstLine) {
            questions.push({
                type: 'output-predictor',
                code: lesson.goCode,
                correctAnswer: firstLine,
                options: generateOutputOptions(firstLine),
            });
        }
    }

    return shuffle(questions).slice(0, GAME_CONFIG.questionsPerRound);
}

function generateOutputOptions(correct) {
    const opts = [correct];
    const mutations = [
        s => s.toUpperCase() === s ? s.toLowerCase() : s.toUpperCase(),
        s => s.split('').reverse().join(''),
        s => s.replace(/\d+/g, m => String(Number(m) + 1)),
        s => s.replace(/\d+/g, m => String(Number(m) * 2)),
        s => 'nil',
        s => 'error: undefined',
        s => s + ' ' + s.split(' ')[0],
        s => s.replace(/[a-zA-Z]/, c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()),
    ];

    const used = new Set([correct]);
    const shuffledMuts = shuffle([...mutations]);
    for (const mut of shuffledMuts) {
        if (opts.length >= 4) break;
        const variant = mut(correct);
        if (variant !== correct && !used.has(variant) && variant.trim().length > 0) {
            opts.push(variant);
            used.add(variant);
        }
    }

    // Fill remaining with generic wrong answers
    const fillers = ['compilation error', 'runtime panic', '<nil>', '0', 'undefined'];
    for (const f of fillers) {
        if (opts.length >= 4) break;
        if (!used.has(f)) {
            opts.push(f);
            used.add(f);
        }
    }

    return shuffle(opts);
}

function generateSyntaxRecallQuestions(lesson) {
    const questions = [];
    const code = lesson.goCode || '';
    const lines = code.split('\n').filter(l => l.trim().length > 3);

    // Extract interesting Go syntax patterns
    const patterns = [
        { regex: /(:=\s*.+)/, hint: 'Short variable declaration', mask: ':=' },
        { regex: /(fmt\.\w+\(.+\))/, hint: 'Print statement', mask: 'fmt.' },
        { regex: /(func\s+\w+\(.*\)\s*\{?)/, hint: 'Function declaration', mask: 'func' },
        { regex: /(for\s+.+\{)/, hint: 'For loop', mask: 'for' },
        { regex: /(if\s+.+\{)/, hint: 'If statement', mask: 'if' },
        { regex: /(range\s+\w+)/, hint: 'Range iteration', mask: 'range' },
        { regex: /(import\s+.+)/, hint: 'Import statement', mask: 'import' },
        { regex: /(var\s+\w+\s+\w+)/, hint: 'Variable declaration', mask: 'var' },
        { regex: /(type\s+\w+\s+struct)/, hint: 'Struct definition', mask: 'type' },
        { regex: /(make\(\w+.+\))/, hint: 'Make call', mask: 'make' },
        { regex: /(append\(.+\))/, hint: 'Append call', mask: 'append' },
        { regex: /(defer\s+.+)/, hint: 'Defer statement', mask: 'defer' },
        { regex: /(go\s+\w+\(.+\))/, hint: 'Goroutine launch', mask: 'go ' },
        { regex: /(chan\s+\w+)/, hint: 'Channel declaration', mask: 'chan' },
        { regex: /(select\s*\{)/, hint: 'Select statement', mask: 'select' },
        { regex: /(switch\s+.+\{)/, hint: 'Switch statement', mask: 'switch' },
    ];

    for (const line of lines) {
        for (const pat of patterns) {
            const match = line.match(pat.regex);
            if (match) {
                const answer = match[1].trim();
                // Create a fill-in prompt by blanking out the key part
                const blanked = line.replace(match[1], '________');
                questions.push({
                    type: 'syntax-recall',
                    prompt: `Complete the ${pat.hint.toLowerCase()}:`,
                    context: blanked.trim(),
                    answer: answer,
                    hint: pat.hint,
                    keyword: pat.mask,
                });
                break;
            }
        }
    }

    return shuffle(questions).slice(0, GAME_CONFIG.questionsPerRound);
}

// ─── Mini Game Engine ────────────────────────────────────────────

export class MiniGameEngine {
    constructor(container, lesson, onComplete) {
        this.container = container;
        this.lesson = lesson;
        this.onComplete = onComplete;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.correct = 0;
        this.total = 0;
        this.questions = [];
        this.currentQ = 0;
        this.timerStart = 0;
        this.timerInterval = null;
        this.gameType = null;
        this.answered = false;
    }

    start(gameType) {
        this.gameType = gameType;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.correct = 0;
        this.currentQ = 0;
        this.answered = false;

        switch (gameType) {
            case 'bug-hunt':
                this.questions = generateBugHuntQuestions(this.lesson);
                break;
            case 'output-predictor':
                this.questions = generateOutputPredictorQuestions(this.lesson);
                break;
            case 'syntax-recall':
                this.questions = generateSyntaxRecallQuestions(this.lesson);
                break;
        }

        this.total = this.questions.length;
        if (this.total === 0) {
            this.showNoQuestions();
            return;
        }

        this.timerStart = Date.now();
        this.render();
        this.startTimer();
    }

    startTimer() {
        const bar = this.container.querySelector('.mg-timer-fill');
        if (!bar) return;
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.timerStart;
            const pct = Math.min(100, (elapsed / GAME_CONFIG.timeLimitMs) * 100);
            bar.style.width = pct + '%';
            if (pct >= 75) bar.classList.add('mg-timer-danger');
            if (elapsed >= GAME_CONFIG.timeLimitMs) {
                this.endGame();
            }
        }, 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    render() {
        const q = this.questions[this.currentQ];
        if (!q) { this.endGame(); return; }

        this.answered = false;
        let html = this.buildHUD();

        switch (this.gameType) {
            case 'bug-hunt':
                html += this.renderBugHunt(q);
                break;
            case 'output-predictor':
                html += this.renderOutputPredictor(q);
                break;
            case 'syntax-recall':
                html += this.renderSyntaxRecall(q);
                break;
        }

        this.container.innerHTML = html;
        this.bindEvents(q);
    }

    buildHUD() {
        const elapsed = Date.now() - this.timerStart;
        const pct = Math.min(100, (elapsed / GAME_CONFIG.timeLimitMs) * 100);
        return `
            <div class="mg-hud">
                <div class="mg-timer">
                    <div class="mg-timer-fill ${pct >= 75 ? 'mg-timer-danger' : ''}" style="width:${pct}%"></div>
                </div>
                <div class="mg-stats">
                    <span class="mg-score">&#x2B50; ${this.score}</span>
                    <span class="mg-streak">${this.streak > 0 ? '&#x1F525; ' + this.streak + 'x' : ''}</span>
                    <span class="mg-progress">${this.currentQ + 1} / ${this.total}</span>
                </div>
            </div>
        `;
    }

    // ── Bug Hunt ─────────────────────────────────

    renderBugHunt(q) {
        const lines = q.code.map(l =>
            `<div class="mg-code-line" data-line="${l.lineNum}">
                <span class="mg-line-num">${l.lineNum}</span>
                <span class="mg-line-text">${escapeHtml(l.text)}</span>
            </div>`
        ).join('');

        return `
            <div class="mg-question">
                <div class="mg-question-header">
                    <span class="mg-game-icon">&#x1F41B;</span>
                    <span>Find the bug! Click the line with the error.</span>
                </div>
                <div class="mg-code-block">${lines}</div>
            </div>
        `;
    }

    // ── Output Predictor ─────────────────────────

    renderOutputPredictor(q) {
        const opts = q.options.map((o, i) =>
            `<button class="mg-option" data-idx="${i}">${escapeHtml(truncate(o, 80))}</button>`
        ).join('');

        const codePreview = truncate(q.code, 500);

        return `
            <div class="mg-question">
                <div class="mg-question-header">
                    <span class="mg-game-icon">&#x1F52E;</span>
                    <span>What does this code output?</span>
                </div>
                <pre class="mg-code-preview">${escapeHtml(codePreview)}</pre>
                <div class="mg-options">${opts}</div>
            </div>
        `;
    }

    // ── Syntax Recall ────────────────────────────

    renderSyntaxRecall(q) {
        return `
            <div class="mg-question">
                <div class="mg-question-header">
                    <span class="mg-game-icon">&#x1F9E0;</span>
                    <span>${escapeHtml(q.prompt)}</span>
                </div>
                <pre class="mg-code-preview">${escapeHtml(q.context)}</pre>
                <div class="mg-recall-input">
                    <input type="text" class="mg-input" placeholder="Type the missing code..." autocomplete="off" spellcheck="false" />
                    <button class="mg-submit-btn">Check</button>
                </div>
                <div class="mg-hint-text">Hint: uses <code>${escapeHtml(q.keyword)}</code></div>
            </div>
        `;
    }

    bindEvents(q) {
        if (this.gameType === 'bug-hunt') {
            this.container.querySelectorAll('.mg-code-line').forEach(el => {
                el.addEventListener('click', () => {
                    if (this.answered) return;
                    this.answered = true;
                    const clickedLine = parseInt(el.dataset.line);
                    const isCorrect = clickedLine === q.bugLine;
                    el.classList.add(isCorrect ? 'mg-correct' : 'mg-wrong');
                    // Highlight the real bug line
                    if (!isCorrect) {
                        const real = this.container.querySelector(`[data-line="${q.bugLine}"]`);
                        if (real) real.classList.add('mg-correct');
                    }
                    this.showFeedback(isCorrect, q.bugDesc);
                });
            });
        }

        if (this.gameType === 'output-predictor') {
            this.container.querySelectorAll('.mg-option').forEach(el => {
                el.addEventListener('click', () => {
                    if (this.answered) return;
                    this.answered = true;
                    const idx = parseInt(el.dataset.idx);
                    const picked = q.options[idx];
                    const isCorrect = picked === q.correctAnswer;
                    el.classList.add(isCorrect ? 'mg-correct' : 'mg-wrong');
                    // Highlight correct
                    if (!isCorrect) {
                        this.container.querySelectorAll('.mg-option').forEach(btn => {
                            if (q.options[parseInt(btn.dataset.idx)] === q.correctAnswer) {
                                btn.classList.add('mg-correct');
                            }
                        });
                    }
                    this.showFeedback(isCorrect, `Output: ${q.correctAnswer}`);
                });
            });
        }

        if (this.gameType === 'syntax-recall') {
            const input = this.container.querySelector('.mg-input');
            const btn = this.container.querySelector('.mg-submit-btn');
            if (!input || !btn) return;

            const check = () => {
                if (this.answered) return;
                this.answered = true;
                const typed = input.value.trim();
                const isCorrect = normalizeCode(typed) === normalizeCode(q.answer);
                input.classList.add(isCorrect ? 'mg-correct' : 'mg-wrong');
                this.showFeedback(isCorrect, q.answer);
            };

            btn.addEventListener('click', check);
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') check();
            });
            input.focus();
        }
    }

    showFeedback(isCorrect, detail) {
        if (isCorrect) {
            this.correct++;
            this.streak++;
            if (this.streak > this.maxStreak) this.maxStreak = this.streak;
            const bonus = this.streak > 1 ? this.streak * GAME_CONFIG.streakBonusXP : 0;
            this.score += GAME_CONFIG.baseXP + bonus;
        } else {
            this.streak = 0;
        }

        const fb = document.createElement('div');
        fb.className = `mg-feedback ${isCorrect ? 'mg-fb-correct' : 'mg-fb-wrong'}`;
        fb.innerHTML = `
            <div class="mg-fb-icon">${isCorrect ? '&#x2705;' : '&#x274C;'}</div>
            <div class="mg-fb-text">${isCorrect ? 'Correct!' : 'Not quite!'}</div>
            <div class="mg-fb-detail">${escapeHtml(truncate(detail, 120))}</div>
            ${this.streak > 1 ? `<div class="mg-fb-streak">&#x1F525; ${this.streak}x streak!</div>` : ''}
        `;
        this.container.appendChild(fb);

        // Update HUD
        const scoreEl = this.container.querySelector('.mg-score');
        if (scoreEl) scoreEl.innerHTML = `&#x2B50; ${this.score}`;
        const streakEl = this.container.querySelector('.mg-streak');
        if (streakEl) streakEl.innerHTML = this.streak > 0 ? `&#x1F525; ${this.streak}x` : '';

        setTimeout(() => {
            this.currentQ++;
            if (this.currentQ >= this.total) {
                this.endGame();
            } else {
                this.render();
            }
        }, 1200);
    }

    endGame() {
        this.stopTimer();
        const elapsed = Math.round((Date.now() - this.timerStart) / 1000);
        const pct = this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0;
        const perfect = pct === 100;
        if (perfect) this.score += GAME_CONFIG.perfectBonusXP;

        // Save best score
        const key = `goquest_minigame_${this.lesson.slug}_${this.gameType}`;
        const prev = parseInt(localStorage.getItem(key) || '0');
        if (this.score > prev) localStorage.setItem(key, String(this.score));

        const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct > 0 ? 1 : 0;
        const starHtml = '&#x2B50;'.repeat(stars) + '<span class="mg-star-empty">&#x2B50;</span>'.repeat(3 - stars);

        this.container.innerHTML = `
            <div class="mg-results">
                <div class="mg-results-title">${perfect ? '&#x1F389; PERFECT!' : '&#x1F3C1; Round Complete!'}</div>
                <div class="mg-results-stars">${starHtml}</div>
                <div class="mg-results-stats">
                    <div class="mg-stat"><span class="mg-stat-val">${this.correct}/${this.total}</span><span class="mg-stat-label">Correct</span></div>
                    <div class="mg-stat"><span class="mg-stat-val">${this.maxStreak}x</span><span class="mg-stat-label">Best Streak</span></div>
                    <div class="mg-stat"><span class="mg-stat-val">${elapsed}s</span><span class="mg-stat-label">Time</span></div>
                    <div class="mg-stat"><span class="mg-stat-val">${this.score}</span><span class="mg-stat-label">Score</span></div>
                </div>
                <div class="mg-results-actions">
                    <button class="mg-btn mg-btn-replay" data-action="replay">&#x1F504; Play Again</button>
                    <button class="mg-btn mg-btn-done" data-action="done">&#x2705; Continue</button>
                </div>
            </div>
        `;

        this.container.querySelector('[data-action="replay"]').addEventListener('click', () => {
            this.start(this.gameType);
        });
        this.container.querySelector('[data-action="done"]').addEventListener('click', () => {
            if (this.onComplete) this.onComplete({ score: this.score, correct: this.correct, total: this.total, stars, gameType: this.gameType });
        });
    }

    showNoQuestions() {
        this.container.innerHTML = `
            <div class="mg-results">
                <div class="mg-results-title">No questions available for this game type on this lesson.</div>
                <div class="mg-results-actions">
                    <button class="mg-btn mg-btn-done" data-action="done">&#x2705; Continue</button>
                </div>
            </div>
        `;
        this.container.querySelector('[data-action="done"]').addEventListener('click', () => {
            if (this.onComplete) this.onComplete({ score: 0, correct: 0, total: 0, stars: 0, gameType: this.gameType });
        });
    }

    destroy() {
        this.stopTimer();
        this.container.innerHTML = '';
    }
}

// ─── Bonus Round Picker UI ──────────────────────────────────────

export function renderBonusRoundPicker(container, lesson, onSelect, onSkip) {
    const games = [
        { id: 'bug-hunt', icon: '&#x1F41B;', name: 'Bug Hunt', desc: 'Find the bug in each code snippet' },
        { id: 'output-predictor', icon: '&#x1F52E;', name: 'Output Predictor', desc: 'Predict what the code outputs' },
        { id: 'syntax-recall', icon: '&#x1F9E0;', name: 'Syntax Recall', desc: 'Fill in the missing Go syntax' },
    ];

    // Check best scores
    const cards = games.map(g => {
        const bestKey = `goquest_minigame_${lesson.slug}_${g.id}`;
        const best = localStorage.getItem(bestKey);
        return `
            <button class="mg-picker-card" data-game="${g.id}">
                <div class="mg-picker-icon">${g.icon}</div>
                <div class="mg-picker-name">${g.name}</div>
                <div class="mg-picker-desc">${g.desc}</div>
                ${best ? `<div class="mg-picker-best">Best: ${best} pts</div>` : ''}
            </button>
        `;
    }).join('');

    container.innerHTML = `
        <div class="mg-picker">
            <div class="mg-picker-title">&#x1F3AE; Bonus Round!</div>
            <div class="mg-picker-subtitle">Test what you learned with a mini-game</div>
            <div class="mg-picker-grid">${cards}</div>
            <button class="mg-picker-skip">Skip &rarr;</button>
        </div>
    `;

    container.querySelectorAll('.mg-picker-card').forEach(el => {
        el.addEventListener('click', () => onSelect(el.dataset.game));
    });
    container.querySelector('.mg-picker-skip').addEventListener('click', onSkip);
}

// ─── Quest Map Replay ───────────────────────────────────────────

export function getBestGameScore(slug) {
    const types = ['bug-hunt', 'output-predictor', 'syntax-recall'];
    let best = 0;
    for (const t of types) {
        const val = parseInt(localStorage.getItem(`goquest_minigame_${slug}_${t}`) || '0');
        if (val > best) best = val;
    }
    return best;
}

// ─── Utilities ──────────────────────────────────────────────────

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(s, max) {
    if (!s) return '';
    return s.length > max ? s.slice(0, max) + '...' : s;
}

function normalizeCode(s) {
    return s.replace(/\s+/g, ' ').trim().toLowerCase();
}
