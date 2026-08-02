/**
 * Segmented content panels for class notes.
 *
 * Markup:
 *   <div class="content-panels" data-label="可選的 tablist 名稱">
 *     <p class="content-panels__intro">...</p>   <!-- optional -->
 *     <div class="content-panels__panel" data-label="背景">...</div>
 *     <div class="content-panels__panel" data-label="人物">...</div>
 *   </div>
 *
 * Optional: data-style="steps" numbers the tabs (觀察 → 解釋 → …).
 */
(function () {
    function panelChildren(root) {
        var panels = [];
        for (var i = 0; i < root.children.length; i++) {
            var child = root.children[i];
            if (child.classList && child.classList.contains("content-panels__panel")) {
                panels.push(child);
            }
        }
        return panels;
    }

    function uid(prefix) {
        return (
            prefix +
            "-" +
            Math.random().toString(36).slice(2, 9)
        );
    }

    function initPanels(root) {
        var panels = panelChildren(root);
        if (panels.length < 2) return;
        if (root.getAttribute("data-panels-ready") === "true") return;
        root.setAttribute("data-panels-ready", "true");

        var isSteps = root.getAttribute("data-style") === "steps";
        var tablist = document.createElement("div");
        tablist.className = "content-panels__tabs";
        tablist.setAttribute("role", "tablist");
        var groupLabel = root.getAttribute("data-label");
        if (groupLabel) tablist.setAttribute("aria-label", groupLabel);

        var tabs = [];

        function activate(index) {
            panels.forEach(function (panel, i) {
                var active = i === index;
                panel.hidden = !active;
                panel.classList.toggle("is-active", active);
            });
            tabs.forEach(function (tab, i) {
                var active = i === index;
                tab.classList.toggle("is-active", active);
                tab.setAttribute("aria-selected", active ? "true" : "false");
                tab.tabIndex = active ? 0 : -1;
            });
        }

        function panelIndexForHash() {
            var hash = window.location.hash;
            if (!hash || hash.length < 2) return null;
            var target = document.getElementById(hash.slice(1));
            if (!target) return null;
            for (var i = 0; i < panels.length; i++) {
                if (panels[i].contains(target)) return i;
            }
            return null;
        }

        function activateFromHash() {
            var idx = panelIndexForHash();
            if (idx !== null) activate(idx);
        }

        panels.forEach(function (panel, index) {
            var label =
                panel.getAttribute("data-label") || "選項 " + (index + 1);
            var tabId = uid("content-panels-tab");
            var panelId = panel.id || uid("content-panels-panel");

            panel.id = panelId;
            panel.setAttribute("role", "tabpanel");
            panel.setAttribute("aria-labelledby", tabId);
            panel.hidden = index !== 0;
            panel.classList.toggle("is-active", index === 0);

            var tab = document.createElement("button");
            tab.type = "button";
            tab.className = "content-panels__tab";
            tab.setAttribute("role", "tab");
            tab.id = tabId;
            tab.setAttribute("aria-controls", panelId);
            tab.setAttribute(
                "aria-selected",
                index === 0 ? "true" : "false"
            );
            tab.tabIndex = index === 0 ? 0 : -1;
            if (index === 0) tab.classList.add("is-active");

            if (isSteps) {
                var num = document.createElement("span");
                num.className = "content-panels__tab-num";
                num.textContent = String(index + 1);
                var text = document.createElement("span");
                text.className = "content-panels__tab-text";
                text.textContent = label;
                tab.appendChild(num);
                tab.appendChild(text);
            } else {
                tab.textContent = label;
            }

            tab.addEventListener("click", function () {
                activate(index);
            });

            tab.addEventListener("keydown", function (event) {
                var next = null;
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    next = (index + 1) % tabs.length;
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    next = (index - 1 + tabs.length) % tabs.length;
                } else if (event.key === "Home") {
                    next = 0;
                } else if (event.key === "End") {
                    next = tabs.length - 1;
                }
                if (next === null) return;
                event.preventDefault();
                activate(next);
                tabs[next].focus();
            });

            tabs.push(tab);
            tablist.appendChild(tab);
        });

        var firstPanel = panels[0];
        root.insertBefore(tablist, firstPanel);

        activateFromHash();
        window.addEventListener("hashchange", activateFromHash);
    }

    document.querySelectorAll(".content-panels").forEach(initPanels);
})();