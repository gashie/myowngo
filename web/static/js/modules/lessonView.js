import { CodeEditor } from './codeEditor.js';
import { CodeRunner } from './codeRunner.js';
import { Progress } from './progress.js';
import { Gamification } from './gamification.js';
import { GameState } from './gameState.js';
import { Inventory, ITEM_DEFS } from './inventory.js';
import { MiniGameEngine, renderBonusRoundPicker } from './miniGames.js';
import { getSelectedLang, getLangInfo, renderLangSwitcher, LANGUAGES } from './langPicker.js';

/* ============================================
   DATA & SINGLETONS
   ============================================ */
const dataEl = document.getElementById('lesson-data');
if (!dataEl) throw new Error('No lesson data found');

const lessonData = JSON.parse(dataEl.textContent);
const progress = new Progress();
const gamification = new Gamification(progress);
const gameState = new GameState(progress);
const inventory = new Inventory(gameState);
const runner = new CodeRunner();

const challenge = lessonData.challenge || {};
const testCases = lessonData.testCases || [];

/* ============================================
   STATE
   ============================================ */
const STEPS = ['mission', 'learn', 'compare', 'practice', 'challenge', 'test'];
const STEP_TO_SECTION = { mission: 'mission', learn: 'tutorial', compare: 'tutorial', practice: 'practice', challenge: 'challenge', test: 'test' };
const STEP_TO_QUEST = { learn: 'read', compare: 'compare', practice: 'practice', challenge: 'challenge', test: 'test' };

let currentStep = 'learn';
let practiceEditor = null;
let challengeEditor = null;
let testEditor = null;
let practiceRunCount = 0;
let challengeHintIndex = 0;
let testModeLocked = false;
let currentTestIndex = 0;
let originalGoCode = '';
let gopherIdleTimer = null;
let currentMode = localStorage.getItem('goquest_mode') || 'read';
let currentSlides = [];
let currentSlideIndex = 0;
// Store original step HTML for restoring when switching back from tutor mode
const originalStepHTML = {};
let lastRunTime = 0;
const RUN_DEBOUNCE_MS = 1000;
let challengeStartTime = 0;
let challengeTimerInterval = null;

/* ============================================
   CODE PERSISTENCE (localStorage per lesson/step)
   ============================================ */
// DEV_MODE: unlock all sections for testing (set via ?dev=1 query param or localStorage)
const DEV_MODE = new URLSearchParams(window.location.search).get('dev') === '1' || localStorage.getItem('goquest_dev') === '1';

const STORAGE_PREFIX = 'goquest_code_' + lessonData.slug + '_';

function saveEditorCode(step, code) {
    try { localStorage.setItem(STORAGE_PREFIX + step, code); } catch (e) { /* quota */ }
}

function loadEditorCode(step) {
    try { return localStorage.getItem(STORAGE_PREFIX + step); } catch (e) { return null; }
}

/* ============================================
   DEBOUNCED RUN (1s rate limit)
   ============================================ */
function canRun() {
    const now = Date.now();
    if (now - lastRunTime < RUN_DEBOUNCE_MS) return false;
    lastRunTime = now;
    return true;
}

/* ============================================
   GO ERROR TRANSLATOR (JS-dev-friendly messages)
   ============================================ */
const GO_ERROR_TRANSLATIONS = [
    { pattern: /undefined: (\w+)/g, msg: (m, name) => `"${name}" is not defined. In Go you must declare variables before use (var ${name} or ${name} :=).` },
    { pattern: /imported and not used: "([^"]+)"/g, msg: (m, pkg) => `You imported "${pkg}" but never used it. Go doesn't allow unused imports — remove it or use it.` },
    { pattern: /(\w+) declared (but|and) not used/g, msg: (m, name) => `Variable "${name}" is declared but never used. Use _ instead if you don't need it.` },
    { pattern: /cannot use (.+?) \(.*?type (.+?)\) as type (.+)/g, msg: (m, val, got, want) => `Type mismatch: you passed ${got} but ${want} was expected. Go is strictly typed — no implicit conversion.` },
    { pattern: /syntax error: unexpected (.+?), expecting (.+)/g, msg: (m, got, want) => `Syntax error: Go found "${got}" but expected "${want}". Check for missing braces, parentheses, or commas.` },
    { pattern: /missing return at end of function/g, msg: () => `Your function declares a return type but doesn't return a value on all code paths. Every branch must return.` },
    { pattern: /cannot assign to (.+)/g, msg: (m, target) => `Cannot assign to ${target}. It might be a constant, or you need to use a pointer.` },
    { pattern: /no new variables on left side of :=/g, msg: () => `All variables on the left of := already exist. Use = instead of := when reassigning.` },
    { pattern: /multiple-value .+ in single-value context/g, msg: () => `This function returns multiple values. In Go, you must capture all return values: val, err := fn()` },
];

function translateGoError(errMsg) {
    if (!errMsg) return '';
    let translated = errMsg;
    for (const rule of GO_ERROR_TRANSLATIONS) {
        rule.pattern.lastIndex = 0;
        translated = translated.replace(rule.pattern, rule.msg);
    }
    return translated;
}

/* ============================================
   CHARACTER-LEVEL DIFF HIGHLIGHTING
   ============================================ */
function charDiff(expected, actual) {
    const expLines = expected.split('\n');
    const actLines = actual.split('\n');
    const maxLines = Math.max(expLines.length, actLines.length);
    let expHtml = '', actHtml = '';
    for (let i = 0; i < maxLines; i++) {
        const eLine = expLines[i] || '';
        const aLine = actLines[i] || '';
        if (eLine === aLine) {
            expHtml += escapeHtml(eLine) + '\n';
            actHtml += escapeHtml(aLine) + '\n';
        } else {
            // Highlight char-by-char differences
            const maxLen = Math.max(eLine.length, aLine.length);
            let eLineHtml = '', aLineHtml = '';
            for (let j = 0; j < maxLen; j++) {
                const ec = eLine[j] || '';
                const ac = aLine[j] || '';
                if (ec === ac) {
                    eLineHtml += escapeHtml(ec);
                    aLineHtml += escapeHtml(ac);
                } else {
                    if (ec) eLineHtml += `<span class="diff-char-exp">${escapeHtml(ec)}</span>`;
                    if (ac) aLineHtml += `<span class="diff-char-got">${escapeHtml(ac)}</span>`;
                }
            }
            expHtml += eLineHtml + '\n';
            actHtml += aLineHtml + '\n';
        }
    }
    return { expHtml: expHtml.trimEnd(), actHtml: actHtml.trimEnd() };
}

/* ============================================
   STEP NAVIGATION
   ============================================ */
function goToStep(step) {
    if (testModeLocked && step !== 'test') return;
    if (!STEPS.includes(step)) return;

    // Hide all steps
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
    });
    // Show target step
    const target = document.getElementById('step-' + step);
    if (target) target.classList.add('active');

    currentStep = step;

    // Update sidebar
    updateSidebar();
    // Update wizard visibility
    updateWizardVisibility(step);

    const isTutorialStep = ['mission', 'learn', 'compare'].includes(step);
    const isCodingStep = ['practice', 'challenge', 'test'].includes(step);

    // Stop speech when leaving tutor slides
    gopherStopSpeaking();

    // If tutor mode + tutorial step, render tutor view with speaking gopher
    if (currentMode === 'tutor' && isTutorialStep) {
        renderTutorMode(step);
    }

    // Set chathead tips for coding steps
    if (isCodingStep) {
        const tipKey = step === 'practice' ? 'practice_start' : step === 'challenge' ? 'challenge_start' : 'test_start';
        setChatheadTip(CHATHEAD_TIPS[tipKey]);
        showChatheadBubble();
        setTimeout(hideChatheadBubble, 5000);
    }

    // Auto-run practice code on first visit
    if (step === 'practice' && practiceRunCount === 0 && practiceEditor) {
        setTimeout(() => runPractice(), 500);
    }

    // Start challenge timer
    if (step === 'challenge' && !challengeStartTime) {
        challengeStartTime = Date.now();
        const timerEl = document.getElementById('challenge-timer');
        if (timerEl) {
            challengeTimerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - challengeStartTime) / 1000);
                const mins = Math.floor(elapsed / 60);
                const secs = elapsed % 60;
                timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }, 1000);
        }
    }

    // Refresh editor if needed
    setTimeout(() => {
        if (step === 'practice' && practiceEditor) practiceEditor.refresh();
        if (step === 'challenge' && challengeEditor) challengeEditor.refresh();
        if (step === 'test' && testEditor) testEditor.refresh();
    }, 50);

    // Auto-complete mission/learn/compare on view
    if (step === 'mission') completeStep('mission');
    if (step === 'learn') completeStep('learn');
    if (step === 'compare') completeStep('compare');

    // Scroll main to top (only for tutorial steps)
    const main = document.getElementById('lesson-main');
    if (main) main.scrollTop = 0;
}

function updateSidebar() {
    const section = STEP_TO_SECTION[currentStep];

    // Update section active state
    document.querySelectorAll('.sidebar-section').forEach(sec => {
        sec.classList.remove('active');
    });
    const activeSec = document.getElementById('sec-' + section);
    if (activeSec && !activeSec.classList.contains('locked')) {
        activeSec.classList.add('active');
    }

    // Update item active state
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`.sidebar-item[data-step="${currentStep}"]`);
    if (activeItem) activeItem.classList.add('active');
}

function unlockSection(sectionName) {
    const sec = document.getElementById('sec-' + sectionName);
    if (!sec || !sec.classList.contains('locked')) return;
    sec.classList.remove('locked');
    // Remove lock icon
    const lock = sec.querySelector('.sec-lock');
    if (lock) lock.style.display = 'none';
}

