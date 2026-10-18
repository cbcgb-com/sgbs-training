/**
 * Flip-card carousel for class notes.
 *
 * Markup:
 *   <div class="content-flip" data-label="可選名稱">
 *     <div class="content-flip__card" data-label="尊重辯論">
 *       <h4 class="content-flip__title">尊重辯論</h4>
 *       <p class="content-flip__body">…</p>
 *     </div>
 *   </div>
 *
 * Without JS: title and body stay visible in reading order.
 * With JS: cards sit in a horizontal row; ←/→ buttons and keys move
 * between them; click / Enter / Space 3D-flips a card; swipe on touch.
 */
(function () {
    var MOBILE_MQ = "(max-width: 600px)";

    function cardChildren(root) {
        var cards = [];
        for (var i = 0; i < root.children.length; i++) {
            var child = root.children[i];
            if (child.classList && child.classList.contains("content-flip__card")) {
                cards.push(child);
            }
        }
        return cards;
    }

    function enhanceCard(card, index) {
        var title = card.querySelector(".content-flip__title");
        var body = card.querySelector(".content-flip__body");
        var label =
            card.getAttribute("data-label") ||
            (title && title.textContent.trim()) ||
            "卡片 " + (index + 1);

        var inner = document.createElement("div");
        inner.className = "content-flip__inner";

        var front = document.createElement("div");
        front.className = "content-flip__face content-flip__face--front";

        var back = document.createElement("div");
        back.className = "content-flip__face content-flip__face--back";

        var num = document.createElement("span");
        num.className = "content-flip__num";
        num.textContent = String(index + 1);
        num.setAttribute("aria-hidden", "true");
        front.appendChild(num);

        if (title) front.appendChild(title);
        if (body) back.appendChild(body);

        while (card.firstChild) {
            back.appendChild(card.firstChild);
        }

        inner.appendChild(front);
        inner.appendChild(back);
        card.appendChild(inner);

        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-pressed", "false");
        card.setAttribute(
            "aria-label",
            label + "，點選翻面。左右方向鍵可切換卡片。"
        );
    }

    function initFlip(root) {
        var cards = cardChildren(root);
        if (cards.length < 2) return;
        if (root.getAttribute("data-flip-ready") === "true") return;
        root.setAttribute("data-flip-ready", "true");
        root.classList.add("is-enhanced");

        var groupLabel = root.getAttribute("data-label");
        root.setAttribute("role", "region");
        root.setAttribute("tabindex", "0");
        if (groupLabel) {
            root.setAttribute("aria-label", groupLabel);
        }

        var prev = document.createElement("button");
        prev.type = "button";
        prev.className = "content-flip__arrow content-flip__arrow--prev";
        prev.setAttribute("aria-label", "上一張");
        prev.textContent = "‹";

        var next = document.createElement("button");
        next.type = "button";
        next.className = "content-flip__arrow content-flip__arrow--next";
        next.setAttribute("aria-label", "下一張");
        next.textContent = "›";

        var viewport = document.createElement("div");
        viewport.className = "content-flip__viewport";

        var track = document.createElement("div");
        track.className = "content-flip__track";

        cards.forEach(function (card, index) {
            enhanceCard(card, index);
            track.appendChild(card);
        });

        viewport.appendChild(track);
        root.appendChild(viewport);

        var nav = document.createElement("div");
        nav.className = "content-flip__nav";
        var status = document.createElement("span");
        status.className = "content-flip__nav-status";
        status.setAttribute("aria-live", "polite");
        nav.appendChild(prev);
        nav.appendChild(status);
        nav.appendChild(next);
        root.appendChild(nav);

        var active = 0;
        var start = 0;
        var visible = 1;
        var cardWidth = 0;
        var ignoreClick = false;
        var pointerId = null;
        var startX = 0;
        var startY = 0;
        var swiping = false;

        function gapPx() {
            var style = window.getComputedStyle(track);
            var gap = parseFloat(style.columnGap || style.gap);
            return isNaN(gap) ? 12 : gap;
        }

        function layout() {
            var width = viewport.clientWidth;
            var gap = gapPx();
            visible = window.matchMedia(MOBILE_MQ).matches
                ? 1
                : cards.length;
            cardWidth = (width - gap * (visible - 1)) / visible;
            cards.forEach(function (card) {
                card.style.flex = "0 0 " + cardWidth + "px";
                card.style.width = cardWidth + "px";
                card.style.maxWidth = cardWidth + "px";
            });
            sync();
        }

        function sync() {
            var maxStart = Math.max(0, cards.length - visible);
            if (active < start) start = active;
            if (active >= start + visible) start = active - visible + 1;
            start = Math.max(0, Math.min(start, maxStart));

            track.style.transform =
                "translateX(" + -(start * (cardWidth + gapPx())) + "px)";

            cards.forEach(function (card, i) {
                card.classList.toggle("is-active", i === active);
            });

            status.textContent =
                "第 " + (active + 1) + " / " + cards.length + " 張";
            prev.disabled = active === 0;
            next.disabled = active === cards.length - 1;
        }

        function go(delta) {
            var nextIndex = active + delta;
            if (nextIndex < 0 || nextIndex >= cards.length) return;
            active = nextIndex;
            sync();
        }

        function toggleFlip(card) {
            var flipped = card.classList.toggle("is-flipped");
            card.setAttribute("aria-pressed", flipped ? "true" : "false");
        }

        cards.forEach(function (card, index) {
            card.addEventListener("click", function () {
                if (ignoreClick) {
                    ignoreClick = false;
                    return;
                }
                active = index;
                sync();
                toggleFlip(card);
            });
            card.addEventListener("keydown", function (event) {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                event.stopPropagation();
                active = index;
                sync();
                toggleFlip(card);
            });
        });

        prev.addEventListener("click", function () {
            go(-1);
        });
        next.addEventListener("click", function () {
            go(1);
        });

        root.addEventListener("keydown", function (event) {
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                go(-1);
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                go(1);
            }
        });

        viewport.addEventListener("pointerdown", function (event) {
            if (event.button != null && event.button !== 0) return;
            pointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            swiping = false;
            ignoreClick = false;
        });

        viewport.addEventListener("pointermove", function (event) {
            if (pointerId === null || event.pointerId !== pointerId) return;
            var dx = event.clientX - startX;
            var dy = event.clientY - startY;
            if (!swiping && Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) {
                swiping = true;
            }
        });

        function endPointer(event) {
            if (pointerId === null || event.pointerId !== pointerId) return;
            var dx = event.clientX - startX;
            if (swiping) {
                ignoreClick = true;
                if (dx <= -40) go(1);
                else if (dx >= 40) go(-1);
            }
            pointerId = null;
            swiping = false;
        }

        viewport.addEventListener("pointerup", endPointer);
        viewport.addEventListener("pointercancel", endPointer);

        if (typeof ResizeObserver === "function") {
            var ro = new ResizeObserver(layout);
            ro.observe(viewport);
        } else {
            window.addEventListener("resize", layout);
        }

        if (typeof window.matchMedia === "function") {
            var mq = window.matchMedia(MOBILE_MQ);
            if (mq.addEventListener) {
                mq.addEventListener("change", layout);
            } else if (mq.addListener) {
                mq.addListener(layout);
            }
        }

        layout();
    }

    document.querySelectorAll(".content-flip").forEach(initFlip);
})();
