(function () {
  "use strict";
  var root = document.documentElement;
  var storageKey = "tbrlucas-theme";
  function readTheme() {
    try { return localStorage.getItem(storageKey); } catch (error) { return null; }
  }
  function applyTheme(theme) {
    var dark = theme === "dark";
    root.setAttribute("data-theme", dark ? "dark" : "light");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#151c26" : "#4f7fbf");
    var button = document.getElementById("theme-toggle");
    if (button) {
      button.textContent = dark ? "☀️ Light mode" : "🌙 Dark mode";
      button.setAttribute("aria-pressed", dark ? "true" : "false");
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    }
  }
  applyTheme(readTheme() === "dark" ? "dark" : "light");
  function installToggle() {
    var nav = document.querySelector(".site-header .nav-collapse ul.nav");
    if (!nav || document.getElementById("theme-toggle")) return;
    var item = document.createElement("li");
    item.className = "theme-toggle-item";
    var button = document.createElement("button");
    button.type = "button";
    button.id = "theme-toggle";
    button.className = "theme-toggle-button";
    button.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      try { localStorage.setItem(storageKey, next); } catch (error) {}
      applyTheme(next);
    });
    item.appendChild(button);
    nav.appendChild(item);
    applyTheme(root.getAttribute("data-theme"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installToggle);
  else installToggle();
})();