// 練習經文對照頁（lesson 4）：滑鼠移到英文或希臘文的字上，
// 同一個對照組（data-g）的字會一起亮起。
(function () {
  function setHighlight(g, on) {
    document
      .querySelectorAll('.strongs-verse [data-g="' + g + '"]')
      .forEach(function (el) {
        el.classList.toggle("strongs-hl", on);
      });
  }

  function wire() {
    document.querySelectorAll(".strongs-verse [data-g]").forEach(function (el) {
      var g = el.getAttribute("data-g");
      el.addEventListener("mouseenter", function () {
        setHighlight(g, true);
      });
      el.addEventListener("mouseleave", function () {
        setHighlight(g, false);
      });
      el.addEventListener("click", function () {
        setHighlight(g, true);
      }); // touch: tap to light up
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
