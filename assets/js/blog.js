(() => {
  const featured = document.getElementById("blog-featured");
  const archive = document.getElementById("blog-archive");
  const archiveSection = document.getElementById("older-posts-section");
  const count = document.getElementById("blog-post-count");
  const article = document.getElementById("post-content");
  const homeList = document.getElementById("home-post-list");
  if (!featured && !archive && !article && !homeList) return;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const formatDate = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return escapeHtml(value || "");
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
      .toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric", timeZone:"UTC"});
  };
  const postUrl = (post) => "/blog/post.html?slug=" + encodeURIComponent(post.slug || "");
  const cardMarkup = (post, featuredCard = false) => `
    <article class="blog-card${featuredCard ? " blog-card-featured" : ""}">
      <div class="blog-card-meta"><span>${formatDate(post.date)}</span><span>Article</span></div>
      <h3><a href="${postUrl(post)}">${escapeHtml(post.title || "Untitled")}</a></h3>
      <p>${escapeHtml(post.excerpt || "")}</p>
      <a class="blog-read-link" href="${postUrl(post)}">Read article <span aria-hidden="true">→</span></a>
    </article>`;

  fetch("/assets/data/posts.json?v=20261115-1", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Could not load the posts file.");
      return response.json();
    })
    .then((data) => {
      const posts = (Array.isArray(data.posts) ? data.posts : [])
        .filter((post) => post.published !== false)
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

      if (count) count.textContent = posts.length + (posts.length === 1 ? " published post" : " published posts");
      if (featured) {
        featured.innerHTML = posts.length
          ? cardMarkup(posts[0], true)
          : '<p class="post-empty">There are no published posts yet. Check back soon!</p>';
      }
      if (archive && archiveSection) {
        const older = posts.slice(1);
        archiveSection.hidden = older.length === 0;
        archive.innerHTML = older.map((post) => cardMarkup(post)).join("");
      }
      if (homeList) {
        const latest = posts.slice(0, 3);
        homeList.innerHTML = latest.length
          ? latest.map((post) => cardMarkup(post)).join("")
          : '<p class="post-empty">There are no published posts yet. Check back soon!</p>';
      }

      if (article) {
        const slug = new URLSearchParams(location.search).get("slug");
        const post = posts.find((item) => item.slug === slug);
        if (!post) {
          article.innerHTML = '<div class="copy-panel"><h1>Post not found</h1><p>This post may have been moved or is not published.</p></div>';
          return;
        }
        const paragraphs = String(post.content || "").split(/\n\s*\n/).map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`).join("");
        article.innerHTML = `<div class="copy-panel"><p class="blog-list-meta">${formatDate(post.date)}</p><h1>${escapeHtml(post.title || "Untitled")}</h1><p class="article-excerpt">${escapeHtml(post.excerpt || "")}</p>${paragraphs}</div>`;
        document.title = `tbrlucas :: ${post.title || "blog post"}`;
      }
    })
    .catch(() => {
      const message = '<p class="post-empty">Posts are temporarily unavailable.</p>';
      if (featured) featured.innerHTML = message;
      if (archive) archive.innerHTML = "";
      if (count) count.textContent = "Posts unavailable";
      if (article) article.innerHTML = message;
      if (homeList) homeList.innerHTML = message;
    });
})();