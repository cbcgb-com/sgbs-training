(function () {
    const STORAGE_KEY = 'chinese-variant';
    const VARIANT_TRAD = 'zh-tw';
    const VARIANT_SIMP = 'zh-cn';

    let converter = null;
    let htmlConverter = null;
    let currentVariant = VARIANT_TRAD;

    function setLangAttribute() {
        document.documentElement.setAttribute('lang', currentVariant === VARIANT_TRAD ? 'zh-TW' : 'zh-CN');
    }

    function loadOpenCC(callback) {
        if (window.OpenCC) {
            callback();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    function initConverter() {
        converter = window.OpenCC.Converter({ from: 'tw', to: 'cn' });
    }

    function convertPage() {
        if (!converter) initConverter();
        const rootNode = document.documentElement;
        htmlConverter = window.OpenCC.HTMLConverter(converter, rootNode, 'zh-TW', 'zh-CN');
        htmlConverter.convert();
        currentVariant = VARIANT_SIMP;
        setLangAttribute();
        updateToggleButton();
    }

    function restorePage() {
        if (htmlConverter) {
            htmlConverter.restore();
        }
        currentVariant = VARIANT_TRAD;
        setLangAttribute();
        updateToggleButton();
    }

    function toggleVariant() {
        if (currentVariant === VARIANT_TRAD) {
            convertPage();
            localStorage.setItem(STORAGE_KEY, VARIANT_SIMP);
        } else {
            restorePage();
            localStorage.setItem(STORAGE_KEY, VARIANT_TRAD);
        }
    }

    function updateToggleButton() {
        const btn = document.getElementById('chinese-toggle-btn');
        if (btn) {
            btn.textContent = currentVariant === VARIANT_TRAD ? '简' : '繁';
            btn.setAttribute('aria-label', currentVariant === VARIANT_TRAD ? '切换到简体中文' : '切換到繁體中文');
            btn.setAttribute('title', currentVariant === VARIANT_TRAD ? '切换到简体中文' : '切換到繁體中文');
        }
    }

    function createToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'chinese-toggle-btn';
        btn.className = 'chinese-toggle-btn';
        btn.textContent = '简';
        btn.setAttribute('aria-label', '切换到简体中文');
        btn.setAttribute('title', '切换到简体中文');
        btn.addEventListener('click', toggleVariant);
        return btn;
    }

    function insertToggleButton() {
        if (document.getElementById('chinese-toggle-btn')) return;

        const header = document.querySelector('header') || document.querySelector('.md-header');
        if (header) {
            const btn = createToggleButton();
            header.appendChild(btn);
        }
    }

    function applyStoredPreference() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === VARIANT_SIMP) {
            loadOpenCC(function () {
                convertPage();
            });
        }
    }

    function init() {
        setLangAttribute();
        insertToggleButton();
        applyStoredPreference();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    document.addEventListener('DOMContentLoaded', applyStoredPreference);
})();
