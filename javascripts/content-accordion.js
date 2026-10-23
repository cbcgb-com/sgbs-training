/**
 * Smooth open/close for every content-area <details> accordion
 * (.content-check, .expandable-card, pymdownx `???` admonitions).
 *
 * Native <details> stays the source of truth (keyboard, no-JS, several
 * rows open at once, `???+` open-by-default). When the browser can
 * animate `::details-content` with `interpolate-size`, CSS does the
 * work. Otherwise a small Web Animations API fallback animates height
 * + opacity, keeping `open` until the close animation finishes.
 *
 * Re-inits after MkDocs instant navigation when `document$` exists.
 */
(function () {
    var DURATION_MS = 280;
    var EASING = "ease";
    var SELECTOR = [
        ".typography details",
        ".md-typeset details",
        ".content-check details",
        ".expandable-cards details",
        "details.content-check__item",
        "details.expandable-card",
    ].join(", ");

    function prefersReducedMotion() {
        return (
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
    }

    function hasNativeDetailsAnimation() {
        if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
            return false;
        }
        try {
            return (
                CSS.supports("selector(::details-content)") &&
                CSS.supports("interpolate-size", "allow-keywords")
            );
        } catch (err) {
            return false;
        }
    }

    function contentNodes(details) {
        var nodes = [];
        for (var i = 0; i < details.children.length; i++) {
            var child = details.children[i];
            if (child.tagName !== "SUMMARY") {
                nodes.push(child);
            }
        }
        return nodes;
    }

    function closedHeight(details) {
        var summary = details.querySelector("summary");
        var styles = window.getComputedStyle(details);
        var chrome =
            parseFloat(styles.borderTopWidth) +
            parseFloat(styles.borderBottomWidth) +
            parseFloat(styles.paddingTop) +
            parseFloat(styles.paddingBottom);
        return (summary ? summary.offsetHeight : 0) + chrome;
    }

    function clearInline(details, contents) {
        details.style.height = "";
        details.style.overflow = "";
        contents.forEach(function (el) {
            el.style.opacity = "";
        });
    }

    function setOpenLook(details, isOpen) {
        details.classList.toggle("is-open", isOpen);
        details.setAttribute("data-accordion-open", isOpen ? "true" : "false");
    }

    function animateOpen(details) {
        var contents = contentNodes(details);
        var start = details.offsetHeight;

        details.style.overflow = "hidden";
        details.style.height = start + "px";
        details.open = true;
        setOpenLook(details, true);
        contents.forEach(function (el) {
            el.style.opacity = "0";
        });

        var end = details.scrollHeight;
        var anim = details.animate(
            [{ height: start + "px" }, { height: end + "px" }],
            { duration: DURATION_MS, easing: EASING }
        );
        contents.forEach(function (el) {
            el.animate(
                [{ opacity: 0 }, { opacity: 1 }],
                { duration: DURATION_MS, easing: EASING }
            );
        });

        function finish() {
            clearInline(details, contents);
            details.dataset.accordionAnimating = "false";
        }
        anim.onfinish = finish;
        anim.oncancel = finish;
    }

    function animateClose(details) {
        var contents = contentNodes(details);
        var start = details.offsetHeight;
        var end = closedHeight(details);

        details.style.overflow = "hidden";
        details.style.height = start + "px";
        setOpenLook(details, false);

        var anim = details.animate(
            [{ height: start + "px" }, { height: end + "px" }],
            { duration: DURATION_MS, easing: EASING }
        );
        contents.forEach(function (el) {
            el.animate(
                [{ opacity: 1 }, { opacity: 0 }],
                { duration: DURATION_MS, easing: EASING }
            );
        });

        function finish() {
            details.open = false;
            clearInline(details, contents);
            details.dataset.accordionAnimating = "false";
        }
        anim.onfinish = finish;
        anim.oncancel = finish;
    }

    function enhance(details) {
        if (details.dataset.accordionReady === "true") {
            return;
        }
        details.dataset.accordionReady = "true";
        details.classList.add("sgbs-acc");
        if (details.open) {
            setOpenLook(details, true);
        }

        if (prefersReducedMotion() || hasNativeDetailsAnimation()) {
            return;
        }

        details.classList.add("sgbs-acc-js");
        var summary = details.querySelector("summary");
        if (!summary) {
            return;
        }

        summary.addEventListener("click", function (event) {
            if (prefersReducedMotion()) {
                return;
            }
            event.preventDefault();
            if (details.dataset.accordionAnimating === "true") {
                return;
            }
            details.dataset.accordionAnimating = "true";
            if (details.open) {
                animateClose(details);
            } else {
                animateOpen(details);
            }
        });
    }

    function init(root) {
        var scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll(SELECTOR).forEach(enhance);
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