function completeStep(stepName) {
    const saved = progress.getLessonState(lessonData.slug);
    const key = stepName + 'Done';
    if (saved[key]) return; // Already done

    let xp = 0, coins = 0;
    if (stepName === 'mission') { xp = 0; coins = 0; }
    else if (stepName === 'practice') { xp = Math.floor(lessonData.xpReward * 0.2); coins = Math.floor(lessonData.coinReward * 0.2); }
    else if (stepName === 'challenge') {
        xp = (challenge.bonusXP || 0); coins = (challenge.bonusCoins || 0);
        // Apply 50% XP penalty if solution was revealed
        if (challengeEditor && challengeEditor._solutionRevealed) { xp = Math.floor(xp * 0.5); }
    }
    else if (stepName === 'test') { xp = Math.floor(lessonData.xpReward * 0.5); coins = Math.floor(lessonData.coinReward * 0.5); }
    else { xp = Math.floor(lessonData.xpReward * 0.15); coins = Math.floor(lessonData.coinReward * 0.15); }

    const result = progress.completeTab(lessonData.slug, stepName, xp, coins);

    if (result.xp > 0) {
        gamification.showXPPopup(result.xp);
    }

    // Update sidebar item check
    const ic = document.getElementById('ic-' + stepName);
    if (ic) ic.textContent = '\u2713';
    const item = document.querySelector(`.sidebar-item[data-step="${stepName}"]`);
    if (item) item.classList.add('completed');

    // Update quest
    markQuestDone(STEP_TO_QUEST[stepName] || stepName);

    // Update section meta
    updateSectionMeta();

    // Unlock next
    if (stepName === 'compare') unlockSection('practice');
    if (stepName === 'practice') {
        unlockSection('challenge');
        enableBtn('btn-next-challenge');
    }
    if (stepName === 'challenge') {
        unlockSection('test');
        enableBtn('btn-next-test');
    }

    // Update HUD
    updateHUD();

    // Check badges
    const newBadges = gamification.checkNewBadges();
    newBadges.forEach(b => gamification.showBadgeUnlock(b));

    // Check lesson complete
    if (stepName === 'test') {
        checkLessonComplete();
    }
}

function enableBtn(id) {
    const btn = document.getElementById(id);
    if (btn) { btn.disabled = false; btn.classList.remove('disabled'); }
}

/* ============================================
   RENDER: LEARN STEP
   ============================================ */
function renderLearn() {
    const body = document.getElementById('learn-body');
    if (!body) return;
    let html = '';

    // Source language code block (selected language or fallback to JS)
    const langId = getSelectedLang();
    const langInfo = getLangInfo(langId);
    const sourceCodes = lessonData.sourceCodes || {};
    const sourceCode = sourceCodes[langId] || lessonData.nodeCode;
    if (sourceCode) {
        html += `<div class="learn-section">
            <h3>How ${langInfo.name} does it</h3>
            <div class="learn-code-block">
                <div class="code-label">${langInfo.icon} ${langInfo.name}</div>
                <pre><code class="${langInfo.prismClass}">${escapeHtml(sourceCode)}</code></pre>
            </div>
        </div>`;
    }

    // Explanation
    if (lessonData.explanation) {
        html += `<div class="learn-section">
            <h3>Explanation</h3>
            <div class="learn-explanation">${renderMarkdown(lessonData.explanation)}</div>
        </div>`;
    }

    // Teacher tips
    const tips = lessonData.teacherTips || [];
    if (tips.length > 0) {
        html += '<div class="learn-section"><h3>Tips</h3>';
        tips.forEach(tip => {
            const typeClass = tip.type || 'remember';
            const icons = { gotcha: '\u26A0\uFE0F', remember: '\uD83D\uDE80', protip: '\uD83D\uDCA1', warning: '\u26A0\uFE0F' };
            html += `<div class="teacher-tip ${typeClass}">
                <div class="tip-title">${icons[typeClass] || ''} ${escapeHtml(tip.title)}</div>
                <div class="tip-text">${escapeHtml(tip.content)}</div>
            </div>`;
        });
        html += '</div>';
    }

    body.innerHTML = html;

    // Syntax highlight
    body.querySelectorAll('pre code').forEach(el => {
        try { if (window.Prism) Prism.highlightElement(el); } catch(e) { /* Prism component missing — show raw code */ }
    });

}

/* ============================================
   RENDER: COMPARE STEP
   ============================================ */
function renderCompare() {
    const langId = getSelectedLang();
    const langInfo = getLangInfo(langId);
    const sourceCodes = lessonData.sourceCodes || {};
    const sourceCode = sourceCodes[langId] || lessonData.nodeCode || '// No source code';

    // Update heading
    const heading = document.getElementById('compare-heading');
    if (heading) heading.textContent = `Compare: ${langInfo.name} vs Go`;

    // Update source label
    const sourceLabel = document.getElementById('compare-source-label');
    if (sourceLabel) sourceLabel.innerHTML = `${langInfo.icon} ${langInfo.label}`;

    // Update source code
    const sourceEl = document.getElementById('compare-source-code');
    const goEl = document.getElementById('compare-go-code');
    if (sourceEl) {
        sourceEl.className = langInfo.prismClass;
        sourceEl.textContent = sourceCode;
    }
    if (goEl) goEl.textContent = lessonData.goCode || '// No Go code';

    // Highlight
    if (window.Prism) {
        try { if (sourceEl) Prism.highlightElement(sourceEl); } catch(e) { /* missing Prism component */ }
        try { if (goEl) Prism.highlightElement(goEl); } catch(e) { /* missing Prism component */ }
    }

    // Render inline language switcher for compare step
    const switcherContainer = document.getElementById('compare-lang-switcher');
    if (switcherContainer) {
        const availableLangs = LANGUAGES.filter(l => sourceCodes[l.id]);
        if (availableLangs.length > 1) {
            switcherContainer.innerHTML = `<div class="compare-lang-tabs">
                ${availableLangs.map(l => `
                    <button class="compare-lang-tab ${l.id === langId ? 'active' : ''}" data-lang="${l.id}">
                        ${l.icon} ${l.name}
                    </button>
                `).join('')}
            </div>`;
            switcherContainer.querySelectorAll('.compare-lang-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    // Temporarily override for this render
                    const tempLang = tab.dataset.lang;
                    const tempInfo = getLangInfo(tempLang);
                    const tempCode = sourceCodes[tempLang] || sourceCode;
                    if (sourceEl) {
                        sourceEl.className = tempInfo.prismClass;
                        sourceEl.textContent = tempCode;
                        try { if (window.Prism) Prism.highlightElement(sourceEl); } catch(e) { /* */ }
                    }
                    if (sourceLabel) sourceLabel.innerHTML = `${tempInfo.icon} ${tempInfo.label}`;
                    if (heading) heading.textContent = `Compare: ${tempInfo.name} vs Go`;
                    switcherContainer.querySelectorAll('.compare-lang-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                });
            });
        }
    }

    // Annotations — interactive: click to highlight
    const annList = document.getElementById('annotations-list');
    const annotations = lessonData.annotations || [];
    const srcLabel = langId === 'javascript' ? 'JS' : langInfo.label;
    if (annList && annotations.length > 0) {
        annList.innerHTML = `<div class="compare-quiz-prompt">Click each difference to learn about it:</div>` +
            annotations.map((a, i) =>
            `<div class="annotation-row clickable" data-ann="${i}" data-revealed="false">
                <span class="annotation-lines">${srcLabel}:${a.lineSrc || a.lineNode} \u2194 Go:${a.lineGo}</span>
                <span class="ann-text hidden">${escapeHtml(a.text)}</span>
                <span class="ann-placeholder">Click to reveal...</span>
            </div>`
        ).join('') + `<div class="compare-progress" id="compare-progress">0/${annotations.length} differences found</div>`;

        let revealed = 0;
        annList.querySelectorAll('.annotation-row.clickable').forEach(row => {
            row.addEventListener('click', () => {
                if (row.dataset.revealed === 'true') return;
                row.dataset.revealed = 'true';
                row.classList.add('revealed');
                row.querySelector('.ann-text')?.classList.remove('hidden');
                row.querySelector('.ann-placeholder')?.classList.add('hidden');
                revealed++;
                const prog = document.getElementById('compare-progress');
                if (prog) prog.textContent = `${revealed}/${annotations.length} differences found`;
                if (revealed === annotations.length) {
                    if (prog) prog.innerHTML = `\u2713 All ${annotations.length} differences found!`;
                }
            });
        });
    }
}

/* ============================================
   RENDER: PRACTICE STEP
   ============================================ */
function initPractice() {
    originalGoCode = lessonData.goCode || 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello")\n}';

    // CodinGame-style: add brief guiding comments before the code
    const practiceHeader = `// Practice: ${lessonData.title}\n// Run this code to see how it works, then try changing values.\n\n`;
    const code = practiceHeader + originalGoCode;

    const desc = document.getElementById('practice-description');
    if (desc) desc.textContent = `Understand how ${lessonData.title} works in Go by running and experimenting with the code below.`;

    // Restore saved code or use default
    const savedPractice = loadEditorCode('practice');
    practiceEditor = new CodeEditor('practice-editor', { initialValue: savedPractice || code });

    // Auto-save on change
    if (practiceEditor) practiceEditor.onChange(() => saveEditorCode('practice', practiceEditor.getValue()));

    // Run button
    document.getElementById('btn-practice-run')?.addEventListener('click', runPractice);
    // Format button
    document.getElementById('btn-practice-fmt')?.addEventListener('click', () => {
        if (practiceEditor) practiceEditor.setValue(formatGoCode(practiceEditor.getValue()));
        logToConsole('practice-console-out', 'Formatted.', 'info');
    });
    // Reset button
    document.getElementById('btn-practice-reset')?.addEventListener('click', () => {
        if (practiceEditor) practiceEditor.setValue(code);
        logToConsole('practice-console-out', 'Reset to original code.', 'info');
    });
    // Solution button
    document.getElementById('btn-practice-solution')?.addEventListener('click', () => {
        if (practiceEditor) practiceEditor.setValue(originalGoCode);
        logToConsole('practice-console-out', 'Solution loaded.', 'info');
    });

    // Add lesson-specific micro-task to checklist
    const checklist = document.getElementById('practice-checklist');
    if (checklist && lessonData.title) {
        const extra = document.createElement('label');
        extra.className = 'check-item';
        extra.innerHTML = `<input type="checkbox" class="pcheck" data-check="experiment"> Try a variation of ${escapeHtml(lessonData.title)}`;
        checklist.appendChild(extra);
    }

    // Checklist
    document.querySelectorAll('.pcheck').forEach(cb => {
        cb.addEventListener('change', () => {
            const label = cb.closest('.check-item');
            if (label) label.classList.toggle('done', cb.checked);
            checkPracticeComplete();
        });
    });
}

