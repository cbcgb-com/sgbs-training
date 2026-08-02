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
        frame.style.height = px + "px";
        frame.setAttribute("height", String(px));
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
})();
