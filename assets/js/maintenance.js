(() => {
  const reveal = () => document.documentElement.classList.remove("maintenance-checking");
  const escapeHtml = value => String(value || "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  fetch("/assets/data/maintenance.json?v=1", {cache:"no-store"})
    .then(response => { if (!response.ok) throw new Error("Maintenance settings unavailable"); return response.json(); })
    .then(settings => {
      if (settings.enabled !== true) { reveal(); return; }
      document.title = "Under Maintenance :: tbrlucas";
      document.body.className = "maintenance-screen";
      document.body.innerHTML = `
        <main class="maintenance-card">
          <div class="maintenance-mark" aria-hidden="true">t</div>
          <h1>Hello!</h1>
          <p>I know you're interested in seeing the site, but you won't be able to... at least not right now. We're currently undergoing maintenance.</p>
          <p><strong>Please come back soon!</strong></p>
          <section class="maintenance-highlight">
            <p><strong>Estimated time for the end of maintenance:</strong><br>${escapeHtml(settings.eta || "To be announced")}</p>
            <p><strong>Reason:</strong><br>${escapeHtml(settings.reason || "Not specified")}</p>
          </section>
          <div class="maintenance-footer">TBRLUCAS · TEMPORARILY UNAVAILABLE</div>
        </main>`;
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/assets/css/style.css?v=20261115-maintenance";
      stylesheet.addEventListener("load", reveal, {once:true});
      stylesheet.addEventListener("error", reveal, {once:true});
      document.head.appendChild(stylesheet);
    })
    .catch(reveal);
})();