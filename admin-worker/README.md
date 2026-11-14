# tbrlucas blog administration service

This folder contains the private API for the custom GitHub Pages blog panel. It is a Cloudflare Worker, not PHP and not a CMS.

## What it does

- Starts GitHub OAuth sign-in.
- Allows only the GitHub login configured in `ADMIN_GITHUB_LOGIN`.
- Keeps the GitHub OAuth token in Cloudflare KV, never in browser JavaScript.
- Creates, updates, publishes, unpublishes and deletes posts by committing changes to `assets/data/posts.json` on the `main` branch.
- Uses short-lived opaque browser sessions (7 days).

## Required free services

1. A Cloudflare account with Workers and KV enabled.
2. A GitHub OAuth App.
3. A KV namespace bound to the Worker as `AUTH_KV`.

## Worker variables

Set these as Worker variables:

- `ADMIN_ORIGIN` = `https://tbrlucas.github.io`
- `ADMIN_GITHUB_LOGIN` = the exact GitHub username allowed to administer the blog
- `REPO_OWNER` = `tbrlucas`
- `REPO_NAME` = `tbrlucas.github.io`
- `GITHUB_CALLBACK_URL` = the Worker URL followed by `/auth/callback`
- `GITHUB_CLIENT_ID` = OAuth App client ID

Set `GITHUB_CLIENT_SECRET` as an encrypted Worker secret, not a plain variable.

Create a GitHub OAuth App and set its Authorization callback URL to the exact `GITHUB_CALLBACK_URL`. The app requests the `repo` scope because the repository is private.

## KV

Create a KV namespace and bind it with the variable name `AUTH_KV`. The Worker stores short-lived OAuth state values and sessions there. Never expose KV credentials.

## Deploy and connect

1. Deploy `worker.js` as a Cloudflare Worker.
2. Configure the variables, secret and KV binding above.
3. Copy the deployed Worker base URL (for example, `https://your-worker.your-subdomain.workers.dev`).
4. Put that URL in `assets/js/admin-config.js` as the `apiBase` value.
5. Save the change to the GitHub repository.

The OAuth callback URL must match exactly in both the Worker variable and GitHub OAuth App settings.

## Security notes

- Do not commit OAuth client secrets, GitHub access tokens, KV credentials or personal access tokens.
- The Worker checks the request Origin and the authorized GitHub username.
- Browser sessions contain only a random opaque ID; the GitHub token remains in KV.
- The admin page is a public static URL, but all data-changing API actions require an authorized session.
