/**
 * Paginated content cards for class notes (quiz-style flip-through).
 *
 * Markup:
 *   <div class="content-deck" data-label="可選名稱">
 *     <p class="content-deck__intro">...</p>   <!-- optional -->
 *     <div class="content-deck__card" data-label="道德教訓">...</div>
 *     <div class="content-deck__card" data-label="人物塑造">...</div>
 *   </div>
 *
 * Shows one card at a time with 上一張／下一張. No sampling/shuffle.
 */
(function () {
    function cardChildren(root) {
        var cards = [];
        for (var i = 0; i < root.children.length; i++) {
            var child = root.children[i];
            if (child.classList && child.classList.contains("content-deck__card")) {
                cards.push(child);
            }
        }
        return cards;
    }

    function createNav() {
        var nav = document.createElement("div");
        nav.className = "content-deck__nav";

        var prev = document.createElement("button");
        prev.type = "button";
        prev.className = "content-deck__nav-btn";
        prev.textContent = "上一張";

        var status = document.createElement("span");
        status.className = "content-deck__nav-status";
        status.setAttribute("aria-live", "polite");

        var next = document.createElement("button");
        next.type = "button";
        next.className = "content-deck__nav-btn";
        next.textContent = "下一張";

        nav.appendChild(prev);
        nav.appendChild(status);
        nav.appendChild(next);

        return { nav: nav, prev: prev, next: next, status: status };
    }

    function initDeck(root) {
        var cards = cardChildren(root);
        if (cards.length < 2) return;
        if (root.getAttribute("data-deck-ready") === "true") return;
        root.setAttribute("data-deck-ready", "true");

        var current = 0;
        var controls = createNav();
        root.appendChild(controls.nav);

        var groupLabel = root.getAttribute("data-label");
        if (groupLabel) {
            root.setAttribute("role", "region");
            root.setAttribute("aria-label", groupLabel);
        }

        cards.forEach(function (card, index) {
            var label =
                card.getAttribute("data-label") || "卡片 " + (index + 1);
            card.setAttribute("aria-label", label);
            card.hidden = index !== 0;
            card.classList.toggle("is-active", index === 0);
        });

        function show(index) {
            cards[current].hidden = true;
            cards[current].classList.remove("is-active");

            current = index;
            cards[current].hidden = false;
            cards[current].classList.add("is-active");

            controls.status.textContent =
                "第 " + (current + 1) + " / " + cards.length + " 張";
            controls.prev.disabled = current === 0;
            controls.next.disabled = current === cards.length - 1;
        }

        controls.prev.addEventListener("click", function () {
            if (current > 0) show(current - 1);
        });
        controls.next.addEventListener("click", function () {
            if (current < cards.length - 1) show(current + 1);
        });

        root.addEventListener("keydown", function (event) {
            if (event.key === "ArrowLeft" && current > 0) {
                event.preventDefault();
                show(current - 1);
            } else if (
                event.key === "ArrowRight" &&
                current < cards.length - 1
            ) {
                event.preventDefault();
                show(current + 1);
            }
        });

        show(0);
    }

    document.querySelectorAll(".content-deck").forEach(initDeck);
})();
