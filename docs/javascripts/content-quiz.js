/**
 * Content quizzes for flipped-classroom notes.
 *
 * Modes (data-mode on .content-quiz):
 *   - reflect (default): soft「值得思考」notes; no correct/incorrect marking
 *   - review: comprehension check; each .content-quiz__item needs data-correct
 *
 * Author a full bank in markdown; JS samples data-sample-size items (default 3),
 * shuffles each sampled item's option order (relabeling A/B/C…), and presents
 * questions one-at-a-time with 上一題／下一題. Authoring indices in
 * data-correct / data-choice stay stable; only presentation order is random.
 */
(function () {
    function shuffle(items) {
        var arr = Array.prototype.slice.call(items);
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    }

    function showReflection(reflections, choiceIndex, labelText) {
        reflections.forEach(function (r) {
            var match = r.getAttribute("data-choice") === String(choiceIndex);
            r.hidden = !match;
            r.classList.toggle("is-visible", match);
            if (match && labelText) {
                var strong = r.querySelector("strong");
                if (strong) strong.textContent = labelText;
            }
        });
    }

    function choiceIndex(choice, fallback) {
        var raw = choice.getAttribute("data-choice-index");
        var index = parseInt(raw, 10);
        return isNaN(index) ? fallback : index;
    }

    function shuffleChoices(item) {
        var container = item.querySelector(".content-quiz__choices");
        if (!container) return;

        var choices = Array.prototype.slice.call(
            container.querySelectorAll(".content-quiz__choice")
        );
        if (choices.length < 2) return;

        choices.forEach(function (choice, index) {
            choice.setAttribute("data-choice-index", String(index));
        });

        shuffle(choices).forEach(function (choice, index) {
            container.appendChild(choice);
            var label = choice.querySelector(".content-quiz__choice-label");
            if (label) {
                label.textContent = String.fromCharCode(65 + index);
            }
        });
    }

    function bindChoices(item, mode) {
        var choices = item.querySelectorAll(".content-quiz__choice");
        var reflections = item.querySelectorAll(".content-quiz__reflection");
        var isReview = mode === "review";
        var correctIndex = isReview
            ? parseInt(item.getAttribute("data-correct"), 10)
            : NaN;
        var answered = false;

        if (
            isReview &&
            (isNaN(correctIndex) ||
                correctIndex < 0 ||
                correctIndex >= choices.length)
        ) {
            console.warn(
                "content-quiz: review item missing valid data-correct",
                item
            );
            return;
        }

        choices.forEach(function (choice, visualIndex) {
            choice.addEventListener("click", function () {
                if (isReview && answered) return;
                if (isReview) answered = true;

                var selectedIndex = choiceIndex(choice, visualIndex);

                choices.forEach(function (c, i) {
                    var originalIndex = choiceIndex(c, i);
                    var selected = c === choice;
                    c.classList.toggle("is-selected", selected);
                    c.setAttribute("aria-pressed", selected ? "true" : "false");
                    if (isReview) {
                        c.disabled = true;
                        c.classList.toggle(
                            "is-correct",
                            originalIndex === correctIndex
                        );
                        c.classList.toggle(
                            "is-incorrect",
                            selected && originalIndex !== correctIndex
                        );
                    }
                });

                var label = null;
                if (isReview) {
                    label =
                        selectedIndex === correctIndex ? "答對了" : "再看一下";
                }
                showReflection(reflections, selectedIndex, label);
            });
        });
    }

    function createNav() {
        var nav = document.createElement("div");
        nav.className = "content-quiz__nav";

        var prev = document.createElement("button");
        prev.type = "button";
        prev.className = "content-quiz__nav-btn";
        prev.textContent = "上一題";

        var status = document.createElement("span");
        status.className = "content-quiz__nav-status";
        status.setAttribute("aria-live", "polite");

        var next = document.createElement("button");
        next.type = "button";
        next.className = "content-quiz__nav-btn";
        next.textContent = "下一題";

        nav.appendChild(prev);
        nav.appendChild(status);
        nav.appendChild(next);

        return { nav: nav, prev: prev, next: next, status: status };
    }

    function initQuiz(quiz) {
        var allItems = quiz.querySelectorAll(".content-quiz__item");
        if (!allItems.length) return;

        var mode = quiz.getAttribute("data-mode") || "reflect";
        var sampleSize = parseInt(quiz.getAttribute("data-sample-size"), 10);
        if (isNaN(sampleSize) || sampleSize < 1) sampleSize = 3;

        var selected = shuffle(allItems).slice(
            0,
            Math.min(sampleSize, allItems.length)
        );
        var current = 0;

        allItems.forEach(function (item) {
            item.hidden = true;
            item.classList.remove("is-active");
        });

        selected.forEach(function (item, index) {
            shuffleChoices(item);
            bindChoices(item, mode);
            var num = item.querySelector(".content-quiz__num");
            if (num) num.textContent = String(index + 1);
        });

        var controls = createNav();
        quiz.appendChild(controls.nav);

        function show(index) {
            selected[current].hidden = true;
            selected[current].classList.remove("is-active");

            current = index;
            selected[current].hidden = false;
            selected[current].classList.add("is-active");

            controls.status.textContent =
                "第 " + (current + 1) + " / " + selected.length + " 題";
            controls.prev.disabled = current === 0;
            controls.next.disabled = current === selected.length - 1;
        }

        controls.prev.addEventListener("click", function () {
            if (current > 0) show(current - 1);
        });
        controls.next.addEventListener("click", function () {
            if (current < selected.length - 1) show(current + 1);
        });

        show(0);
    }

    document.querySelectorAll(".content-quiz").forEach(initQuiz);
})();