async function runPractice() {
    if (!canRun()) { logToConsole('practice-console-out', 'Please wait 1s between runs.', 'warning'); return; }
    startGopherNudge('practice'); // reset idle nudge
    const code = practiceEditor ? practiceEditor.getValue() : '';
    logToConsole('practice-console-out', 'Running...', 'info');

    const btn = document.getElementById('btn-practice-run');
    if (btn) btn.disabled = true;

    const result = await runner.run(code);

    if (btn) btn.disabled = false;

    if (result.success) {
        logToConsole('practice-console-out', result.output || '(no output)', 'success');
    } else {
        logToConsole('practice-console-out', result.error || 'Error', 'error');
        gopherSay('compile_error');
        gopherThink();
    }
    if (result.error && result.success) {
        logToConsole('practice-console-out', result.error, 'warning');
    }

    practiceRunCount++;
    // Auto-check "Run it"
    const runCb = document.querySelector('.pcheck[data-check="run"]');
    if (runCb && !runCb.checked) { runCb.checked = true; runCb.dispatchEvent(new Event('change')); }
    // Auto-check "Read the code" on first run
    if (practiceRunCount === 1) {
        const readCb = document.querySelector('.pcheck[data-check="read"]');
        if (readCb && !readCb.checked) { readCb.checked = true; readCb.dispatchEvent(new Event('change')); }
    }
    // If code was modified, auto-check "Modify & re-run"
    if (practiceRunCount >= 2) {
        const modCb = document.querySelector('.pcheck[data-check="modify"]');
        if (modCb && !modCb.checked) { modCb.checked = true; modCb.dispatchEvent(new Event('change')); }
    }

    checkPracticeComplete();
}

function checkPracticeComplete() {
    const checked = document.querySelectorAll('.pcheck:checked').length;
    if ((practiceRunCount >= 1 && checked >= 3) || practiceRunCount >= 2) {
        gopherSay('practice_done');
        gopherCelebrate();
        completeStep('practice');
    }
}

/* ============================================
   RENDER: CHALLENGE STEP
   ============================================ */
function initChallenge() {
    // Type badge
    const typeTag = document.getElementById('challenge-type-tag');
    const briefType = document.getElementById('brief-type');
    const secBadge = document.getElementById('sec-challenge-badge');
    const itemLabel = document.getElementById('challenge-item-label');
    const type = challenge.type || 'build';
    const typeLabels = { fix_bug: 'FIX BUG', rewrite: 'REWRITE', build: 'BUILD', fill_blank: 'FILL IN' };
    const typeIcons = { fix_bug: '\uD83D\uDC1B', rewrite: '\uD83D\uDD04', build: '\uD83C\uDFD7\uFE0F', fill_blank: '\u270D\uFE0F' };
    const label = typeLabels[type] || 'BUILD';

    if (typeTag) { typeTag.textContent = label; typeTag.className = 'step-type-tag ' + type; }
    if (briefType) briefType.textContent = (typeIcons[type] || '') + ' ' + label;
    if (secBadge) { secBadge.textContent = label; secBadge.className = 'sec-badge ' + type; }
    if (itemLabel) itemLabel.textContent = label.toLowerCase() + ' task';

    // Rewards
    const xpEl = document.getElementById('challenge-xp');
    const coinsEl = document.getElementById('challenge-coins');
    if (xpEl) xpEl.textContent = '+' + (challenge.bonusXP || 0) + ' XP';
    if (coinsEl) coinsEl.textContent = '+' + (challenge.bonusCoins || 0) + ' Coins';

    // Prompt + expected as one-line preview
    const promptLineEl = document.getElementById('challenge-prompt-line');
    if (promptLineEl) {
        const promptFull = challenge.prompt || 'Complete the challenge.';
        const promptText = promptFull.split('\n\n')[0].split('\n')[0];
        const expectedRaw = (challenge.expectedOutput || '').trim();
        const preview = expectedRaw ? expectedRaw.replace(/\n/g, ', ') : '';
        promptLineEl.innerHTML = `<span class="to-icon">\u25CB</span><span class="to-text">${escapeHtml(promptText)}${preview ? ' \u2014 <span class="to-expected">Expected: ' + escapeHtml(preview) + '</span>' : ''}</span>`;
    }

    // Editor — restore saved code or use starter
    const savedChallenge = loadEditorCode('challenge');
    challengeEditor = new CodeEditor('challenge-editor', { initialValue: savedChallenge || challenge.starterCode || 'package main\n\nfunc main() {\n\t\n}' });
    if (challengeEditor) challengeEditor.onChange(() => saveEditorCode('challenge', challengeEditor.getValue()));

    // Submit
    document.getElementById('btn-challenge-submit')?.addEventListener('click', submitChallenge);
    // Format
    document.getElementById('btn-challenge-fmt')?.addEventListener('click', () => {
        if (challengeEditor) challengeEditor.setValue(formatGoCode(challengeEditor.getValue()));
        logToConsole('challenge-console-out', 'Formatted.', 'info');
    });
    // Hint
    document.getElementById('btn-challenge-hint')?.addEventListener('click', showNextHint);
    // Show Solution (XP penalty)
    document.getElementById('btn-challenge-solution')?.addEventListener('click', () => {
        if (!challenge.solution) { gopherSay('no_solution'); return; }
        const confirmed = confirm('Show the solution? You will lose 50% of challenge XP.');
        if (!confirmed) return;
        if (challengeEditor) challengeEditor.setValue(challenge.solution);
        // Mark penalty
        challengeEditor._solutionRevealed = true;
        logToConsole('challenge-console-out', 'Solution loaded. XP reward halved.', 'warning');
        gopherSay('solution_revealed');
    });
    // Reset
    document.getElementById('btn-challenge-reset')?.addEventListener('click', () => {
        if (challengeEditor) challengeEditor.setValue(challenge.starterCode || '');
        document.getElementById('challenge-result').innerHTML = '';
        document.getElementById('challenge-result').className = 'challenge-result';
        logToConsole('challenge-console-out', 'Reset.', 'info');
    });
}

async function submitChallenge() {
    if (!canRun()) { logToConsole('challenge-console-out', 'Please wait 1s between submissions.', 'warning'); return; }
    startGopherNudge('challenge'); // reset idle nudge
    const code = challengeEditor ? challengeEditor.getValue() : '';
    logToConsole('challenge-console-out', 'Submitting...', 'info');

    const btn = document.getElementById('btn-challenge-submit');
    if (btn) btn.disabled = true;

    const result = await runner.run(code);

    if (btn) btn.disabled = false;

    const resultEl = document.getElementById('challenge-result');
    const output = result.output || '';
    const expected = challenge.expectedOutput || '';
    const passed = result.success && normalizeOutput(output) === normalizeOutput(expected);

    if (passed) {
        // Stop timer and show time
        if (challengeTimerInterval) clearInterval(challengeTimerInterval);
        const elapsed = challengeStartTime ? Math.floor((Date.now() - challengeStartTime) / 1000) : 0;
        const timeStr = elapsed > 0 ? ` (${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')})` : '';
        // Save best time
        if (elapsed > 0) {
            const bestKey = STORAGE_PREFIX + 'best_time';
            const prev = parseInt(localStorage.getItem(bestKey)) || Infinity;
            if (elapsed < prev) localStorage.setItem(bestKey, elapsed.toString());
        }
        if (resultEl) {
            resultEl.className = 'challenge-result pass';
            resultEl.innerHTML = `\u2713 CORRECT! Output matches expected.${timeStr ? ' <span class="time-badge">\u23F1' + timeStr + '</span>' : ''}`;
            setTimeout(() => {
                resultEl.style.transition = 'opacity 0.4s';
                resultEl.style.opacity = '0';
                setTimeout(() => { resultEl.innerHTML = ''; resultEl.className = 'challenge-result'; resultEl.style.opacity = ''; resultEl.style.transition = ''; }, 400);
            }, 4000);
        }
        logToConsole('challenge-console-out', output.trim() || '(no output)', 'success');
        gopherSay('challenge_pass');
        gopherCelebrate();
        completeStep('challenge');
    } else if (result.error && !result.success) {
        const translated = translateGoError(result.error);
        if (resultEl) {
            resultEl.className = 'challenge-result fail';
            resultEl.innerHTML = `\u2717 Error: ${escapeHtml(result.error)}${translated !== result.error ? '<div class="error-translation">\uD83D\uDCA1 ' + escapeHtml(translated) + '</div>' : ''}`;
            setTimeout(() => {
                resultEl.style.transition = 'opacity 0.4s';
                resultEl.style.opacity = '0';
                setTimeout(() => { resultEl.innerHTML = ''; resultEl.className = 'challenge-result'; resultEl.style.opacity = ''; resultEl.style.transition = ''; }, 400);
            }, 8000);
        }
        logToConsole('challenge-console-out', result.error, 'error');
        gopherSay('compile_error');
        gopherThink();
    } else {
        if (resultEl) {
            resultEl.className = 'challenge-result fail';
            const diff = charDiff(expected.trim(), output.trim());
            resultEl.innerHTML = `<div>\u2717 Wrong output.</div>
                <div class="diff-row">
                    <div class="diff-col"><div class="diff-label">EXPECTED:</div><pre class="diff-pre diff-expected">${diff.expHtml}</pre></div>
                    <div class="diff-col"><div class="diff-label">YOUR OUTPUT:</div><pre class="diff-pre diff-got">${diff.actHtml}</pre></div>
                </div>`;
            setTimeout(() => {
                resultEl.style.transition = 'opacity 0.4s';
                resultEl.style.opacity = '0';
                setTimeout(() => { resultEl.innerHTML = ''; resultEl.className = 'challenge-result'; resultEl.style.opacity = ''; resultEl.style.transition = ''; }, 400);
            }, 8000);
        }
        logToConsole('challenge-console-out', output || '(no output)', 'warning');
        gopherSay('wrong_output');
        gopherThink();
    }
}

