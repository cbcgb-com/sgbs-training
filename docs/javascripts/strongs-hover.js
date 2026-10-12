// 練習經文對照頁（lesson 4）：hover 亮起對照組；點擊開啟右側史特朗字典面板。
(function () {
  var lexicon = null;
  var lexiconPromise = null;
  var panel = null;

  function setHighlight(g, on) {
    document
      .querySelectorAll('.strongs-verse [data-g="' + g + '"]')
      .forEach(function (el) {
        el.classList.toggle("strongs-hl", on);
      });
  }

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement("aside");
    panel.className = "strongs-panel";
    panel.setAttribute("aria-label", "史特朗號碼字典");
    panel.innerHTML =
      '<button type="button" class="strongs-panel-close" aria-label="關閉">×</button>' +
      '<div class="strongs-panel-body"></div>';
    document.body.appendChild(panel);
    panel
      .querySelector(".strongs-panel-close")
      .addEventListener("click", function () {
        panel.classList.remove("open");
      });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") panel.classList.remove("open");
    });
    return panel;
  }

  function loadLexicon() {
    if (lexicon) return Promise.resolve(lexicon);
    if (!lexiconPromise) {
      lexiconPromise = fetch("strongs-lexicon.json")
        .then(function (r) {
          return r.json();
        })
        .then(function (j) {
          lexicon = j;
          return j;
        });
    }
    return lexiconPromise;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderEntry(num, entry) {
    var kjv = (entry.kjv_def || "").split(", ").filter(Boolean);
    var html = '<p class="strongs-lemma"><strong>' + esc(entry.lemma) + "</strong> " +
      '<span class="strongs-translit">' + esc(entry.translit) + "</span> " +
      '<span class="strongs-badge">' + esc(num) + "</span></p>";
    if (entry.strongs_def) {
      html += '<p class="strongs-core-def">' + esc(entry.strongs_def) + "</p>";
    }
    if (kjv.length) {
      html += '<p class="strongs-senses-label">KJV 各處譯法：</p><ul class="strongs-senses">';
      kjv.forEach(function (s) {
        html += '<li class="strongs-sense">' + esc(s) + "</li>";
      });
      html += "</ul>";
    }
    if (entry.derivation) {
      html += '<p class="strongs-deriv">字源：' + esc(entry.derivation) + "</p>";
    }
    html += '<p class="strongs-link">深入查考：<a href="https://biblehub.com/greek/' +
      esc(num.replace(/^G/, "")) +
      '.htm" target="_blank" rel="noopener">BibleHub ' + esc(num) + "</a></p>";
    return html;
  }

  function openPanelFor(g) {
    var p = ensurePanel();
    var body = p.querySelector(".strongs-panel-body");
    var enEls = document.querySelectorAll(
      '.strongs-verse .strongs-en[data-g="' + g + '"]'
    );
    var gkEls = document.querySelectorAll(
      '.strongs-verse .strongs-word[data-g="' + g + '"]'
    );
    var enWords = [];
    enEls.forEach(function (el) {
      enWords.push(el.textContent.trim());
    });
    var tokens = [];
    gkEls.forEach(function (el) {
      var numEl = el.querySelector(".strongs-num");
      var word = (el.childNodes[0] && el.childNodes[0].textContent) || "";
      tokens.push({ word: word.trim(), num: numEl ? numEl.textContent.trim() : null });
    });

    var html = "";
    if (enWords.length) {
      html += '<p class="strongs-panel-en">「' + esc(enWords.join(" ")) + '」</p>';
    }
    if (!tokens.length) {
      html += "<p>此字在希臘原文中沒有對應的字（譯文補充）。</p>";
      body.innerHTML = html;
      p.classList.add("open");
      return;
    }
    tokens.forEach(function (t) {
      html +=
        '<p class="strongs-token">' + esc(t.word) +
        (t.num ? ' <span class="strongs-badge">' + esc(t.num) + "</span>" : "") +
        "</p>";
    });
    html += '<p class="strongs-panel-loading">載入字典釋義…</p>';
    body.innerHTML = html;
    p.classList.add("open");
    loadLexicon().then(function (lex) {
      var detail = "";
      var seen = {};
      tokens.forEach(function (t) {
        if (!t.num || seen[t.num]) return;
        seen[t.num] = true;
        if (t.num === "G3588") {
          detail +=
            '<p class="strongs-article-note">ὁ / ἡ / τό（G3588）：定冠詞，語法功能詞，無獨立詞彙意義。</p>';
        } else if (lex[t.num]) {
          detail += renderEntry(t.num, lex[t.num]);
        } else {
          detail += "<p>" + esc(t.num) + "：字典資料缺。</p>";
        }
      });
      detail +=
        '<p class="strongs-exercise">這些譯法裏，哪一個最貼合這節經文？判斷留給你。</p>';
      var loading = body.querySelector(".strongs-panel-loading");
      if (loading) loading.outerHTML = detail;
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
        openPanelFor(g);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
