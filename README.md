# tbrlucas

A static website with recommendations, projects and practical guides for older mobile devices.

## Website

- **Home** — overview and featured device topics.
- **Projects** — project categories and experiments.
- **Blog** — articles loaded from `assets/data/posts.json`.
- **About** — the purpose and scope of the site.

The frontend uses Bootstrap 2.3.2, with project-specific styles in `assets/css/`.

## Blog content

Published posts are stored in `assets/data/posts.json`:

```json
{
  "posts": [
    {
      "slug": "example-post",
      "title": "Example post",
      "date": "2026-11-14",
      "excerpt": "A short summary.",
      "content": "The article text.",
      "published": true
    }
  ]
}
```

Posts with `published: false` remain drafts and are not shown on the public site.

## Administration

The static administration interface is located at `/alcatelonetouch3075m/`. Its API runs separately in the Cloudflare Worker source under `admin-worker/`.

The Worker uses a GitHub App installation limited to this repository and a Cloudflare KV namespace for short-lived authentication state and sessions.

### Security

- Never commit OAuth client secrets, GitHub App private keys, access tokens or `.dev.vars`.
- Keep secrets in Cloudflare Worker secret storage.
- Keep the GitHub App installation restricted to this repository with only the permissions required by the Worker.
- The administration page requires an authorized GitHub account; its URL is not an authentication mechanism.

## Deployment

The website is designed for GitHub Pages from the `main` branch, using the repository root as the publishing source.
