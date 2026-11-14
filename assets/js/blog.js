(() => {
  const list = document.getElementById("post-list");
  const article = document.getElementById("post-content");
  const homeList = document.getElementById("home-post-list");
  if (!list && !article && !homeList) return;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  fetch("/assets/data/posts.json")
    .then((response) => {
      if (!response.ok) throw new Error("Could not load the posts file.");
      return response.json();
    })
    .then((data) => {
      const posts = (Array.isArray(data.posts) ? data.posts : [])
        .filter((post) => post.published !== false)
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

      const itemMarkup = (post) => `<a class="blog-list-item" href="/blog/post.html?slug=${encodeURIComponent(post.slug || "")}">
        <span class="blog-list-title">${escapeHtml(post.title || "Untitled")}</span>
        <span class="blog-list-meta">${escapeHtml(post.date || "")}</span>
        <span class="blog-list-excerpt">${escapeHtml(post.excerpt || "")}</span>
      </a>`;

      if (list) {
        list.innerHTML = posts.length
          ? posts.map(itemMarkup).join("")
          : '<p class="post-empty">There are no published posts yet. Check back soon!</p>';
      }

      if (homeList) {
        const latest = posts.slice(0, 3);
        homeList.innerHTML = latest.length
          ? latest.map(itemMarkup).join("") + '<p class="post-empty"><a href="/blog/">View all blog posts →</a></p>'
          : '<p class="post-empty">New posts will appear here. Visit the <a href="/blog/">blog</a> to read all publications.</p>';
      }

      if (article) {
        const slug = new URLSearchParams(location.search).get("slug");
        const post = posts.find((item) => item.slug === slug);
        if (!post) {
          article.innerHTML = '<div class="copy-panel"><h1>Post not found</h1><p>This post may have been moved or is not published.</p></div>';
          return;
        }
        const paragraphs = String(post.content || "").split(/\n\s*\n/).map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`).join("");
        article.innerHTML = `<div class="copy-panel"><p class="blog-list-meta">${escapeHtml(post.date || "")}</p><h1>${escapeHtml(post.title || "Untitled")}</h1><p class="article-excerpt">${escapeHtml(post.excerpt || "")}</p>${paragraphs}</div>`;
        document.title = `tbrlucas :: ${post.title || "blog post"}`;
      }
    })
    .catch(() => {
      const message = '<p class="post-empty">Posts are temporarily unavailable.</p>';
      if (list) list.innerHTML = message;
      if (article) article.innerHTML = message;
      if (homeList) homeList.innerHTML = message;
    });
})();