function showNextHint() {
    const hints = challenge.hints || [];
    if (challengeHintIndex >= hints.length) {
        gopherSay('no_more_hints');
        return;
    }
    // Cost: 2 coins per hint
    const HINT_COST = 2;
    const gs = gameState.getState();
    if ((gs.totalCoins || 0) < HINT_COST) {
        gopherSay('not_enough_coins');
        const hintsEl = document.getElementById('challenge-hints');
        if (hintsEl) {
            const card = document.createElement('div');
            card.className = 'hint-card hint-locked';
            card.textContent = `Not enough coins! Need ${HINT_COST} coins for a hint.`;
            hintsEl.appendChild(card);
            setTimeout(() => { card.style.transition = 'opacity 0.4s'; card.style.opacity = '0'; setTimeout(() => card.remove(), 400); }, 4000);
        }
        return;
    }
    // Deduct coins
    gameState.addCoins(-HINT_COST);
    updateHUD();

    const hintsEl = document.getElementById('challenge-hints');
    if (!hintsEl) return;
    const card = document.createElement('div');
    card.className = 'hint-card';
    card.innerHTML = `<span class="hint-cost">-${HINT_COST} coins</span> Hint ${challengeHintIndex + 1}/${hints.length}: ${escapeHtml(hints[challengeHintIndex])}`;
    hintsEl.appendChild(card);
    challengeHintIndex++;
    gopherSay('hint_used');

    // Update hint button text
    const hintBtn = document.getElementById('btn-challenge-hint');
    if (hintBtn) {
        if (challengeHintIndex >= hints.length) {
            hintBtn.textContent = 'No more hints';
            hintBtn.disabled = true;
        } else {
            hintBtn.innerHTML = `\uD83D\uDCA1 HINT (${HINT_COST} coins)`;
        }
    }

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
        card.style.transition = 'opacity 0.4s';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 400);
    }, 8000);
}

/* ============================================
   RENDER: TEST STEP — Sequential (one test at a time)
   ============================================ */

/** Generate CodinGame-style code skeleton for a test case */
function generateTestCode(tc, index, total) {
    const expected = (tc.expectedOutput || '').trim();
    const lines = [];

    // Header comment with test info
    lines.push(`// Test ${index + 1} of ${total}: ${lessonData.title}`);
    lines.push('//');

    // Wrap test case name into comment lines (~72 char width)
    const nameWords = tc.name.split(' ');
    let currentLine = '//';
    for (const word of nameWords) {
        if (currentLine.length + 1 + word.length > 74 && currentLine !== '//') {
            lines.push(currentLine);
            currentLine = '// ' + word;
        } else {
            currentLine += (currentLine === '//' ? ' ' : ' ') + word;
        }
    }
    if (currentLine !== '//') lines.push(currentLine);

    // Expected output
    if (expected) {
        lines.push('//');
        if (expected.includes('\n')) {
            lines.push('// Expected output:');
            expected.split('\n').forEach(l => lines.push('//   ' + l));
        } else {
            lines.push('// Expected output: ' + expected);
        }
    } else {
        lines.push('//');
        lines.push('// Expected: (empty stdout)');
    }

    lines.push('');

    // Build code skeleton
    if (tc.wrapperCode) {
        // User writes a function — show the wrapper's main so they know what's tested
        lines.push('package main');
        lines.push('');
        lines.push('import "fmt"');
        lines.push('');
        lines.push('// Write your function here');
        lines.push('');
        lines.push(tc.wrapperCode);
    } else {
        lines.push('package main');
        lines.push('');
        lines.push('import "fmt"');
        lines.push('');
        lines.push('func main() {');
        lines.push('\t// Write your code here');
        lines.push('}');
    }

    return lines.join('\n');
}

/** Render test objectives list with active/dimmed/pass states */
function renderTestObjectives() {
    const objEl = document.getElementById('test-objectives');
    if (!objEl || testCases.length === 0) return;

    objEl.innerHTML = testCases.map((tc, i) => {
        const expectedRaw = (tc.expectedOutput || '').trim();
        const preview = expectedRaw ? expectedRaw.replace(/\n/g, ', ') : '(empty)';
        const cls = i < currentTestIndex ? 'pass' : i === currentTestIndex ? 'active' : 'dimmed';
        const icon = i < currentTestIndex ? '\u2713' : '\u25CB';
        return `<div class="test-obj ${cls}" id="test-obj-${i}">
            <span class="to-icon">${icon}</span>
            <span class="to-text">${escapeHtml(tc.name)}${preview ? ' \u2014 <span class="to-expected">Expected: ' + escapeHtml(preview) + '</span>' : ''}</span>
        </div>`;
    }).join('');
}

/** Load the editor with CodinGame-style code for the current test case */
function loadTestEditorForCurrentCase() {
    if (currentTestIndex >= testCases.length) return;
    const tc = testCases[currentTestIndex];

    // Check for saved code for this specific test index
    const savedCode = loadEditorCode('test-' + currentTestIndex);
    if (savedCode && testEditor) {
        testEditor.setValue(savedCode);
        return;
    }

    // For wrapperCode tests, carry forward the user's previous code (they wrote a function)
    if (tc.wrapperCode && currentTestIndex > 0 && testEditor) {
        // Keep existing code — the wrapperCode will replace main() during test run
        return;
    }

    // Generate fresh CodinGame-style code
    const code = generateTestCode(tc, currentTestIndex, testCases.length);
    if (testEditor) {
        testEditor.setValue(code);
    }
}

function initTest() {
    // Restore saved test progress
    try {
        const savedIdx = localStorage.getItem(STORAGE_PREFIX + 'test_index');
        if (savedIdx !== null) currentTestIndex = Math.min(parseInt(savedIdx) || 0, testCases.length - 1);
    } catch (e) { /* ignore */ }

    // Render objectives with active/dimmed states
    renderTestObjectives();

    // Generate CodinGame-style code for the current test case
    const initialCode = generateTestCode(
        testCases[currentTestIndex] || { name: 'Write your solution', expectedOutput: '' },
        currentTestIndex, testCases.length
    );

    // Pre-fill: saved code > challenge solution carry-over > generated code
    const savedTest = loadEditorCode('test-' + currentTestIndex);
    const savedState = progress.getLessonState(lessonData.slug);
    let testInitialCode;
    if (savedTest) {
        testInitialCode = savedTest;
    } else if (currentTestIndex === 0 && savedState.challengeDone && challengeEditor) {
        testInitialCode = challengeEditor.getValue();
    } else {
        testInitialCode = initialCode;
    }

    testEditor = new CodeEditor('test-editor', { initialValue: testInitialCode });
    if (testEditor) testEditor.onChange(() => saveEditorCode('test-' + currentTestIndex, testEditor.getValue()));

    // Run button now runs only the current test
    document.getElementById('btn-run-tests')?.addEventListener('click', runCurrentTest);
}

function lockForTestMode() {
    testModeLocked = true;
    document.querySelectorAll('.sidebar-section').forEach(sec => {
        if (sec.id !== 'sec-test') sec.classList.add('test-locked');
    });
}

