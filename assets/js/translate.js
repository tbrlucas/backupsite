/* GTranslate free website widget: English to Brazilian Portuguese. */
(() => {
  const wrapper = document.querySelector(".gtranslate_wrapper");
  if (!wrapper) return;

  window.gtranslateSettings = {
    default_language: "en",
    languages: ["en", "pt"],
    wrapper_selector: ".gtranslate_wrapper",
    flag_size: 16,
    alt_flags: { pt: "brazil" }
  };

  const script = document.createElement("script");
  script.src = "https://cdn.gtranslate.net/widgets/latest/dropdown.js";
  script.defer = true;
  script.onerror = () => {
    wrapper.textContent = "Translation unavailable";
    wrapper.setAttribute("title", "The translation service could not be loaded. Check your connection.");
  };
  document.head.appendChild(script);
})();
