(() => {
  const postList = document.getElementById("blog-post-list");
  const count = document.getElementById("blog-post-count");
  const article = document.getElementById("post-content");
  const homeList = document.getElementById("home-post-list");
  if (!postList && !article && !homeList) return;

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

  // Small, safe Markdown-style renderer for the formatting supported by the blog editor.
  const renderInline = (value) => {
    let text = escapeHtml(value);
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    return text;
  };
  const renderContent = (value) => {
    const lines = String(value || "").replace(/\r/g, "").split("\n");
    const output = [];
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) { index++; continue; }

      const heading = /^(#{1,2})\s+(.+)$/.exec(line.trim());
      if (heading) {
        const tag = heading[1].length === 1 ? "h2" : "h3";
        output.push("<" + tag + ">" + renderInline(heading[2]) + "</" + tag + ">");
        index++;
        continue;
      }

      if (/^\s*-\s+/.test(line)) {
        const items = [];
        while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
          items.push("<li>" + renderInline(lines[index].replace(/^\s*-\s+/, "")) + "</li>");
          index++;
        }
        output.push("<ul>" + items.join("") + "</ul>");
        continue;
      }

      const paragraph = [];
      while (index < lines.length && lines[index].trim()
        && !/^(#{1,2})\s+/.test(lines[index].trim())
        && !/^\s*-\s+/.test(lines[index])) {
        paragraph.push(renderInline(lines[index]));
        index++;
      }
      output.push("<p>" + paragraph.join("<br>") + "</p>");
    }
    return output.join("\n");
  };

  const cardMarkup = (post) => {
    const market = post.design === "android-market-2012";
    return `
      <article class="blog-card${market ? " blog-card-market" : ""}">
        <div class="blog-card-meta"><span>${formatDate(post.date)}</span><span>${market ? "Android Market edition" : "Blog post"}</span></div>
        <h3><a href="${postUrl(post)}">${escapeHtml(post.title || "Untitled")}</a></h3>
        <p>${escapeHtml(post.excerpt || "")}</p>
        <a class="blog-read-link" href="${postUrl(post)}">Read more <span aria-hidden="true">→</span></a>
      </article>`;
  };

  fetch("/assets/data/posts.json?v=20261115-market-markdown", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Could not load the posts file.");
      return response.json();
    })
    .then((data) => {
      const posts = (Array.isArray(data.posts) ? data.posts : [])
        .filter((post) => post.published === true)
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

      if (count) count.textContent = posts.length + (posts.length === 1 ? " published post" : " published posts");
      if (postList) {
        postList.innerHTML = posts.length
          ? posts.map(cardMarkup).join("")
          : '<p class="post-empty">There are no published posts yet. Check back soon!</p>';
      }
      if (homeList) {
        const latest = posts.slice(0, 3);
        homeList.innerHTML = latest.length
          ? latest.map(cardMarkup).join("")
          : '<p class="post-empty">There are no published posts yet. Check back soon!</p>';
      }

      if (article) {
        const slug = new URLSearchParams(location.search).get("slug");
        const post = posts.find((item) => item.slug === slug);
        if (!post) {
          article.className = "well article-panel";
          article.innerHTML = '<div class="copy-panel"><h1>Post not found</h1><p>This post may have been moved or is not published.</p></div>';
          return;
        }

        const content = renderContent(post.content);
        if (post.design === "android-market-2012") {
          document.body.classList.add("android-market-page");
          article.className = "market-article-shell";
          article.innerHTML = `
            <div class="market-store-header">
              <div class="market-brand-row">
                <div class="market-robot-mark" aria-hidden="true"><i></i></div>
                <div class="market-brand-name"><strong>android</strong><span>market</span></div>
                <span class="market-header-caption">Discover. Explore. Enjoy.</span>
              </div>
              <nav class="market-category-nav" aria-label="Android Market sections">
                <span class="active">FEATURED</span><span>APPS</span><span>GAMES</span><span>MY LIBRARY</span>
              </nav>
            </div>
            <div class="market-breadcrumb"><a href="/">Home</a><span>›</span><a href="/blog/">Blog</a><span>›</span><span>Android</span></div>
            <div class="market-detail-card">
              <header class="market-app-heading">
                <div class="market-app-icon" aria-hidden="true"><span>ANDROID</span><strong>2012</strong></div>
                <div class="market-app-heading-copy">
                  <p class="market-eyebrow">ANDROID GUIDE · ROOT ACCESS</p>
                  <h1>${escapeHtml(post.title || "Untitled")}</h1>
                  <p class="market-excerpt">${escapeHtml(post.excerpt || "")}</p>
                  <div class="market-meta"><span>${formatDate(post.date)}</span><span>tbrlucas editorial</span></div>
                </div>
              </header>
              <div class="market-content-layout">
                <div class="market-article-content">${content}</div>
                <aside class="market-sidebar">
                  <div class="market-side-panel">
                    <h2>ABOUT THIS ARTICLE</h2>
                    <p>A practical look at Android root access, its possibilities and the trade-offs worth knowing before making changes.</p>
                    <div class="market-side-line"><span>TOPIC</span><strong>Android</strong></div>
                    <div class="market-side-line"><span>FORMAT</span><strong>In-depth guide</strong></div>
                  </div>
                  <div class="market-side-note"><strong>Before you begin</strong><p>Root access changes the security model of your device. Read the risks carefully and check support for your exact model.</p></div>
                  <a class="market-back-link" href="/blog/">‹ Back to all articles</a>
                </aside>
              </div>
              <footer class="market-card-footer">ANDROID MARKET STYLE · TBRLUCAS BLOG</footer>
            </div>`;
        } else {
          article.className = "well article-panel";
          article.innerHTML = `<div class="copy-panel"><p class="blog-list-meta">${formatDate(post.date)}</p><h1>${escapeHtml(post.title || "Untitled")}</h1><p class="article-excerpt">${escapeHtml(post.excerpt || "")}</p><div class="blog-article-content">${content}</div></div>`;
        }
        document.title = `tbrlucas :: ${post.title || "blog post"}`;
      }
    })
    .catch(() => {
      const message = '<p class="post-empty">Posts are temporarily unavailable.</p>';
      if (postList) postList.innerHTML = message;
      if (count) count.textContent = "Posts unavailable";
      if (article) article.innerHTML = message;
      if (homeList) homeList.innerHTML = message;
    });
})();