/** Run only the current test case (sequential mode) */
async function runCurrentTest() {
    if (!testModeLocked) lockForTestMode();
    startGopherNudge('test'); // reset idle nudge

    const userCode = testEditor ? testEditor.getValue() : '';
    const resultsEl = document.getElementById('test-results');
    if (resultsEl) resultsEl.innerHTML = '';

    const tc = testCases[currentTestIndex];
    if (!tc) {
        // No test cases — just run the code
        const result = await runner.run(userCode);
        if (result.success) {
            logToConsole('test-console-out', result.output || '(no output)', 'success');
            gopherSay('all_tests_pass');
            gopherCelebrate();
            completeStep('test');
        } else {
            logToConsole('test-console-out', result.error || 'Error', 'error');
            gopherSay('test_fail');
            gopherThink();
        }
        return;
    }

    logToConsole('test-console-out', `Running test ${currentTestIndex + 1} of ${testCases.length}...`, 'info');

    const btn = document.getElementById('btn-run-tests');
    if (btn) btn.disabled = true;

    // Build code to run (apply wrapperCode if present)
    let codeToRun = userCode;
    if (tc.wrapperCode) {
        const mainIdx = userCode.search(/\nfunc\s+main\s*\(/);
        const preamble = mainIdx >= 0 ? userCode.substring(0, mainIdx).trim() : userCode.trim();
        codeToRun = preamble + '\n\n' + tc.wrapperCode + '\n';
    }

    const result = await runner.run(codeToRun);
    const output = result.output || '';
    const expected = tc.expectedOutput || '';
    const passed = result.success && normalizeOutput(output) === normalizeOutput(expected);

    if (btn) btn.disabled = false;

    // Show result in results panel
    if (resultsEl) {
        let html = `<div class="test-case-row ${passed ? 'test-case-pass' : 'test-case-fail'}">${passed ? '\u2713' : '\u2717'} ${escapeHtml(tc.name)}</div>`;
        if (!passed) {
            if (result.error && !output) {
                html += `<pre class="diff-error">${escapeHtml(result.error)}</pre>`;
            } else {
                const tdiff = charDiff(expected.trim(), output.trim());
                html += `<div class="diff-row">
                    <div class="diff-col"><div class="diff-label">EXPECTED:</div><pre class="diff-pre diff-expected">${tdiff.expHtml}</pre></div>
                    <div class="diff-col"><div class="diff-label">YOUR OUTPUT:</div><pre class="diff-pre diff-got">${tdiff.actHtml || '(empty)'}</pre></div>
                </div>`;
                if (result.error) {
                    html += `<pre class="diff-error">${escapeHtml(result.error)}</pre>`;
                }
            }
        }
        resultsEl.innerHTML = html;

        // Auto-fade diff after 8s
        if (!passed) {
            setTimeout(() => {
                resultsEl.querySelectorAll('.diff-row, .diff-error').forEach(el => {
                    el.style.transition = 'opacity 0.4s';
                    el.style.opacity = '0';
                    setTimeout(() => el.remove(), 400);
                });
            }, 8000);
        }
    }

    logToConsole('test-console-out', `Test ${currentTestIndex + 1}: ${passed ? 'PASS' : 'FAIL'}`, passed ? 'success' : 'error');

    if (passed) {
        // Mark this test as passed and advance
        const objRow = document.getElementById('test-obj-' + currentTestIndex);
        if (objRow) {
            const icon = objRow.querySelector('.to-icon');
            if (icon) icon.textContent = '\u2713';
            objRow.classList.remove('active');
            objRow.classList.add('pass');
        }

        currentTestIndex++;
        try { localStorage.setItem(STORAGE_PREFIX + 'test_index', currentTestIndex.toString()); } catch (e) { /* */ }

        if (currentTestIndex >= testCases.length) {
            // All tests passed!
            gopherSay('all_tests_pass');
            gopherCelebrate();
            completeStep('test');

            // Save final results
            try {
                const testResults = testCases.map((_, i) => ({ name: testCases[i].name, passed: true }));
                localStorage.setItem(STORAGE_PREFIX + 'test_results', JSON.stringify({ allPassed: true, results: testResults, timestamp: Date.now() }));
            } catch (e) { /* */ }
        } else {
            // Advance to next test
            gopherSay('test_pass_next');
            gopherCelebrate();
            renderTestObjectives();

            // Update editor save handler for new test index
            if (testEditor) testEditor.onChange(() => saveEditorCode('test-' + currentTestIndex, testEditor.getValue()));

            // Load next test into editor
            loadTestEditorForCurrentCase();
        }
    } else {
        gopherSay('test_fail');
        gopherThink();
    }
}

/* ============================================
   LESSON COMPLETE
   ============================================ */
let bonusRoundShown = false;

function checkLessonComplete() {
    if (!progress.isLessonComplete(lessonData.slug)) return;

    // Unlock next lesson button
    const nextBtn = document.getElementById('btn-next-lesson');
    if (nextBtn) {
        nextBtn.classList.remove('locked');
        nextBtn.classList.add('unlocked');
        nextBtn.textContent = 'Next \u25B6';
    }

    // Show totals
    const state = progress.getLessonState(lessonData.slug);
    const xpEl = document.getElementById('total-xp-earned');
    const coinsEl = document.getElementById('total-coins-earned');
    if (xpEl) xpEl.textContent = state.xpEarned || 0;
    if (coinsEl) coinsEl.textContent = state.coinsEarned || 0;

    // Item drop
    const drop = inventory.rollDrop('lesson_complete');
    inventory.renderBar('inv-grid');

    gopherSay('lesson_complete');
    gopherCelebrate();

    // Show bonus round first (only once per session)
    if (!bonusRoundShown) {
        bonusRoundShown = true;
        setTimeout(() => showBonusRound(), 800);
    } else {
        setTimeout(() => {
            const overlay = document.getElementById('lesson-complete');
            if (overlay) overlay.classList.remove('hidden');
        }, 800);
    }
}

function showBonusRound() {
    const overlay = document.getElementById('bonus-round');
    const inner = document.getElementById('bonus-round-inner');
    if (!overlay || !inner) { showLessonComplete(); return; }

    overlay.classList.remove('hidden');
    renderBonusRoundPicker(inner, lessonData,
        (gameType) => {
            // Start game
            inner.innerHTML = '<div class="mg-game-frame" id="mg-game-frame"></div>';
            const frame = document.getElementById('mg-game-frame');
            const engine = new MiniGameEngine(frame, lessonData, (result) => {
                // Game finished — award bonus XP
                if (result.score > 0) {
                    gamification.awardXP(result.score);
                    gamification.showXPPopup(result.score);
                }
                // Move to lesson complete
                overlay.classList.add('hidden');
                showLessonComplete();
            });
            engine.start(gameType);
        },
        () => {
            // Skip
            overlay.classList.add('hidden');
            showLessonComplete();
        }
    );
}

function showLessonComplete() {
    const overlay = document.getElementById('lesson-complete');
    if (overlay) overlay.classList.remove('hidden');
}

/* ============================================
   CONSOLE LOGGING
   ============================================ */
function logToConsole(containerId, msg, type = '') {
    const el = document.getElementById(containerId);
    if (!el) return;
    const line = document.createElement('div');
    line.className = 'cline ' + type;
    line.innerHTML = `<span class="cprompt">$</span> ${escapeHtml(msg)}`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
}

/* ============================================
   QUEST CHECKLIST
   ============================================ */
function markQuestDone(questKey) {
    const map = { read: 'quest-read', compare: 'quest-compare', practice: 'quest-practice', challenge: 'quest-challenge', test: 'quest-test' };
    const row = document.getElementById(map[questKey]);
    if (row) row.classList.add('done');
    const check = document.getElementById('qc-' + questKey);
    if (check) check.textContent = '\u2713';
}

/* ============================================
   SIDEBAR SECTION META
   ============================================ */
function updateSectionMeta() {
    const saved = progress.getLessonState(lessonData.slug);

    // Tutorial: X/2
    const tutDone = (saved.learnDone ? 1 : 0) + (saved.compareDone ? 1 : 0);
    const tutMeta = document.getElementById('sec-tutorial-meta');
    if (tutMeta) tutMeta.textContent = tutDone + '/2' + (tutDone === 2 ? ' \u2713' : '');
    if (tutDone === 2) {
        const sec = document.getElementById('sec-tutorial');
        if (sec) { sec.classList.add('completed'); sec.classList.remove('active'); }
    }

    // Practice
    if (saved.practiceDone) {
        const sec = document.getElementById('sec-practice');
        if (sec) sec.classList.add('completed');
    }
    // Challenge
    if (saved.challengeDone) {
        const sec = document.getElementById('sec-challenge');
        if (sec) sec.classList.add('completed');
    }
    // Test
    if (saved.testDone) {
        const sec = document.getElementById('sec-test');
        if (sec) sec.classList.add('completed');
    }
}

/* ============================================
   RENDER: MISSION STEP
   ============================================ */
function renderMission() {
    const body = document.getElementById('mission-body');
    if (!body) return;
    let html = '';

    html += `<h2 class="mission-title">${escapeHtml(lessonData.title)}</h2>`;
    html += `<div class="mission-rewards">
        <span class="mission-reward-badge xp">&#x2728; +${lessonData.xpReward} XP</span>
        <span class="mission-reward-badge coins">&#x1FA99; +${lessonData.coinReward} Coins</span>
    </div>`;

    // Brief explanation excerpt
    if (lessonData.explanation) {
        const brief = lessonData.explanation.split('\n').slice(0, 3).join('\n');
        html += `<div class="mission-brief">${renderMarkdown(brief)}</div>`;
    }

    // Teacher tips
    const tips = lessonData.teacherTips || [];
    if (tips.length > 0) {
        html += '<div class="mission-tips">';
        tips.forEach(tip => {
            const typeClass = tip.type || 'remember';
            const icons = { gotcha: '\u26A0\uFE0F', remember: '\uD83D\uDE80', protip: '\uD83D\uDCA1', warning: '\u26A0\uFE0F' };
            html += `<div class="teacher-tip ${typeClass}">
                <div class="tip-title">${icons[typeClass] || ''} ${escapeHtml(tip.title)}</div>
                <div class="tip-text">${escapeHtml(tip.content)}</div>
            </div>`;
        });
        html += '</div>';
    }

    body.innerHTML = html;
}

/* ============================================
   CHATHEAD TIPS (coding steps — silent text only)
   ============================================ */
const CHATHEAD_TIPS = {
    practice_start: "Run the code first! Then try changing values.",
    practice_ran: "Great! Now modify something and run again.",
    practice_done: "Nice work! Click Next to try the challenge.",
    challenge_start: "Read the prompt carefully. Take your time.",
    challenge_hint: "Need a hint? Click the hint button.",
    challenge_fail: "Check the expected output. You're close!",
    challenge_pass: "You got it! Final test next.",
    test_start: "Write from memory. You know this!",
    test_fail: "Not quite. Check the expected output!",
    test_pass: "All passed! Mission complete!",
    test_pass_next: "Nice! Next test loaded. Keep going!",
    error: "Compile error — read the message carefully."
};

function setChatheadTip(text) {
    const el = document.getElementById('chathead-text');
    if (el) el.textContent = text;
}

function showChatheadBubble() {
    const bubble = document.getElementById('chathead-bubble');
    if (bubble) bubble.classList.add('visible');
}

function hideChatheadBubble() {
    const bubble = document.getElementById('chathead-bubble');
    if (bubble) bubble.classList.remove('visible');
}

function initChathead() {
    const face = document.querySelector('.chathead-face');
    if (face) {
        face.addEventListener('click', () => {
            const bubble = document.getElementById('chathead-bubble');
            if (bubble) bubble.classList.toggle('visible');
        });
    }
    // Dismiss on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.wizard-chathead')) {
            hideChatheadBubble();
        }
    });
}

/* ============================================
   WIZARD VISIBILITY + CHATHEAD UPDATES
   ============================================ */
function updateWizardVisibility(stepName) {
    const chathead = document.getElementById('wizard-chathead');
    const modeToggle = document.getElementById('mode-toggle');
    const isCodingStep = ['practice', 'challenge', 'test'].includes(stepName);
    const isTutorialStep = ['mission', 'learn', 'compare'].includes(stepName);

    // Show chathead only during coding steps
    if (chathead) chathead.classList.toggle('visible', isCodingStep);
    // Show mode toggle only during tutorial steps
    if (modeToggle) modeToggle.style.display = isTutorialStep ? 'flex' : 'none';
    // Stop speaking when entering coding mode
    if (isCodingStep) gopherStopSpeaking();
}

/* ============================================
   WEB SPEECH API — Speaking Gopher
   ============================================ */
let selectedVoice = null;

function initVoice() {
    const synth = window.speechSynthesis;
    if (!synth) return;

    function pickVoice() {
        const voices = synth.getVoices();
        if (!voices.length) return;

        const preferred = [
            'Google UK English Female',
            'Google UK English Male',
            'Google US English',
            'Microsoft Zira',
            'Microsoft David',
            'Samantha',
            'Karen',
            'Daniel',
            'Moira',
            'Fiona',
        ];

        for (const name of preferred) {
            const match = voices.find(v => v.name.includes(name));
            if (match) { selectedVoice = match; return; }
        }

        const english = voices.filter(v => v.lang.startsWith('en'));
        if (english.length) selectedVoice = english[0];
        else selectedVoice = voices[0];
    }

    if (synth.getVoices().length) pickVoice();
    synth.onvoiceschanged = pickVoice;
}

