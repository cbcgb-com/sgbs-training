(function () {
    const STORAGE_KEY = 'chinese-variant';
    const VARIANT_TRAD = 'zh-tw';
    const VARIANT_SIMP = 'zh-cn';

    let converter = null;
    let htmlConverter = null; // main document only (OpenCC cannot cross iframes)
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

    // The 简/繁 toggle must also reach content rendered inside same-origin
    // iframes (the content-quiz embeds). OpenCC's HTMLConverter silently
    // no-ops on foreign documents, so convert their text nodes manually
    // with the string converter; restore = reload the frame.
    function convertIframeTexts() {
        document.querySelectorAll('iframe').forEach(function (frame) {
            try {
                if (frame.dataset.simpConverted === '1') return;
                const doc = frame.contentDocument;
                if (!doc || !doc.body) return;
                const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
                const nodes = [];
                while (walker.nextNode()) nodes.push(walker.currentNode);
                nodes.forEach(function (node) {
                    const converted = converter(node.nodeValue);
                    if (converted !== node.nodeValue) node.nodeValue = converted;
                });
                frame.dataset.simpConverted = '1';
            } catch (err) { /* cross-origin or not ready: skip */ }
        });
    }

    function restoreIframes() {
        document.querySelectorAll('iframe[data-simp-converted]').forEach(function (frame) {
            try {
                frame.contentWindow.location.reload();
            } catch (err) { /* skip */ }
            delete frame.dataset.simpConverted;
        });
    }

    function convertPage() {
        if (!converter) initConverter();
        htmlConverter = window.OpenCC.HTMLConverter(converter, document.documentElement, 'zh-TW', 'zh-CN');
        htmlConverter.convert();
        convertIframeTexts();
        currentVariant = VARIANT_SIMP;
        setLangAttribute();
        updateToggleButton();
    }

    function restorePage() {
        if (htmlConverter) {
            htmlConverter.restore();
            htmlConverter = null;
        }
        restoreIframes();
        currentVariant = VARIANT_TRAD;
        setLangAttribute();
        updateToggleButton();
    }

    function toggleVariant() {
        if (currentVariant === VARIANT_TRAD) {
            loadOpenCC(function () {
                convertPage();
                localStorage.setItem(STORAGE_KEY, VARIANT_SIMP);
            });
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

    // Quiz iframes load lazily; when one finishes loading while the page is
    // already in simplified mode, convert it too.
    document.addEventListener('load', function (event) {
        if (currentVariant === VARIANT_SIMP && event.target.tagName === 'IFRAME' && converter) {
            convertIframeTexts();
        }
    }, true);

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
