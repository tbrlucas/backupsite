(() => {
  const target = document.getElementById("whats-new-list");
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const formatDate = value => {
    const parts = String(value || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return value || "";
    return new Intl.DateTimeFormat("en", {year:"numeric",month:"long",day:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(parts[0],parts[1]-1,parts[2])));
  };
  fetch("/assets/data/whats-new.json?v=1", {cache:"no-store"})
    .then(response => { if (!response.ok) throw new Error("Could not load updates."); return response.json(); })
    .then(data => {
      const updates = (Array.isArray(data.updates) ? data.updates : [])
        .filter(item => item && item.published === true)
        .sort((a,b) => (String(b.date)+String(b.time)).localeCompare(String(a.date)+String(a.time)));
      if (!updates.length) {
        target.innerHTML = '<div class="whats-new-empty">There are no updates yet. Check back soon!</div>';
        return;
      }
      const groups = new Map();
      updates.forEach(item => {
        const year = String(item.date || "").slice(0,4) || "Earlier";
        if (!groups.has(year)) groups.set(year,[]);
        groups.get(year).push(item);
      });
      target.innerHTML = Array.from(groups.entries()).map(([year,items]) =>
        '<section class="whats-new-group"><h2 class="whats-new-year">'+escapeHtml(year)+'</h2><div class="whats-new-list">'+items.map(item =>
          '<article class="whats-new-entry"><div class="whats-new-entry-head"><time datetime="'+escapeHtml(item.date)+'T'+escapeHtml(item.time || "00:00")+'">'+escapeHtml(formatDate(item.date))+(item.time ? ' · '+escapeHtml(item.time) : '')+'</time><span class="whats-new-tag">'+escapeHtml(item.category)+'</span><span class="whats-new-type">'+escapeHtml(item.type)+'</span></div><h2>'+escapeHtml(item.title)+'</h2><p>'+escapeHtml(item.summary)+'</p>'+(item.details ? '<p class="whats-new-details">'+escapeHtml(item.details)+'</p>' : '')+'</article>'
        ).join("")+'</div></section>'
      ).join("");
    })
    .catch(() => { target.innerHTML = '<div class="whats-new-empty">Updates are temporarily unavailable. Please try again later.</div>'; });
})();