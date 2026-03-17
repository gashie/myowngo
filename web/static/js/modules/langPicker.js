/* ============================================
   LANGUAGE PICKER MODULE
   Manages the user's source language preference.
   ============================================ */

const STORAGE_KEY = 'goquest_source_lang';
const DEFAULT_LANG = 'javascript';

// Language metadata (must match backend SupportedLanguages)
export const LANGUAGES = [
    { id: 'javascript', name: 'JavaScript', label: 'NODE.JS', icon: '\u2B22', prismClass: 'language-javascript' },
    { id: 'python',     name: 'Python',     label: 'PYTHON',  icon: '\uD83D\uDC0D', prismClass: 'language-python' },
    { id: 'csharp',     name: 'C#',         label: 'C#',      icon: '#\uFE0F\u20E3', prismClass: 'language-csharp' },
    { id: 'java',       name: 'Java',       label: 'JAVA',    icon: '\u2615', prismClass: 'language-java' },
    { id: 'php',        name: 'PHP',        label: 'PHP',     icon: '\uD83D\uDC18', prismClass: 'language-php' },
];

/** Get the currently selected source language ID */
export function getSelectedLang() {
    try {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    } catch {
        return DEFAULT_LANG;
    }
}

/** Set the source language preference */
export function setSelectedLang(langId) {
    try {
        localStorage.setItem(STORAGE_KEY, langId);
    } catch { /* quota */ }
}

/** Get language metadata by ID */
export function getLangInfo(langId) {
    return LANGUAGES.find(l => l.id === langId) || LANGUAGES[0];
}

/** Check if user has ever picked a language */
export function hasPickedLang() {
    try {
        return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
        return false;
    }
}

/** Show the language picker modal. Returns a promise that resolves with the selected lang ID. */
export function showLangPickerModal() {
    return new Promise((resolve) => {
        // Don't show if already exists
        if (document.getElementById('lang-picker-modal')) {
            resolve(getSelectedLang());
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'lang-picker-modal';
        modal.className = 'lang-picker-overlay';
        modal.innerHTML = `
            <div class="lang-picker-card">
                <div class="lang-picker-header">
                    <div class="lang-picker-gopher">\uD83D\uDC39</div>
                    <h2>Welcome to GoQuest!</h2>
                    <p class="lang-picker-subtitle">What language are you coming from?<br>We'll show you Go through the lens of <strong>your</strong> language.</p>
                </div>
                <div class="lang-picker-grid">
                    ${LANGUAGES.map(l => `
                        <button class="lang-picker-btn" data-lang="${l.id}">
                            <span class="lang-picker-icon">${l.icon}</span>
                            <span class="lang-picker-name">${l.name}</span>
                        </button>
                    `).join('')}
                </div>
                <p class="lang-picker-hint">You can change this anytime from the nav bar.</p>
            </div>
        `;

        document.body.appendChild(modal);

        // Animate in
        requestAnimationFrame(() => modal.classList.add('visible'));

        modal.querySelectorAll('.lang-picker-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const langId = btn.dataset.lang;
                setSelectedLang(langId);
                modal.classList.remove('visible');
                setTimeout(() => modal.remove(), 300);
                resolve(langId);
            });
        });
    });
}

/** Render a compact language switcher dropdown for the nav/lesson bar */
export function renderLangSwitcher(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const current = getLangInfo(getSelectedLang());

    container.innerHTML = `
        <div class="lang-switcher" id="lang-switcher">
            <button class="lang-switcher-btn" id="lang-switcher-btn" title="Switch source language">
                <span class="lang-sw-icon">${current.icon}</span>
                <span class="lang-sw-name">${current.name}</span>
                <span class="lang-sw-arrow">\u25BE</span>
            </button>
            <div class="lang-switcher-dropdown" id="lang-switcher-dropdown">
                ${LANGUAGES.map(l => `
                    <button class="lang-sw-option ${l.id === current.id ? 'active' : ''}" data-lang="${l.id}">
                        <span>${l.icon}</span>
                        <span>${l.name}</span>
                        ${l.id === current.id ? '<span class="lang-sw-check">\u2713</span>' : ''}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    const btn = container.querySelector('#lang-switcher-btn');
    const dropdown = container.querySelector('#lang-switcher-dropdown');

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => dropdown.classList.remove('open'));

    container.querySelectorAll('.lang-sw-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const langId = opt.dataset.lang;
            setSelectedLang(langId);
            dropdown.classList.remove('open');
            // Re-render switcher
            renderLangSwitcher(containerId);
            // Dispatch event for other modules to react
            window.dispatchEvent(new CustomEvent('langchange', { detail: { langId } }));
        });
    });
}
