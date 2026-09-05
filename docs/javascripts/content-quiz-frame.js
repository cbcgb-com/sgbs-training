/**
 * Resize seamless quiz iframes from postMessage height reports.
 */
(function () {
    var TYPE = "content-quiz-frame-height";

    function findFrame(source) {
        var frames = document.querySelectorAll("iframe.content-quiz-frame");
        for (var i = 0; i < frames.length; i++) {
            if (frames[i].contentWindow === source) {
                return frames[i];
            }
        }
        return null;
    }

    function applyHeight(frame, height) {
        var px = Math.max(120, Math.ceil(height));
        // Compare against the RENDERED height, not the attribute: if
        // anything else touched style.height directly, the rendered value
        // diverges from the attribute and this must still correct it.
        var current = Math.round(frame.getBoundingClientRect().height);
        if (current === px) return; // no change → no resize-observer echo
        frame.style.height = px + "px";
        frame.setAttribute("height", String(px));
    }

    // If the frame is resized by anything else (late layout, theme swap,
    // author overrides), ask the child to re-measure so the frame can
    // shrink back to its content — scrollHeight inside the child is
    // clamped by the frame, so only a fresh report can shrink it.
    function requestMeasure(frame) {
        try {
            frame.contentWindow.postMessage(
                { type: "content-quiz-frame-measure" },
                "*"
            );
        } catch (err) {
            /* cross-origin frame; nothing to do */
        }
    }

    function observeFrames() {
        if (!window.ResizeObserver) return;
        var observer = new ResizeObserver(function (entries) {
            entries.forEach(function (entry) {
                requestMeasure(entry.target);
            });
        });
        document.querySelectorAll("iframe.content-quiz-frame").forEach(
            function (frame) {
                observer.observe(frame);
            }
        );
    }

    window.addEventListener("message", function (event) {
        var data = event.data;
        if (!data || data.type !== TYPE || typeof data.height !== "number") {
            return;
        }
        var frame = findFrame(event.source);
        if (!frame) return;
        applyHeight(frame, data.height);
    });

    document.querySelectorAll("iframe.content-quiz-frame").forEach(function (frame) {
        frame.setAttribute("scrolling", "no");
        frame.style.overflow = "hidden";
    });

    observeFrames();
})();
