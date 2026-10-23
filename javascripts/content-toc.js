/**
 * Peek + fade collapse for the in-page 目錄 on lesson pages.
 *
 * Progressive enhancement: Markdown stays a heading + list (full TOC
 * visible without JS). This script finds a heading whose text is 目錄,
 * wraps the heading + following list, and — when the list is taller
 * than the first ~4 rows — clips it with a fade and a
 * 「顯示全部目錄（共 N 項）」 button. Height animates at 280ms ease to
 * match content-accordion.js; prefers-reduced-motion skips the motion.
 *
 * Re-inits after MkDocs instant navigation when `document$` exists.
 */
(function () {
    var DURATION_MS = 280;
    var EASING = "ease";
    var PEEK_ROWS = 4;
    var PEEK_FALLBACK_PX = 178;
    var SHORT_SLACK_PX = 8;

    function prefersReducedMotion() {
        return (
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
    }

    function uid(prefix) {
        return prefix + "-" + Math.random().toString(36).slice(2, 9);
    }

    function headingLabel(el) {
        var text = el.textContent || "";
        return text.replace(/[¶#\u00b6]/g, "").replace(/\s+/g, "");
    }

    function isTocHeading(el) {
        return !!el && /^H[1-6]$/.test(el.tagName) && headingLabel(el) === "目錄";
    }

    function nextList(heading) {
        var el = heading.nextElementSibling;
        if (el && (el.tagName === "UL" || el.tagName === "OL")) {
            return el;
        }
        return null;
    }

    function findTocHeadings(root) {
        var scope = root && root.querySelectorAll ? root : document;
        var headings = scope.querySelectorAll("h1, h2, h3, h4");
        var found = [];
        for (var i = 0; i < headings.length; i++) {
            if (isTocHeading(headings[i])) {
                found.push(headings[i]);
            }
        }
        return found;
    }

    function readPeekFallback(clip) {
        var styles = window.getComputedStyle(clip);
        var raw = (styles.getPropertyValue("--content-toc-peek") || "").trim();
        if (!raw) {
            return PEEK_FALLBACK_PX;
        }
        var value = parseFloat(raw);
        if (!(value > 0)) {
            return PEEK_FALLBACK_PX;
        }
        if (raw.indexOf("rem") !== -1) {
            var rootSize =
                parseFloat(
                    window.getComputedStyle(document.documentElement).fontSize
                ) || 16;
            return value * rootSize;
        }
        return value;
    }

    function measurePeek(clip, list) {
        var fallback = readPeekFallback(clip);
        var items = list.querySelectorAll("li");
        if (items.length < PEEK_ROWS) {
            return Math.max(fallback, list.scrollHeight);
        }
        var clipTop = clip.getBoundingClientRect().top;
        var fourthBottom = items[PEEK_ROWS - 1].getBoundingClientRect().bottom;
        var peek = Math.round(fourthBottom - clipTop);
        if (peek < 40) {
            return fallback;
        }
        return peek;
    }

    function wrapToc(heading, list) {
        var root = document.createElement("div");
        root.className = "content-toc";

        var clip = document.createElement("div");
        clip.className = "content-toc__clip";
        clip.id = heading.id
            ? heading.id + "-toc-clip"
            : uid("content-toc-clip");
        /* overflow:hidden makes a BFC so list margins stay inside the
         * clip in both collapsed and expanded states (otherwise peek
         * height shrinks after the first open). */
        clip.style.overflow = "hidden";

        heading.parentNode.insertBefore(root, heading);
        root.appendChild(heading);
        root.appendChild(clip);
        clip.appendChild(list);
        return { root: root, clip: clip };
    }

    function measureExpanded(clip) {
        var prev = clip.style.height;
        clip.style.overflow = "hidden";
        clip.style.height = "auto";
        var height = clip.offsetHeight;
        clip.style.height = prev;
        return height;
    }

    function unwrapToc(root, heading, list) {
        var parent = root.parentNode;
        if (!parent) {
            return;
        }
        parent.insertBefore(heading, root);
        parent.insertBefore(list, root);
        parent.removeChild(root);
    }

    function createButton(clipId, count) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "content-toc__toggle";
        btn.setAttribute("aria-expanded", "false");
        btn.setAttribute("aria-controls", clipId);
        btn.setAttribute("data-toc-count", String(count));

        var label = document.createElement("span");
        label.className = "content-toc__toggle-label";
        label.textContent = "顯示全部目錄（共 " + count + " 項）";

        var chev = document.createElement("span");
        chev.className = "content-toc__chev";
        chev.setAttribute("aria-hidden", "true");

        btn.appendChild(label);
        btn.appendChild(chev);
        return btn;
    }

    function setExpanded(root, button, expanded) {
        root.classList.toggle("is-expanded", expanded);
        root.classList.toggle("is-collapsed", !expanded);
        button.setAttribute("aria-expanded", expanded ? "true" : "false");
        var label = button.querySelector(".content-toc__toggle-label");
        var count = button.getAttribute("data-toc-count");
        if (label) {
            label.textContent = expanded
                ? "收起目錄"
                : "顯示全部目錄（共 " + count + " 項）";
        }
    }

    function animateHeight(clip, fromPx, toPx, restoreAuto, done) {
        function finish() {
            clip.style.overflow = "hidden";
            clip.style.height = restoreAuto ? "" : toPx + "px";
            if (done) {
                done();
            }
        }

        if (prefersReducedMotion() || typeof clip.animate !== "function") {
            finish();
            return;
        }

        clip.style.overflow = "hidden";
        clip.style.height = fromPx + "px";
        var anim = clip.animate(
            [{ height: fromPx + "px" }, { height: toPx + "px" }],
            { duration: DURATION_MS, easing: EASING }
        );
        anim.onfinish = finish;
        anim.oncancel = finish;
    }

    function scrollHeadingIntoView(heading) {
        if (!heading || typeof heading.scrollIntoView !== "function") {
            return;
        }
        heading.scrollIntoView({
            block: "nearest",
            behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
    }

    function attachToggle(state) {
        state.button.addEventListener("click", function () {
            if (state.root.dataset.tocAnimating === "true") {
                return;
            }
            var expanded = state.root.classList.contains("is-expanded");
            state.root.dataset.tocAnimating = "true";

            if (expanded) {
                var peek = state.peek || measurePeek(state.clip, state.list);
                var start = state.clip.offsetHeight;
                setExpanded(state.root, state.button, false);
                animateHeight(state.clip, start, peek, false, function () {
                    state.root.dataset.tocAnimating = "false";
                    scrollHeadingIntoView(state.heading);
                });
                return;
            }

            var from = state.clip.offsetHeight;
            var to = measureExpanded(state.clip);
            setExpanded(state.root, state.button, true);
            animateHeight(state.clip, from, to, true, function () {
                state.root.dataset.tocAnimating = "false";
            });
        });
    }

    function applyCollapsed(state, peek) {
        state.root.classList.add("is-collapsed");
        state.root.classList.remove("is-expanded");
        state.clip.style.height = peek + "px";
        state.clip.style.overflow = "hidden";
        state.button.setAttribute("aria-expanded", "false");
    }

    function enhance(heading) {
        if (heading.dataset.tocReady === "true") {
            return;
        }
        if (heading.closest(".content-toc")) {
            heading.dataset.tocReady = "true";
            return;
        }

        var list = nextList(heading);
        if (!list) {
            return;
        }

        heading.dataset.tocReady = "true";

        var wrapped = wrapToc(heading, list);
        var peek = measurePeek(wrapped.clip, list);
        var full = wrapped.clip.scrollHeight;

        if (full <= peek + SHORT_SLACK_PX) {
            unwrapToc(wrapped.root, heading, list);
            return;
        }

        var count = list.querySelectorAll("a[href]").length;
        var button = createButton(wrapped.clip.id, count);
        wrapped.root.appendChild(button);

        var state = {
            root: wrapped.root,
            clip: wrapped.clip,
            list: list,
            heading: heading,
            button: button,
            peek: peek,
        };

        applyCollapsed(state, peek);
        attachToggle(state);

        function remeasure() {
            if (state.root.classList.contains("is-expanded")) {
                return;
            }
            if (state.root.dataset.tocAnimating === "true") {
                return;
            }
            var nextPeek = measurePeek(state.clip, state.list);
            state.peek = nextPeek;
            state.clip.style.height = nextPeek + "px";
        }

        window.addEventListener("resize", remeasure);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(remeasure).catch(function () {});
        }
    }

    function init(root) {
        findTocHeadings(root).forEach(enhance);
    }

    function boot() {
        init(document);
    }

    if (typeof window.document$ !== "undefined" && window.document$.subscribe) {
        window.document$.subscribe(boot);
    } else if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