function gopherSpeak(text, onEnd) {
    const synth = window.speechSynthesis;
    if (!synth) { if (onEnd) onEnd(); return; }
    synth.cancel();

    // Clean text for speech — strip markdown, code blocks, special chars
    const cleanText = text
        .replace(/```[\s\S]*?```/g, '... see the code example ...')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/##\s*/g, '')
        .replace(/\n/g, '. ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleanText) { if (onEnd) onEnd(); return; }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    const mouth = document.getElementById('gt-mouth');

    utterance.onstart = () => {
        if (mouth) mouth.classList.add('speaking');
    };
    utterance.onend = () => {
        if (mouth) mouth.classList.remove('speaking');
        if (onEnd) onEnd();
    };
    utterance.onerror = () => {
        if (mouth) mouth.classList.remove('speaking');
        if (onEnd) onEnd();
    };

    synth.speak(utterance);
}

function gopherStopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const mouth = document.getElementById('gt-mouth');
    if (mouth) mouth.classList.remove('speaking');
}

function gopherPauseSpeech() {
    if (window.speechSynthesis) window.speechSynthesis.pause();
    const mouth = document.getElementById('gt-mouth');
    if (mouth) mouth.classList.remove('speaking');
}

function gopherResumeSpeech() {
    if (window.speechSynthesis) window.speechSynthesis.resume();
    const mouth = document.getElementById('gt-mouth');
    if (mouth) mouth.classList.add('speaking');
}

/* ============================================
   MODE TOGGLE
   ============================================ */
function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-read-mode').classList.toggle('active', mode === 'read');
    document.getElementById('btn-tutor-mode').classList.toggle('active', mode === 'tutor');
    localStorage.setItem('goquest_mode', mode);

    // Stop speech when switching modes
    gopherStopSpeaking();

    // If switching to read mode, restore all tutorial steps to read-mode content
    if (mode === 'read') {
        ['mission', 'learn', 'compare'].forEach(s => restoreTutorialStepContent(s));
    }

    // Re-render current step in new mode
    goToStep(currentStep);
}

function restoreTutorialStepContent(stepName) {
    const el = document.getElementById('step-' + stepName);
    if (!el) return;
    // Restore original DOM structure first
    if (originalStepHTML[stepName]) {
        el.innerHTML = originalStepHTML[stepName];
    }
    // Re-render with current language (originalStepHTML may be stale if language changed in tutor mode)
    if (stepName === 'mission') renderMission();
    if (stepName === 'learn') renderLearn();
    if (stepName === 'compare') renderCompare();
    // Update cache
    originalStepHTML[stepName] = el.innerHTML;
}

function initModeToggle() {
    document.getElementById('btn-read-mode')?.addEventListener('click', () => setMode('read'));
    document.getElementById('btn-tutor-mode')?.addEventListener('click', () => setMode('tutor'));

    document.getElementById('btn-read-mode').classList.toggle('active', currentMode === 'read');
    document.getElementById('btn-tutor-mode').classList.toggle('active', currentMode === 'tutor');
}

/* ============================================
   TUTOR MODE — SPEAKING SLIDE SYSTEM
   ============================================ */
