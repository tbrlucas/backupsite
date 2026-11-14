(() => {
  const list = document.getElementById("downloads-list");
  const search = document.getElementById("download-search");
  const platform = document.getElementById("download-platform");
  const count = document.getElementById("downloads-count");
  const empty = document.getElementById("downloads-empty");
  let items = [];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function render() {
    const q = search.value.trim().toLowerCase();
    const p = platform.value;
    const filtered = items.filter(item => item.published === true &&
      (!p || item.platform === p) &&
      (!q || [item.title,item.description,item.platform,item.compatibility,item.version].join(" ").toLowerCase().includes(q)));
    count.textContent = filtered.length + (filtered.length === 1 ? " download" : " downloads");
    empty.hidden = filtered.length !== 0;
    list.innerHTML = filtered.map(item => `<article class="download-card">
      <div class="download-card-top"><span class="download-platform">${esc(item.platform)}</span><span class="download-version">${item.version ? "Version " + esc(item.version) : "Application"}</span></div>
      <h2>${esc(item.title)}</h2><p class="download-description">${esc(item.description)}</p>
      <div class="download-meta">${item.compatibility ? "<p><strong>Compatibility:</strong> " + esc(item.compatibility) + "</p>" : ""}
      ${item.fileSize ? "<p><strong>File size:</strong> " + esc(item.fileSize) + "</p>" : ""}
      ${item.fileType ? "<p><strong>File:</strong> " + esc(item.fileType) + "</p>" : ""}</div>
      ${item.notes ? "<p class='download-notes'>" + esc(item.notes) + "</p>" : ""}
      <a class="btn btn-primary download-button" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Download <span aria-hidden="true">↗</span></a>
    </article>`).join("");
  }
  search.addEventListener("input",render);
  platform.addEventListener("change",render);
  fetch("/assets/data/downloads.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("Could not load downloads");return r.json();})
    .then(data=>{items=Array.isArray(data.downloads)?data.downloads:[];render();})
    .catch(()=>{count.textContent="Downloads could not be loaded.";list.innerHTML="<p class='post-empty'>Please try again later.</p>";});
})();