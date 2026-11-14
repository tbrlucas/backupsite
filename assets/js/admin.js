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
    if (options.body) headers.set("Content-Type", "application/json");
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
    try {
      const identity = await api("/api/session");
      loginMessage("");
      show(login, false); show(app, true);
      $("admin-user").textContent = `Signed in as @${identity.login}`;
      await loadPosts();
    } catch (error) {
      sessionStorage.removeItem(sessionKey);
      session = "";
      show(login, true); show(app, false);
      loginMessage(error.message);
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

  boot();
})();