function parseSlides(stepName) {
    const slides = [];

    if (stepName === 'mission') {
        slides.push({
            speech: `Welcome to the lesson on ${lessonData.title}! You'll earn ${lessonData.xpReward} XP and ${lessonData.coinReward} coins when you complete this.`,
            html: `<strong>${escapeHtml(lessonData.title)}</strong><br><br>&#x26A1; +${lessonData.xpReward} XP &nbsp; &#x25C8; +${lessonData.coinReward} Coins`,
            type: 'intro'
        });
        if (lessonData.teacherTips) {
            const icons = { gotcha: '&#x26A0;&#xFE0F;', remember: '&#x1F4CC;', protip: '&#x1F4A1;', warning: '&#x1F6A8;' };
            lessonData.teacherTips.forEach(tip => {
                slides.push({
                    speech: `${tip.title}. ${tip.content}`,
                    html: `${icons[tip.type] || '&#x1F4A1;'} <strong>${escapeHtml(tip.title)}</strong><br><br>${escapeHtml(tip.content)}`,
                    type: 'tip'
                });
            });
        }
    }

    if (stepName === 'learn') {
        const _tLangId = getSelectedLang();
        const _tLangInfo = getLangInfo(_tLangId);
        const _tSrcCodes = lessonData.sourceCodes || {};
        const _tSrcCode = _tSrcCodes[_tLangId] || lessonData.nodeCode;
        if (_tSrcCode) {
            slides.push({
                speech: `Let me show you how ${_tLangInfo.name} handles this.`,
                html: `<p>Here's how ${_tLangInfo.name} does it:</p><pre><code class="${_tLangInfo.prismClass}">${escapeHtml(_tSrcCode)}</code></pre>`,
                type: 'code'
            });
        }
        if (lessonData.explanation) {
            const sections = lessonData.explanation.split(/(?=^## )/m);
            sections.forEach(section => {
                const trimmed = section.trim();
                if (!trimmed) return;
                if (trimmed.length <= 400) {
                    slides.push({ speech: trimmed, html: '', type: 'explain', markdown: trimmed });
                } else {
                    const paragraphs = trimmed.split(/\n\n+/);
                    let cur = '';
                    paragraphs.forEach(para => {
                        if (cur.length + para.length > 400 && !para.startsWith('```')) {
                            if (cur.trim()) slides.push({ speech: cur.trim(), html: '', type: 'explain', markdown: cur.trim() });
                            cur = para;
                        } else {
                            cur += (cur ? '\n\n' : '') + para;
                        }
                    });
                    if (cur.trim()) slides.push({ speech: cur.trim(), html: '', type: 'explain', markdown: cur.trim() });
                }
            });
        }
    }

    if (stepName === 'compare') {
        const _cLangId = getSelectedLang();
        const _cLangInfo = getLangInfo(_cLangId);
        const _cSrcCodes = lessonData.sourceCodes || {};
        const _cSrcCode = _cSrcCodes[_cLangId] || lessonData.nodeCode;
        slides.push({
            speech: `Now let's compare the two versions side by side. Look at how different Go's syntax is from ${_cLangInfo.name}.`,
            html: '',
            type: 'compare',
            nodeCode: _cSrcCode,
            goCode: lessonData.goCode,
            prismClass: _cLangInfo.prismClass,
            langLabel: _cLangInfo.label
        });
        if (lessonData.annotations) {
            const _cLabel = _cLangId === 'javascript' ? 'JS' : _cLangInfo.label;
            lessonData.annotations.forEach(ann => {
                slides.push({
                    speech: `Look at ${_cLangInfo.name} line ${ann.lineSrc || ann.lineNode} compared to Go line ${ann.lineGo}. ${ann.text}`,
                    html: `<strong>${_cLabel} line ${ann.lineSrc || ann.lineNode} &#x2194; Go line ${ann.lineGo}</strong><br><br>${escapeHtml(ann.text)}`,
                    type: 'annotation'
                });
            });
        }
    }

    // Final "continue" slide
    const nextStep = { mission: 'learn', learn: 'compare', compare: 'practice' };
    const nextName = { mission: 'Tutorial', learn: 'Compare', compare: 'Practice' };
    slides.push({
        speech: "Great! You're ready to move on.",
        html: '',
        type: 'next',
        nextStepId: nextStep[stepName],
        nextStepName: nextName[stepName]
    });

    return slides;
}

function buildGopherTutorHTML() {
    return `<div class="gopher-tutor" id="gopher-tutor">
        <div class="gt-hat">
            <div class="gt-hat-cone"><div class="gt-hat-star">&#x2726;</div></div>
            <div class="gt-hat-brim"></div>
        </div>
        <div class="gt-face">
            <div class="gt-ears"><div class="gt-ear left"></div><div class="gt-ear right"></div></div>
            <div class="gt-eyes">
                <div class="gt-eye left"><div class="gt-pupil"></div></div>
                <div class="gt-eye right"><div class="gt-pupil"></div></div>
            </div>
            <div class="gt-nose"></div>
            <div class="gt-mouth" id="gt-mouth"></div>
            <div class="gt-teeth"><div class="gt-tooth"></div><div class="gt-tooth"></div></div>
        </div>
        <div class="gt-body"></div>
        <div class="gt-arm left"></div>
        <div class="gt-arm right">
            <div class="gt-wand">
                <div class="gt-wand-stick"></div>
                <div class="gt-wand-tip">&#x2726;</div>
                <div class="gt-sparkle s1">&#x2727;</div>
                <div class="gt-sparkle s2">&#x2726;</div>
                <div class="gt-sparkle s3">&#x2727;</div>
            </div>
        </div>
        <div class="gt-feet"><div class="gt-foot left"></div><div class="gt-foot right"></div></div>
    </div>`;
}

function renderTutorMode(stepName) {
    const el = document.getElementById('step-' + stepName);
    if (el && !originalStepHTML[stepName]) {
        originalStepHTML[stepName] = el.innerHTML;
    }

    currentSlides = parseSlides(stepName);
    currentSlideIndex = 0;
    renderSlide();
}

function renderSlide() {
    gopherStopSpeaking();
    const slide = currentSlides[currentSlideIndex];
    const main = document.getElementById('step-' + currentStep);
    if (!main) return;

    // --- Teacher-at-board layout: gopher on left, board on right ---
    let html = '<div class="tutor-view">';

    // Left: Teacher (gopher)
    html += '<div class="tutor-teacher">';
    html += buildGopherTutorHTML();
    html += '<div class="tutor-teacher-name">Prof. Gopher</div>';
    html += '</div>';

    // Right: Board (full-size content)
    html += '<div class="tutor-board">';
    html += '<div class="tutor-board-inner">';

    if (slide.type === 'code') {
        html += slide.html;
    } else if (slide.type === 'compare') {
        html += '<div class="tutor-compare-split">';
        html += `<div><div class="pane-label node-label">${slide.langLabel || 'SOURCE'}</div><pre><code class="${slide.prismClass || 'language-javascript'}">${escapeHtml(slide.nodeCode)}</code></pre></div>`;
        html += `<div><div class="pane-label go-label">&#x25C8; GO</div><pre><code class="language-go">${escapeHtml(slide.goCode)}</code></pre></div>`;
        html += '</div>';
    } else if (slide.type === 'next') {
        html += `<div class="tutor-next-slide">
            <div class="tutor-next-icon">&#x2728;</div>
            <p>You're ready to move on!</p>
            <button class="btn-step-next" id="tutor-go-next">NEXT: ${escapeHtml(slide.nextStepName)} &#x25B6;</button>
        </div>`;
    } else if (slide.type === 'explain' && slide.markdown) {
        html += renderMarkdown(slide.markdown);
    } else {
        html += `<div>${slide.html}</div>`;
    }

    html += '</div>'; // end board-inner

    // Speech caption below board (what gopher is saying — readable text)
    html += `<div class="tutor-caption" id="tutor-caption">
        <span class="tutor-caption-icon">&#x1F4AC;</span>
        <span class="tutor-caption-text">${escapeHtml(slide.speech)}</span>
    </div>`;

    html += '</div>'; // end board

    html += '</div>'; // end tutor-view

    // Controls bar (full width below)
    html += '<div class="tutor-controls">';
    html += currentSlideIndex > 0
        ? '<button class="tutor-ctrl-btn" id="tutor-back">&#x2190; Back</button>'
        : '<span></span>';
    html += '<button class="tutor-ctrl-btn" id="btn-tutor-pause">&#x23F8; Pause</button>';
    html += '<div class="tutor-dots">';
    currentSlides.forEach((_, i) => {
        const cls = i === currentSlideIndex ? 'active' : (i < currentSlideIndex ? 'done' : '');
        html += `<span class="tutor-dot ${cls}"></span>`;
    });
    html += `</div><span class="tutor-counter">${currentSlideIndex + 1}/${currentSlides.length}</span>`;
    html += currentSlideIndex < currentSlides.length - 1
        ? '<button class="tutor-ctrl-btn" id="tutor-next">Next &#x2192;</button>'
        : '<span></span>';
    html += '</div>';

    main.innerHTML = html;

    // Highlight code blocks
    main.querySelectorAll('pre code').forEach(c => { try { if (window.Prism) Prism.highlightElement(c); } catch(e) { /* */ } });

    // Bind buttons
    document.getElementById('tutor-back')?.addEventListener('click', () => {
        gopherStopSpeaking();
        if (currentSlideIndex > 0) { currentSlideIndex--; renderSlide(); }
    });
    document.getElementById('tutor-next')?.addEventListener('click', () => {
        gopherStopSpeaking();
        if (currentSlideIndex < currentSlides.length - 1) { currentSlideIndex++; renderSlide(); }
    });
    document.getElementById('btn-tutor-pause')?.addEventListener('click', toggleTutorPause);
    const goNextBtn = document.getElementById('tutor-go-next');
    if (goNextBtn && slide.nextStepId) {
        goNextBtn.addEventListener('click', () => { gopherStopSpeaking(); goToStep(slide.nextStepId); });
    }

    // Trigger sparkle + speak
    triggerGopherSparkle();
    gopherSpeak(slide.speech);
}

function toggleTutorPause() {
    const btn = document.getElementById('btn-tutor-pause');
    if (window.speechSynthesis.paused) {
        gopherResumeSpeech();
        if (btn) btn.innerHTML = '&#x23F8; Pause';
    } else if (window.speechSynthesis.speaking) {
        gopherPauseSpeech();
        if (btn) btn.innerHTML = '&#x25B6; Resume';
    }
}

function triggerGopherSparkle() {
    const gopher = document.getElementById('gopher-tutor');
    if (!gopher) return;
    gopher.classList.remove('sparkle-burst');
    void gopher.offsetWidth; // force reflow
    gopher.classList.add('sparkle-burst');
    setTimeout(() => gopher.classList.remove('sparkle-burst'), 1000);
}

/* ============================================
   CHATHEAD FEEDBACK (coding steps — shows tip in bubble)
   ============================================ */
function gopherSay(key) {
    const tipMap = {
        step_practice: CHATHEAD_TIPS.practice_start,
        step_challenge: CHATHEAD_TIPS.challenge_start,
        step_test: CHATHEAD_TIPS.test_start,
        compile_error: CHATHEAD_TIPS.error,
        wrong_output: CHATHEAD_TIPS.challenge_fail,
        challenge_pass: CHATHEAD_TIPS.challenge_pass,
        test_fail: CHATHEAD_TIPS.test_fail,
        test_pass_next: CHATHEAD_TIPS.test_pass_next,
        all_tests_pass: CHATHEAD_TIPS.test_pass,
        practice_done: CHATHEAD_TIPS.practice_done,
        hint_used: CHATHEAD_TIPS.challenge_hint,
        lesson_complete: CHATHEAD_TIPS.test_pass,
        no_more_hints: "No more hints available!",
        not_enough_coins: "You need more coins for hints!",
        solution_revealed: "Solution loaded. Try to understand it!",
        no_solution: "No solution available for this challenge.",
    };
    const tip = tipMap[key];
    if (!tip) return;

    setChatheadTip(tip);
    showChatheadBubble();

    const successKeys = ['challenge_pass', 'all_tests_pass', 'test_pass_next', 'lesson_complete', 'practice_done'];
    const errorKeys = ['compile_error', 'wrong_output', 'test_fail'];
    const hideDelay = successKeys.includes(key) ? 8000 : errorKeys.includes(key) ? 7000 : 5000;
    setTimeout(hideChatheadBubble, hideDelay);
}

function gopherCelebrate() { /* chathead — no animation */ }
function gopherThink() { /* chathead — no animation */ }
function resetGopherIdle() { if (gopherIdleTimer) clearTimeout(gopherIdleTimer); }
function startGopherNudge() { /* removed — no floating wizard */ }
function setWizardState() { /* removed — no floating wizard */ }
function setWizardTip() { /* removed — no floating wizard */ }

/* ============================================
   HUD
   ============================================ */
function updateHUD() {
    const state = progress.getState();
    const lvl = document.getElementById('mini-level');
    const xp = document.getElementById('mini-xp');
    const coins = document.getElementById('mini-coins');
    if (lvl) lvl.textContent = 'Lvl ' + state.level;
    if (xp) xp.textContent = state.totalXP;
    if (coins) coins.textContent = state.totalCoins || 0;
}

/* ============================================
   SIDEBAR CLICK HANDLERS
   ============================================ */
function toggleSidebarSection(sectionName) {
    const sec = document.getElementById('sec-' + sectionName);
    if (!sec || sec.classList.contains('locked') || sec.classList.contains('test-locked')) return;

    const wasActive = sec.classList.contains('active');

    // Collapse all sections first
    document.querySelectorAll('.sidebar-section').forEach(s => {
        s.classList.remove('active');
    });

    // If wasn't active, expand clicked section and navigate
    if (!wasActive) {
        sec.classList.add('active');
        const firstItem = sec.querySelector('.sidebar-item');
        if (firstItem) {
            const step = firstItem.dataset.step;
            if (step) goToStep(step);
        }
    }
}

function initSidebar() {
    // Section header clicks -> toggle collapse/expand
    document.querySelectorAll('.sidebar-section-hdr').forEach(hdr => {
        hdr.addEventListener('click', () => {
            const section = hdr.dataset.section;
            if (!section) return;
            toggleSidebarSection(section);
        });
    });

    // Item clicks -> navigate to step
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const step = item.dataset.step;
            if (!step) return;
            const section = STEP_TO_SECTION[step];
            const sec = document.getElementById('sec-' + section);
            if (!sec || sec.classList.contains('locked') || sec.classList.contains('test-locked')) return;
            goToStep(step);
        });
    });
}

/* ============================================
   CONSOLE CLEAR BUTTONS
   ============================================ */
function initConsoleClear() {
    document.querySelectorAll('.console-clear').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (target) {
                const el = document.getElementById(target);
                if (el) el.innerHTML = '<div class="cline info"><span class="cprompt">$</span> Cleared.</div>';
            }
        });
    });
}

/* ============================================
   INTRO OVERLAY
   ============================================ */
let introDismissed = false;
let pendingRestoreState = false;

function initIntro() {
    const overlay = document.getElementById('lesson-intro');
    if (!overlay) return;

    // Check if intro was already seen (lesson in progress)
    const saved = progress.getLessonState(lessonData.slug);
    if (saved.missionDone) {
        // Lesson already started — skip intro immediately
        overlay.classList.add('hidden');
        introDismissed = true;
        return;
    }

    const dismiss = () => {
        overlay.classList.add('closing');
        setTimeout(() => overlay.classList.add('hidden'), 400);
        introDismissed = true;
        // Now run deferred restoreState
        if (pendingRestoreState) {
            pendingRestoreState = false;
            restoreState();
        }
    };

    document.getElementById('btn-intro-ready')?.addEventListener('click', dismiss);
    document.getElementById('btn-intro-skip')?.addEventListener('click', dismiss);
}

/* ============================================
   NEXT STEP BUTTONS
   ============================================ */
function initNextButtons() {
    document.getElementById('btn-start-tutorial')?.addEventListener('click', () => goToStep('learn'));
    document.getElementById('btn-next-compare')?.addEventListener('click', () => goToStep('compare'));
    document.getElementById('btn-next-practice')?.addEventListener('click', () => goToStep('practice'));
    document.getElementById('btn-next-challenge')?.addEventListener('click', () => {
        if (!document.getElementById('btn-next-challenge')?.disabled) goToStep('challenge');
    });
    document.getElementById('btn-next-test')?.addEventListener('click', () => {
        if (!document.getElementById('btn-next-test')?.disabled) goToStep('test');
    });
}

/* ============================================
   STATE RESTORATION
   ============================================ */
