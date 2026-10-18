/**
 * Cover-flow flip carousel for class notes.
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
 * With JS: one large centered card with prev/next peeks; ←/→ wrap
 * infinitely; click the main card to 3D-flip; click a peek to center it.
 */
(function () {
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

    function wrappedOffset(index, active, n) {
        var d = (index - active) % n;
        if (d < 0) d += n;
        if (d > n / 2) d -= n;
        return d;
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
        card.setAttribute("tabindex", "-1");
        card.setAttribute("aria-pressed", "false");
        card.setAttribute("aria-label", label);
        card.setAttribute("data-flip-index", String(index));
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

        var stage = document.createElement("div");
        stage.className = "content-flip__stage";

        cards.forEach(function (card, index) {
            enhanceCard(card, index);
            stage.appendChild(card);
        });
        root.appendChild(stage);

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

        var nav = document.createElement("div");
        nav.className = "content-flip__nav";

        var status = document.createElement("span");
        status.className = "content-flip__nav-status";
        status.setAttribute("aria-live", "polite");

        var dots = document.createElement("div");
        dots.className = "content-flip__dots";
        dots.setAttribute("role", "tablist");
        if (groupLabel) {
            dots.setAttribute("aria-label", groupLabel + " 一覽");
        }

        var dotButtons = cards.map(function (card, index) {
            var dot = document.createElement("button");
            dot.type = "button";
            dot.className = "content-flip__dot";
            dot.setAttribute("role", "tab");
            var label =
                card.getAttribute("data-label") || "第 " + (index + 1) + " 張";
            dot.setAttribute("aria-label", label);
            dot.addEventListener("click", function () {
                goTo(index);
            });
            dots.appendChild(dot);
            return dot;
        });

        nav.appendChild(prev);
        nav.appendChild(status);
        nav.appendChild(next);
        root.appendChild(nav);
        root.appendChild(dots);

        var active = 0;
        var lastOffset = cards.map(function () {
            return 0;
        });
        var ignoreClick = false;
        var pointerId = null;
        var startX = 0;
        var startY = 0;
        var swiping = false;

        function isMobile() {
            return root.clientWidth < 520;
        }

        function mainWidth() {
            var stageW = stage.clientWidth;
            var ratio = isMobile() ? 0.85 : 0.66;
            var width = Math.round(stageW * ratio);
            if (!isMobile()) {
                width = Math.max(320, width);
            }
            return Math.min(width, Math.max(0, stageW - 8));
        }

        function unflipAll() {
            cards.forEach(function (card) {
                card.classList.remove("is-flipped");
                card.setAttribute("aria-pressed", "false");
            });
        }

        function measureHeight() {
            var width = mainWidth();
            if (width < 80) return;
            var probe = document.createElement("div");
            probe.className = "content-flip__probe";
            probe.style.width = width + "px";
            root.appendChild(probe);
            var maxH = 0;
            cards.forEach(function (card) {
                var body = card.querySelector(".content-flip__body");
                probe.textContent = body ? body.textContent : "";
                maxH = Math.max(maxH, probe.offsetHeight);
            });
            probe.remove();
            stage.style.height = Math.max(maxH, 220) + "px";
            stage.style.setProperty("--flip-card-w", width + "px");
        }

        function slotClass(offset) {
            if (offset === 0) return "is-active";
            if (offset === -1) return "is-prev";
            if (offset === 1) return "is-next";
            if (offset < 0) return "is-far-prev";
            return "is-far-next";
        }

        function sync(fromIndex) {
            var n = cards.length;
            cards.forEach(function (card, i) {
                var offset = wrappedOffset(i, active, n);
                var jumped =
                    fromIndex != null &&
                    Math.abs(offset - lastOffset[i]) > 1;
                var keepFlip =
                    offset === 0 && card.classList.contains("is-flipped");
                card.classList.remove(
                    "is-active",
                    "is-prev",
                    "is-next",
                    "is-far-prev",
                    "is-far-next",
                    "is-jumping"
                );
                card.classList.add(slotClass(offset));
                if (offset !== 0) {
                    card.classList.remove("is-flipped");
                    card.setAttribute("aria-pressed", "false");
                } else if (keepFlip) {
                    card.classList.add("is-flipped");
                }
                card.setAttribute(
                    "aria-hidden",
                    offset === 0 ? "false" : "true"
                );
                card.tabIndex = offset === 0 ? 0 : -1;
                lastOffset[i] = offset;
                if (jumped) {
                    card.classList.add("is-jumping");
                    window.requestAnimationFrame(function () {
                        window.requestAnimationFrame(function () {
                            card.classList.remove("is-jumping");
                        });
                    });
                }
            });
            status.textContent =
                "第 " + (active + 1) + " / " + n + " 張";
            dotButtons.forEach(function (dot, i) {
                var on = i === active;
                dot.classList.toggle("is-active", on);
                dot.setAttribute("aria-selected", on ? "true" : "false");
            });
        }

        function goTo(index) {
            var n = cards.length;
            var nextIndex = ((index % n) + n) % n;
            if (nextIndex === active) return;
            unflipAll();
            var from = active;
            active = nextIndex;
            sync(from);
        }

        function go(delta) {
            goTo(active + delta);
        }

        function toggleActiveFlip() {
            var card = cards[active];
            var flipped = card.classList.toggle("is-flipped");
            card.setAttribute("aria-pressed", flipped ? "true" : "false");
        }

        cards.forEach(function (card, index) {
            card.addEventListener("click", function () {
                if (ignoreClick) {
                    ignoreClick = false;
                    return;
                }
                if (index === active) {
                    toggleActiveFlip();
                    return;
                }
                goTo(index);
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
            } else if (event.key === "Enter" || event.key === " ") {
                if (
                    event.target === root ||
                    (event.target.classList &&
                        event.target.classList.contains("content-flip__card"))
                ) {
                    event.preventDefault();
                    toggleActiveFlip();
                }
            }
        });

        stage.addEventListener("pointerdown", function (event) {
            if (event.button != null && event.button !== 0) return;
            pointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            swiping = false;
            ignoreClick = false;
        });

        stage.addEventListener("pointermove", function (event) {
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

        stage.addEventListener("pointerup", endPointer);
        stage.addEventListener("pointercancel", endPointer);

        function layout() {
            measureHeight();
            sync();
        }

        if (typeof ResizeObserver === "function") {
            var ro = new ResizeObserver(layout);
            ro.observe(stage);
        } else {
            window.addEventListener("resize", layout);
        }

        layout();
    }

    document.querySelectorAll(".content-flip").forEach(initFlip);
})();
