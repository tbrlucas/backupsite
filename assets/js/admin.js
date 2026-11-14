(() => {
  const config = window.TBRLUCAS_ADMIN_CONFIG || {};
  const apiBase = String(config.apiBase || "").replace(/\/$/, "");
  const $ = (id) => document.getElementById(id);
  const setup = $("admin-setup");
  const login = $("admin-login");
  const app = $("admin-app");
  const sessionKey = "tbrlucas_admin_session";
  let session = sessionStorage.getItem(sessionKey) || "";
  let posts = [];

  const show = (element, visible) => { if (element) element.hidden = !visible; };
  const message = (text, isError = false) => {
    const target = $("admin-message");
    if (!target) return;
    target.textContent = text;
    target.className = isError ? "admin-message error" : "admin-message";
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const loginMessage = (text = "") => { const target = $("admin-login-message"); if (target) target.textContent = text; };
  const localDate = () => { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const slugify = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80).replace(/-+$/g, "");

  async function api(path, options = {}) {
    if (!apiBase) throw new Error("The administration API URL has not been configured.");
    const headers = new Headers(options.headers || {});
    if (session) headers.set("Authorization", `Bearer ${session}`);
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const response = await fetch(apiBase + path, { ...options, headers, mode: "cors" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }

  function renderPosts() {
    const target = $("admin-post-list");
    if (!posts.length) {
      target.innerHTML = '<p class="post-empty">No posts yet. Create your first publication.</p>';
      return;
    }
    target.innerHTML = posts.slice().sort((a,b) => String(b.date).localeCompare(String(a.date))).map(post =>
      `<button class="admin-post-row" type="button" data-slug="${escapeHtml(post.slug)}">
        <strong>${escapeHtml(post.title)}</strong>
        <span>${escapeHtml(post.date || "")} · ${post.published ? "Published" : "Draft"}</span>
      </button>`
    ).join("");
    target.querySelectorAll("[data-slug]").forEach(button => {
      button.addEventListener("click", () => editPost(button.dataset.slug));
    });
  }

  function clearEditor() {
    $("post-editor").reset();
    $("post-original-slug").value = "";
    $("post-date").value = localDate();
    $("post-published").checked = true;
    $("delete-post-button").hidden = true;
    $("save-post-button").textContent = "Save publication";
    message("");
  }

  function editPost(slug) {
    const post = posts.find(item => item.slug === slug);
    if (!post) return;
    $("post-original-slug").value = post.slug;
    $("post-title").value = post.title || "";
    $("post-slug").value = post.slug || "";
    $("post-date").value = post.date || "";
    $("post-excerpt").value = post.excerpt || "";
    $("post-content").value = post.content || "";
    $("post-published").checked = post.published !== false;
    $("delete-post-button").hidden = false;
    $("save-post-button").textContent = "Update publication";
    message("");
    if (window.matchMedia("(max-width: 760px)").matches) $("post-editor").scrollIntoView({behavior:"smooth"});
  }

  async function loadPosts() {
    message("Loading publications…");
    const data = await api("/api/posts");
    posts = Array.isArray(data.posts) ? data.posts : [];
    renderPosts();
    message("Publications loaded.");
  }

  async function boot() {
    if (!apiBase) {
      $("admin-setup-detail").textContent = "Missing API URL. Deploy admin-worker/worker.js, then set apiBase in assets/js/admin-config.js.";
      show(setup, true); show(login, false); show(app, false);
      return;
    }
    show(setup, false);
    if (!session) { loginMessage(""); show(login, true); show(app, false); return; }
    let identity;
    try {
      identity = await api("/api/session");
    } catch (error) {
      sessionStorage.removeItem(sessionKey);
      session = "";
      show(login, true); show(app, false);
      loginMessage(error.message);
      return;
    }
    loginMessage("");
    show(login, false); show(app, true);
    $("admin-user").textContent = `Signed in as @${identity.login}`;
    try {
      await loadPosts();
    } catch (error) {
      message("Could not load blog posts: " + error.message, true);
    }
  }

  const fragment = new URLSearchParams(location.hash.slice(1));
  const receivedSession = fragment.get("session");
  if (receivedSession) {
    session = receivedSession;
    sessionStorage.setItem(sessionKey, session);
    history.replaceState(null, "", location.pathname + location.search);
  }

  $("login-button").addEventListener("click", () => {
    loginMessage("");
    if (!apiBase) return;
    location.href = apiBase + "/auth/login";
  });

  $("logout-button").addEventListener("click", async () => {
    try { await api("/api/logout", { method: "POST" }); } catch (_) {}
    sessionStorage.removeItem(sessionKey);
    session = "";
    show(app, false); show(login, true);
  });

  $("new-post-button").addEventListener("click", clearEditor);
  $("cancel-edit-button").addEventListener("click", clearEditor);
  $("post-title").addEventListener("input", () => {
    if (!$("post-original-slug").value) $("post-slug").value = slugify($("post-title").value);
  });

  $("post-editor").addEventListener("submit", async (event) => {
    event.preventDefault();
    const post = {
      slug: $("post-slug").value.trim(),
      title: $("post-title").value.trim(),
      date: $("post-date").value,
      excerpt: $("post-excerpt").value.trim(),
      content: $("post-content").value.trim(),
      published: $("post-published").checked
    };
    try {
      $("save-post-button").disabled = true;
      message("Saving to GitHub…");
      const originalSlug = $("post-original-slug").value.trim();
      const data = await api("/api/posts", { method: "POST", body: JSON.stringify({ action:"save", originalSlug, post }) });
      posts = data.posts;
      renderPosts();
      $("post-original-slug").value = post.slug;
      $("delete-post-button").hidden = false;
      $("save-post-button").textContent = "Update publication";
      message("Saved and committed to GitHub.");
    } catch (error) { message(error.message, true); }
    finally { $("save-post-button").disabled = false; }
  });

  $("delete-post-button").addEventListener("click", async () => {
    const slug = $("post-original-slug").value;
    if (!slug || !confirm("Delete this publication? This change will be committed to GitHub.")) return;
    try {
      $("delete-post-button").disabled = true;
      message("Deleting from GitHub…");
      const data = await api("/api/posts", { method:"POST", body:JSON.stringify({action:"delete", slug}) });
      posts = data.posts;
      renderPosts();
      clearEditor();
      message("Publication deleted.");
    } catch (error) { message(error.message, true); }
    finally { $("delete-post-button").disabled = false; }
  });


  let downloads = [];
  const downloadMessage = (text, isError = false) => {
    const target = $("download-message");
    if (!target) return;
    target.textContent = text;
    target.className = isError ? "admin-message error" : "admin-message";
  };
  function renderDownloads() {
    const target = $("admin-download-list");
    if (!target) return;
    if (!downloads.length) { target.innerHTML = '<p class="post-empty">No downloads yet. Add the first one.</p>'; return; }
    target.innerHTML = downloads.slice().sort((a,b) => String(a.title).localeCompare(String(b.title))).map(item =>
      `<button class="admin-post-row" type="button" data-download-slug="${escapeHtml(item.slug)}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.platform)} · ${item.published ? "Published" : "Draft"}</span></button>`
    ).join("");
    target.querySelectorAll("[data-download-slug]").forEach(button => button.addEventListener("click", () => editDownload(button.dataset.downloadSlug)));
  }
  function clearDownloadEditor() {
    $("download-editor").reset();
    $("download-original-slug").value = "";
    $("download-published").checked = true;
    $("delete-download-button").hidden = true;
    $("save-download-button").textContent = "Save download";
    downloadMessage("");
  }
  function editDownload(slug) {
    const item = downloads.find(entry => entry.slug === slug);
    if (!item) return;
    $("download-original-slug").value = item.slug;
    $("download-title").value = item.title || "";
    $("download-slug").value = item.slug || "";
    $("download-platform").value = item.platform || "iOS";
    $("download-description").value = item.description || "";
    $("download-compatibility").value = item.compatibility || "";
    $("download-version").value = item.version || "";
    $("download-size").value = item.fileSize || "";
    $("download-type").value = item.fileType || "";
    $("download-url").value = item.url || "";
    $("download-notes").value = item.notes || "";
    $("download-published").checked = item.published === true;
    $("delete-download-button").hidden = false;
    $("save-download-button").textContent = "Update download";
    downloadMessage("");
    if (window.matchMedia("(max-width: 760px)").matches) $("download-editor").scrollIntoView({behavior:"smooth"});
  }
  async function loadDownloads() {
    const data = await api("/api/downloads");
    downloads = Array.isArray(data.downloads) ? data.downloads : [];
    renderDownloads();
  }

  $("upload-download-file").addEventListener("click", async () => {
    const fileInput = $("download-file");
    const file = fileInput.files && fileInput.files[0];
    if (!file) { $("download-upload-message").textContent = "Choose a file first."; return; }
    if (file.size > 100 * 1024 * 1024) { $("download-upload-message").textContent = "This file is larger than the 100 MB limit."; return; }
    const slug = $("download-slug").value.trim() || slugify($("download-title").value);
    if (!slug) { $("download-upload-message").textContent = "Enter the application name first."; return; }
    $("download-upload-message").textContent = "Uploading file to GitHub…";
    $("upload-download-file").disabled = true;
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("slug", slug);
      const result = await api("/api/upload", {method:"POST", body});
      $("download-url").value = result.url;
      $("download-size").value = result.fileSize;
      $("download-type").value = result.fileType;
      $("download-upload-message").textContent = "Uploaded and committed to GitHub. The download URL was filled in.";
    } catch (error) {
      $("download-upload-message").textContent = "Upload failed: " + error.message;
    } finally { $("upload-download-file").disabled = false; }
  });

  let updates = [];
  const updateMessage = (text, isError = false) => {
    const target = $("update-message");
    if (!target) return;
    target.textContent = text;
    target.className = isError ? "admin-message error" : "admin-message";
  };
  function renderUpdates() {
    const target = $("admin-update-list");
    if (!target) return;
    if (!updates.length) { target.innerHTML = '<p class="post-empty">No updates yet. Create the first one.</p>'; return; }
    target.innerHTML = updates.slice().sort((a,b) => (String(b.date)+String(b.time)).localeCompare(String(a.date)+String(a.time))).map(item =>
      `<button class="admin-post-row" type="button" data-update-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.date)} · ${escapeHtml(item.category)} · ${item.published ? "Published" : "Draft"}</span></button>`
    ).join("");
    target.querySelectorAll("[data-update-id]").forEach(button => button.addEventListener("click", () => editUpdate(button.dataset.updateId)));
  }
  function clearUpdateEditor() {
    $("update-editor").reset();
    $("update-original-id").value = "";
    $("update-date").value = localDate();
    $("update-time").value = new Date().toTimeString().slice(0,5);
    $("update-published").checked = true;
    $("delete-update-button").hidden = true;
    $("save-update-button").textContent = "Save update";
    updateMessage("");
  }
  function editUpdate(id) {
    const item = updates.find(entry => entry.id === id);
    if (!item) return;
    $("update-original-id").value = item.id;
    $("update-title").value = item.title || "";
    $("update-date").value = item.date || "";
    $("update-time").value = item.time || "12:00";
    $("update-category").value = item.category || "Website";
    $("update-type").value = item.type || "Improvement";
    $("update-summary").value = item.summary || "";
    $("update-details").value = item.details || "";
    $("update-published").checked = item.published === true;
    $("delete-update-button").hidden = false;
    $("save-update-button").textContent = "Update entry";
    updateMessage("");
    if (window.matchMedia("(max-width: 760px)").matches) $("update-editor").scrollIntoView({behavior:"smooth"});
  }
  async function loadUpdates() {
    const data = await api("/api/whats-new");
    updates = Array.isArray(data.updates) ? data.updates : [];
    renderUpdates();
  }
  $("show-posts-tab").addEventListener("click", () => {
    show($("admin-posts-section"), true); show($("admin-downloads-section"), false); show($("admin-whats-new-section"), false);
    $("show-posts-tab").classList.add("btn-primary"); $("show-downloads-tab").classList.remove("btn-primary"); $("show-whats-new-tab").classList.remove("btn-primary");
  });
  $("show-downloads-tab").addEventListener("click", () => {
    show($("admin-posts-section"), false); show($("admin-downloads-section"), true); show($("admin-whats-new-section"), false);
    $("show-downloads-tab").classList.add("btn-primary"); $("show-posts-tab").classList.remove("btn-primary"); $("show-whats-new-tab").classList.remove("btn-primary");
    if (!$("admin-download-list").dataset.loaded) {
      loadDownloads().then(() => $("admin-download-list").dataset.loaded = "1").catch(error => downloadMessage(error.message, true));
    }
  });
  $("show-whats-new-tab").addEventListener("click", () => {
    show($("admin-posts-section"), false); show($("admin-downloads-section"), false); show($("admin-whats-new-section"), true);
    $("show-whats-new-tab").classList.add("btn-primary"); $("show-posts-tab").classList.remove("btn-primary"); $("show-downloads-tab").classList.remove("btn-primary");
    if (!$("admin-update-list").dataset.loaded) {
      loadUpdates().then(() => $("admin-update-list").dataset.loaded = "1").catch(error => updateMessage(error.message, true));
    }
  });
  $("new-update-button").addEventListener("click", clearUpdateEditor);
  $("clear-update-button").addEventListener("click", clearUpdateEditor);
  $("update-editor").addEventListener("submit", async event => {
    event.preventDefault();
    const item = {
      id: $("update-original-id").value || (crypto.randomUUID ? crypto.randomUUID() : "update-" + Date.now()),
      title: $("update-title").value.trim(), date: $("update-date").value, time: $("update-time").value,
      category: $("update-category").value, type: $("update-type").value,
      summary: $("update-summary").value.trim(), details: $("update-details").value.trim(),
      published: $("update-published").checked
    };
    try {
      $("save-update-button").disabled = true; updateMessage("Saving to GitHub…");
      const data = await api("/api/whats-new", {method:"POST",body:JSON.stringify({action:"save",update:item})});
      updates = data.updates; renderUpdates();
      $("update-original-id").value = item.id;
      $("delete-update-button").hidden = false; $("save-update-button").textContent = "Update entry";
      $("admin-update-list").dataset.loaded = "1";
      updateMessage("Saved and committed to GitHub.");
    } catch (error) { updateMessage(error.message, true); }
    finally { $("save-update-button").disabled = false; }
  });
  $("delete-update-button").addEventListener("click", async () => {
    const id = $("update-original-id").value;
    if (!id || !confirm("Delete this update? This change will be committed to GitHub.")) return;
    try {
      $("delete-update-button").disabled = true; updateMessage("Deleting from GitHub…");
      const data = await api("/api/whats-new", {method:"POST",body:JSON.stringify({action:"delete",id})});
      updates = data.updates; renderUpdates(); clearUpdateEditor();
      updateMessage("Update deleted.");
    } catch (error) { updateMessage(error.message, true); }
    finally { $("delete-update-button").disabled = false; }
  });

  boot();
})();