function restoreState() {
    const saved = progress.getLessonState(lessonData.slug);

    if (saved.missionDone) {
        const ic = document.getElementById('ic-mission');
        if (ic) ic.textContent = '\u2713';
        document.querySelector('.sidebar-item[data-step="mission"]')?.classList.add('completed');
        const sec = document.getElementById('sec-mission');
        if (sec) sec.classList.add('completed');
    }

    if (saved.learnDone) {
        markQuestDone('read');
        const ic = document.getElementById('ic-learn');
        if (ic) ic.textContent = '\u2713';
        document.querySelector('.sidebar-item[data-step="learn"]')?.classList.add('completed');
    }

    if (saved.compareDone) {
        markQuestDone('compare');
        const ic = document.getElementById('ic-compare');
        if (ic) ic.textContent = '\u2713';
        document.querySelector('.sidebar-item[data-step="compare"]')?.classList.add('completed');
    }

    if (saved.learnDone && saved.compareDone) {
        unlockSection('practice');
    }

    if (saved.practiceDone) {
        markQuestDone('practice');
        const ic = document.getElementById('ic-practice');
        if (ic) ic.textContent = '\u2713';
        document.querySelector('.sidebar-item[data-step="practice"]')?.classList.add('completed');
        unlockSection('challenge');
        enableBtn('btn-next-challenge');
    }

    if (saved.challengeDone) {
        markQuestDone('challenge');
        const ic = document.getElementById('ic-challenge');
        if (ic) ic.textContent = '\u2713';
        document.querySelector('.sidebar-item[data-step="challenge"]')?.classList.add('completed');
        unlockSection('test');
        enableBtn('btn-next-test');
    }

    if (saved.testDone) {
        markQuestDone('test');
        const ic = document.getElementById('ic-test');
        if (ic) ic.textContent = '\u2713';
        document.querySelector('.sidebar-item[data-step="test"]')?.classList.add('completed');
    }

    updateSectionMeta();

    // DEV_MODE: unlock all sections
    if (DEV_MODE) {
        ['practice', 'challenge', 'test'].forEach(s => unlockSection(s));
        enableBtn('btn-next-challenge');
        enableBtn('btn-next-test');

        // Dev toolbar: quick-complete + play mini-game buttons
        const devBar = document.createElement('div');
        devBar.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;display:flex;gap:6px;';
        devBar.innerHTML = `
            <button id="dev-complete-all" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.3);">DEV: Complete All</button>
            <button id="dev-play-game" style="padding:6px 12px;background:#9b59b6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.3);">DEV: Mini-Game</button>
        `;
        document.body.appendChild(devBar);
        document.getElementById('dev-complete-all').addEventListener('click', () => {
            ['mission', 'learn', 'compare', 'practice', 'challenge', 'test'].forEach(s => completeStep(s));
        });
        document.getElementById('dev-play-game').addEventListener('click', () => {
            bonusRoundShown = false;
            showBonusRound();
        });
    }

    // Determine which step to show
    if (saved.testDone) {
        goToStep('test');
    } else if (saved.challengeDone) {
        goToStep('test');
    } else if (saved.practiceDone) {
        goToStep('challenge');
    } else if (saved.learnDone && saved.compareDone) {
        goToStep('practice');
    } else if (saved.learnDone) {
        goToStep('compare');
    } else if (saved.missionDone) {
        goToStep('learn');
    } else {
        goToStep('mission');
    }

    // Unlock next lesson if complete
    if (progress.isLessonComplete(lessonData.slug)) {
        const nextBtn = document.getElementById('btn-next-lesson');
        if (nextBtn) {
            nextBtn.classList.remove('locked');
            nextBtn.classList.add('unlocked');
            nextBtn.textContent = 'Next \u25B6';
        }
    }
}

/* ============================================
   HELPERS
   ============================================ */
function showInitError(funcName, err) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:8px 12px;z-index:99999;font-family:monospace;font-size:11px;white-space:pre-wrap;';
    d.textContent = `[${funcName}] ${err.message}\n${err.stack || ''}`;
    document.body.prepend(d);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function normalizeOutput(str) {
    return (str || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n+$/, '')
        .trim();
}

/* ============================================
   BASIC GO FORMATTER (gofmt-like)
   ============================================ */
function formatGoCode(code) {
    const lines = code.split('\n');
    let indent = 0;
    const result = [];
    for (let line of lines) {
        let trimmed = line.trim();
        if (!trimmed) { result.push(''); continue; }
        // Decrease indent for closing braces
        if (trimmed.startsWith('}') || trimmed.startsWith(')')) {
            indent = Math.max(0, indent - 1);
        }
        result.push('\t'.repeat(indent) + trimmed);
        // Increase indent for opening braces
        if (trimmed.endsWith('{') || trimmed.endsWith('(')) {
            indent++;
        }
    }
    return result.join('\n');
}

function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    // Code blocks ```...```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang || 'go'}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Headings
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

    // Paragraphs (double newlines)
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*(<h[23]>)/g, '$1');
    html = html.replace(/(<\/h[23]>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');

    return html;
}

function renderPrompt(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    // Code blocks ```...```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang || 'go'}">${code.trim()}</code></pre>`;
    });

    // Inline code `...`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold **...**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Lines starting with "- " → list items
    html = html.replace(/(?:^|\n)\s*- (.+)/g, '\n<li>$1</li>');
    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>[\s\S]*?<\/li>\s*)+)/g, '<ul class="prompt-list">$1</ul>');

    // Newlines → <br> (but not inside pre/code)
    // Split on <pre>...</pre>, only apply <br> outside
    const parts = html.split(/(<pre>[\s\S]*?<\/pre>)/g);
    html = parts.map((p, i) => i % 2 === 0 ? p.replace(/\n/g, '<br>') : p).join('');

    // Clean up leading <br>
    html = html.replace(/^(<br>)+/, '');
    html = html.replace(/(<br>)+$/, '');

    return html;
}

/* ============================================
   BOOTSTRAP
   ============================================ */
function init() {
    console.log('[GoQuest] init() starting...');
    try { initIntro(); console.log('[GoQuest] initIntro OK'); } catch(e) { console.error('[GoQuest] initIntro FAILED:', e); showInitError('initIntro', e); }
    try { initSidebar(); console.log('[GoQuest] initSidebar OK'); } catch(e) { console.error('[GoQuest] initSidebar FAILED:', e); showInitError('initSidebar', e); }
    try { initNextButtons(); console.log('[GoQuest] initNextButtons OK'); } catch(e) { console.error('[GoQuest] initNextButtons FAILED:', e); showInitError('initNextButtons', e); }
    try { initConsoleClear(); console.log('[GoQuest] initConsoleClear OK'); } catch(e) { console.error('[GoQuest] initConsoleClear FAILED:', e); showInitError('initConsoleClear', e); }

    // Render language switcher in lesson bar
    renderLangSwitcher('lesson-lang-switcher');

    // Re-render compare/learn when language changes
    window.addEventListener('langchange', () => {
        const isTutorialStep = ['mission', 'learn', 'compare'].includes(currentStep);
        if (currentMode === 'tutor' && isTutorialStep) {
            // Re-parse slides with new language and re-render current slide
            currentSlides = parseSlides(currentStep);
            if (currentSlideIndex >= currentSlides.length) currentSlideIndex = 0;
            renderSlide();
            // No need to update originalStepHTML — restoreTutorialStepContent
            // will re-render fresh with current language when switching back to read mode.
        } else {
            renderLearn();
            renderCompare();
            // Update cached HTML so tutor→read restore is up to date
            ['learn', 'compare'].forEach(s => {
                const el = document.getElementById('step-' + s);
                if (el) originalStepHTML[s] = el.innerHTML;
            });
        }
    });

    // Render static content
    try { renderMission(); console.log('[GoQuest] renderMission OK'); } catch(e) { console.error('[GoQuest] renderMission FAILED:', e); showInitError('renderMission', e); }
    try { renderLearn(); console.log('[GoQuest] renderLearn OK'); } catch(e) { console.error('[GoQuest] renderLearn FAILED:', e); showInitError('renderLearn', e); }
    try { renderCompare(); console.log('[GoQuest] renderCompare OK'); } catch(e) { console.error('[GoQuest] renderCompare FAILED:', e); showInitError('renderCompare', e); }

    // Init editors
    try { initPractice(); console.log('[GoQuest] initPractice OK'); } catch(e) { console.error('[GoQuest] initPractice FAILED:', e); showInitError('initPractice', e); }
    try { initChallenge(); console.log('[GoQuest] initChallenge OK'); } catch(e) { console.error('[GoQuest] initChallenge FAILED:', e); showInitError('initChallenge', e); }
    try { initTest(); console.log('[GoQuest] initTest OK'); } catch(e) { console.error('[GoQuest] initTest FAILED:', e); showInitError('initTest', e); }

    // Restore state and navigate to correct step
    // If intro hasn't been dismissed yet (first visit), defer until user clicks
    if (introDismissed) {
        try { restoreState(); console.log('[GoQuest] restoreState OK'); } catch(e) { console.error('[GoQuest] restoreState FAILED:', e); showInitError('restoreState', e); }
    } else {
        pendingRestoreState = true;
        // Show mission step behind the intro overlay
        goToStep('mission');
    }

    // Init mode toggle, chathead, and voice
    try { initModeToggle(); } catch(e) { console.error('[GoQuest] initModeToggle FAILED:', e); showInitError('initModeToggle', e); }
    try { initChathead(); } catch(e) { console.error('[GoQuest] initChathead FAILED:', e); }
    try { initVoice(); } catch(e) { console.error('[GoQuest] initVoice FAILED:', e); }

    // Save original HTML of tutorial steps (after render, before tutor mode may replace)
    ['mission', 'learn', 'compare'].forEach(s => {
        const el = document.getElementById('step-' + s);
        if (el) originalStepHTML[s] = el.innerHTML;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter or Cmd+Enter: run/submit current step
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (currentStep === 'practice') runPractice();
            else if (currentStep === 'challenge') submitChallenge();
            else if (currentStep === 'test') runCurrentTest();
        }
        // Ctrl+Shift+H: show hint
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
            e.preventDefault();
            if (currentStep === 'challenge') showNextHint();
        }
        // Ctrl+Shift+R: reset editor
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            if (currentStep === 'practice') document.getElementById('btn-practice-reset')?.click();
            else if (currentStep === 'challenge') document.getElementById('btn-challenge-reset')?.click();
        }
    });

    // Update HUD
    updateHUD();

    // Render inventory
    inventory.renderBar('inv-grid');

    // Auto-show bonus round if ?game=1 query param (from Quest Map replay icon)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('game') === '1') {
        bonusRoundShown = false;
        setTimeout(() => showBonusRound(), 300);
    }
}

init();
