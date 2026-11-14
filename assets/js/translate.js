/* Brazilian Portuguese translation powered by Google Website Translator. */
(() => {
  const button = document.getElementById("translate-ptbr");
  if (!button) return;

  const widget = document.createElement("div");
  widget.id = "google_translate_element";
  widget.className = "google-translate-hidden";
  widget.setAttribute("aria-hidden", "true");
  document.body.appendChild(widget);

  let widgetReady = false;
  let loading = false;

  window.googleTranslateElementInit = () => {
    if (!window.google || !window.google.translate) return;
    new window.google.translate.TranslateElement({
      pageLanguage: "en",
      includedLanguages: "pt",
      autoDisplay: false
    }, "google_translate_element");
    widgetReady = true;
  };

  function loadTranslator() {
    if (loading || widgetReady) return;
    loading = true;
    const script = document.createElement("script");
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onerror = () => {
      loading = false;
      button.title = "Google Translate could not be loaded. Check your connection and try again.";
    };
    document.head.appendChild(script);
  }

  function applyLanguage(attempt = 0) {
    const combo = document.querySelector(".goog-te-combo");
    if (!combo) {
      if (attempt < 32) {
        window.setTimeout(() => applyLanguage(attempt + 1), 250);
      } else {
        button.title = "The translation service did not respond. Please try again.";
      }
      return;
    }

    const target = combo.value === "pt" ? "" : "pt";
    combo.value = target;
    const event = document.createEvent("HTMLEvents");
    event.initEvent("change", true, true);
    combo.dispatchEvent(event);
    button.setAttribute("aria-pressed", target === "pt" ? "true" : "false");
    button.title = target === "pt" ? "Show the original English page" : "Translate into Brazilian Portuguese";
  }

  button.addEventListener("click", event => {
    event.preventDefault();
    loadTranslator();
    applyLanguage();
  });
})();
