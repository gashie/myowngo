export const BADGES = [
    { id: 'first_lesson', name: 'Hello, Go!', desc: 'Complete your first lesson', icon: '\u{1F44B}',
      condition: (s) => Object.keys(s.completedLessons).length >= 1 },
    { id: 'phase1_complete', name: 'Foundation Layer', desc: 'Complete Phase 1', icon: '\u{1F3D7}',
      condition: (s) => countCompletedInPhase(s, ['print','comments','variables','types','interpolation','ifelse','switch','for_loop','while_loop','functions','default_values','iife']) },
    { id: 'ten_lessons', name: 'Decathlon', desc: 'Complete 10 lessons', icon: '\u{1F3C5}',
      condition: (s) => countCompleted(s) >= 10 },
    { id: 'twenty_lessons', name: 'Double Decade', desc: 'Complete 20 lessons', icon: '\u{1F31F}',
      condition: (s) => countCompleted(s) >= 20 },
    { id: 'level5', name: 'Gopher Apprentice', desc: 'Reach Level 5', icon: '\u{1F412}',
      condition: (s) => s.level >= 5 },
    { id: 'level10', name: 'Gopher Master', desc: 'Reach Level 10', icon: '\u{1F451}',
      condition: (s) => s.level >= 10 },
    { id: 'half_done', name: 'Halfway There', desc: 'Complete 32 lessons', icon: '\u{26F0}',
      condition: (s) => countCompleted(s) >= 32 },
    { id: 'all_done', name: 'Go Grand Master', desc: 'Complete all 64 lessons', icon: '\u{1F3C6}',
      condition: (s) => countCompleted(s) >= 64 },
];

function countCompleted(state) {
    return Object.values(state.completedLessons)
        .filter(l => l.learnDone && l.compareDone && l.practiceDone && l.challengeDone && l.testDone)
        .length;
}

function countCompletedInPhase(state, slugs) {
    return slugs.every(slug => {
        const l = state.completedLessons[slug];
        return l && l.learnDone && l.compareDone;
    });
}

export class Gamification {
    constructor(progress) {
        this.progress = progress;
    }

    percentToNextLevel(xp) {
        const currentLevel = Math.floor(Math.sqrt(xp / 25)) + 1;
        const xpForCurrent = 25 * (currentLevel - 1) * (currentLevel - 1);
        const xpForNext = 25 * currentLevel * currentLevel;
        if (xpForNext === xpForCurrent) return 0;
        return Math.min(100, ((xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100);
    }

    checkNewBadges() {
        const state = this.progress.getState();
        const newBadges = [];
        for (const badge of BADGES) {
            if (!state.badges.includes(badge.id) && badge.condition(state)) {
                this.progress.addBadge(badge.id);
                newBadges.push(badge);
            }
        }
        return newBadges;
    }

    awardXP(amount) {
        const state = this.progress.getState();
        state.totalXP = (state.totalXP || 0) + amount;
        state.level = Math.floor(Math.sqrt(state.totalXP / 25)) + 1;
        this.progress._save();
    }

    showXPPopup(amount) {
        const popup = document.getElementById('xp-popup');
        if (!popup) return;
        popup.textContent = `+${amount} XP`;
        popup.classList.remove('hidden', 'animate');
        // Force reflow
        void popup.offsetWidth;
        popup.classList.add('animate');
        setTimeout(() => {
            popup.classList.remove('animate');
            popup.classList.add('hidden');
        }, 2000);
    }

    showBadgeUnlock(badge) {
        const overlay = document.createElement('div');
        overlay.className = 'badge-unlock-overlay';
        overlay.innerHTML = `
            <div class="badge-unlock-card">
                <div class="badge-icon">${badge.icon}</div>
                <h2>Badge Earned!</h2>
                <h3>${badge.name}</h3>
                <p>${badge.desc}</p>
                <button onclick="this.closest('.badge-unlock-overlay').remove()">Continue</button>
            </div>`;
        document.body.appendChild(overlay);
    }
}
