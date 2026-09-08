document.querySelectorAll(".expandable-card").forEach(function (card) {
    var header = card.querySelector(".expandable-card__header");
    if (!header) return;
    header.addEventListener("click", function () {
        card.classList.toggle("is-open");
        header.setAttribute(
            "aria-expanded",
            card.classList.contains("is-open")
        );
    });
});
