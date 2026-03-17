import { Progress } from './modules/progress.js';
import { Gamification, BADGES } from './modules/gamification.js';
import { GameState } from './modules/gameState.js';
import { Inventory } from './modules/inventory.js';
import { getBestGameScore } from './modules/miniGames.js';
import { hasPickedLang, showLangPickerModal, renderLangSwitcher } from './modules/langPicker.js';

const progress = new Progress();
const gamification = new Gamification(progress);
const gameState = new GameState(progress);
const inventory = new Inventory(gameState);

// ---- Track login streak ----
gameState.trackLogin();

// ---- Language Picker (first-visit modal + nav switcher) ----
if (!hasPickedLang()) {
    showLangPickerModal().then(() => {
        renderLangSwitcher('home-lang-switcher');
    });
} else {
    renderLangSwitcher('home-lang-switcher');
}

// ---- Update Navigation HUD ----
function updateNav() {
    const state = progress.getState();
    const levelEl = document.getElementById('nav-level');
    const xpEl = document.getElementById('nav-xp');
    const fillEl = document.getElementById('nav-xp-fill');
    if (levelEl) levelEl.textContent = `Lvl ${state.level}`;
    if (xpEl) xpEl.textContent = `${state.totalXP} XP`;
    if (fillEl) fillEl.style.width = `${gamification.percentToNextLevel(state.totalXP)}%`;
    const coinsEl = document.getElementById('nav-coins');
    if (coinsEl) coinsEl.textContent = `${state.totalCoins || 0}`;

    // Update energy pips
    updateEnergyPips();

    // Update teacher avatar stage
    updateTeacherAvatar();
}

function updateEnergyPips() {
    const energy = gameState.getEnergy();
    const pips = document.querySelectorAll('#hud-energy .energy-pip');
    pips.forEach((pip, i) => {
        if (i < energy.current) {
            pip.classList.add('filled');
        } else {
            pip.classList.remove('filled');
        }
    });
}

function updateTeacherAvatar() {
    const stage = gameState.getTeacherStage();
    const el = document.getElementById('hud-teacher-avatar');
    if (!el) return;
    el.classList.remove('stage-robot', 'stage-holographic', 'stage-deity');
    el.classList.add(`stage-${stage}`);
    const icons = { robot: '\uD83E\uDD16', holographic: '\uD83E\uDDDE', deity: '\u2728' };
    el.textContent = icons[stage] || '\uD83E\uDD16';
}

// ---- Quest Map: Phase Lock/Unlock ----
function updateQuestMap() {
    const phaseNodes = document.querySelectorAll('.phase-node');
    if (!phaseNodes.length) return;

    const state = progress.getState();

    phaseNodes.forEach(node => {
        const xpReq = parseInt(node.dataset.xpRequired, 10);
        if (state.totalXP >= xpReq) {
            node.classList.add('unlocked');
            node.classList.remove('locked');
        } else {
            node.classList.add('locked');
            node.classList.remove('unlocked');
        }
    });

    // Update lesson node completion states
    document.querySelectorAll('.lesson-node').forEach(node => {
        const slug = node.dataset.slug;
        if (!slug) return;
        const lessonState = state.completedLessons[slug];

        if (lessonState) {
            const allDone = lessonState.learnDone && lessonState.compareDone &&
                lessonState.practiceDone && lessonState.challengeDone && lessonState.testDone;
            if (allDone) {
                node.classList.add('completed');
                node.classList.remove('in-progress');
                // Add mini-game replay icon if not already present
                if (!node.querySelector('.lesson-replay-icon')) {
                    const replayBtn = document.createElement('span');
                    replayBtn.className = 'lesson-replay-icon';
                    replayBtn.title = 'Play mini-games';
                    replayBtn.textContent = '\uD83C\uDFAE';
                    const best = getBestGameScore(slug);
                    if (best > 0) replayBtn.title += ` (Best: ${best} pts)`;
                    replayBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = `/lesson/${slug}?game=1`;
                    });
                    node.appendChild(replayBtn);
                }
            } else {
                node.classList.add('in-progress');
                node.classList.remove('completed');
            }
        }
    });

    // Update phase progress bars
    document.querySelectorAll('.phase-node').forEach(node => {
        const slug = node.dataset.slug;
        const lessons = node.querySelectorAll('.lesson-node');
        if (!lessons.length) return;

        let completed = 0;
        lessons.forEach(l => {
            if (l.classList.contains('completed')) completed++;
        });

        const pct = Math.round((completed / lessons.length) * 100);
        const fill = node.querySelector('.phase-progress-fill');
        if (fill) fill.style.width = `${pct}%`;
    });
}

// ---- Dashboard ----
function updateDashboard() {
    const state = progress.getState();

    const dashLevel = document.getElementById('dash-level');
    const dashXP = document.getElementById('dash-xp');
    const dashCompleted = document.getElementById('dash-completed');
    const dashBadges = document.getElementById('dash-badges');

    if (dashLevel) dashLevel.textContent = state.level;
    if (dashXP) dashXP.textContent = state.totalXP;
    if (dashCompleted) dashCompleted.textContent = `${progress.countCompleted()}/64`;
    if (dashBadges) dashBadges.textContent = state.badges.length;

    // Badge gallery
    const gallery = document.getElementById('badge-gallery');
    if (gallery) {
        gallery.innerHTML = '';
        BADGES.forEach(badge => {
            const earned = state.badges.includes(badge.id);
            const card = document.createElement('div');
            card.className = `badge-card ${earned ? 'earned' : 'locked'}`;
            card.innerHTML = `
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-desc">${badge.desc}</div>
            `;
            gallery.appendChild(card);
        });
    }

    // Phase progress rows
    document.querySelectorAll('.phase-progress-row').forEach(row => {
        const phase = row.dataset.phase;
        const fill = row.querySelector('.progress-fill');
        const pctEl = row.querySelector('.progress-pct');
        if (fill && pctEl) {
            const completedCount = progress.countCompleted();
            const pct = Math.min(100, Math.round((completedCount / 64) * 100));
            fill.style.width = `${pct}%`;
            pctEl.textContent = `${pct}%`;
        }
    });
}

// ---- Render Inventory Bar ----
function renderInventory() {
    inventory.renderBar('inventory-bar');
}

// ---- Init ----
updateNav();
updateQuestMap();
updateDashboard();
renderInventory();
