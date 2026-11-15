# TBRLucas Backup — administration service

This Worker is a **separate administration backend for the backupsite repository**. It must not reuse the production site's Worker or GitHub App installation.

## Architecture

- GitHub App user authorization signs the administrator in.
- The Worker allows only the GitHub login configured in `ADMIN_GITHUB_LOGIN`.
- OAuth state and short-lived opaque sessions are stored in Cloudflare KV, bound as `AUTH_KV`.
- A GitHub App installation token is used for repository operations.
- The GitHub App must be installed on **only** `tbrlucas/backupsite`, with **Contents: Read and write** and no other repository permissions.
- The Worker reads and writes this repository's `main` branch.

## Required setup

1. Create a **new Cloudflare Worker** for the backup environment and a KV namespace. Bind the namespace as `AUTH_KV`.
2. Create a **separate GitHub App** for the backup environment. Enable user authorization and set its callback URL to the Worker URL followed by `/auth/callback`.
3. Set the GitHub App repository permission to **Contents: Read and write**. Leave all other permissions at No access.
4. Install the App using **Only select repositories** and select only `tbrlucas/backupsite`.
5. Record the App ID, client ID, installation ID and private key. Never commit the private key or client secret.
6. Configure the Worker variables below and add the two encrypted secrets in Cloudflare.
7. Deploy the Worker.
8. Only after deployment, put its `https://…workers.dev` origin in `assets/js/admin-config.js` as `apiBase`.

## Worker variables

| Variable | Value |
| --- | --- |
| `ADMIN_ORIGIN` | `https://tbrlucas.github.io` |
| `ADMIN_PATH` | `/backupsite/alcatelonetouch3075m/` |
| `ADMIN_GITHUB_LOGIN` | `tbrlucas` |
| `REPO_OWNER` | `tbrlucas` |
| `REPO_NAME` | `backupsite` |
| `GITHUB_CALLBACK_URL` | Exact Worker URL plus `/auth/callback` |
| `GITHUB_APP_ID` | Numeric GitHub App ID |
| `GITHUB_APP_INSTALLATION_ID` | Installation ID for the App installed on `backupsite` |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub App client ID |

Encrypted Worker secrets (Cloudflare secret storage only):

- `GITHUB_OAUTH_CLIENT_SECRET`
- `GITHUB_APP_PRIVATE_KEY` — PKCS#8 PEM beginning with `-----BEGIN PRIVATE KEY-----`

If the downloaded private key is PKCS#1 (`BEGIN RSA PRIVATE KEY`), convert it locally before adding it as a secret. Never paste either secret into chat, GitHub files, or this README.

## Wrangler

A non-secret template is provided in `wrangler.toml.example`. Replace the KV namespace ID and configure the variables before deploying. Secrets must be added separately with Cloudflare's secret management.

## Sign-in

After the Worker is deployed and `apiBase` is configured, open:

`https://tbrlucas.github.io/backupsite/alcatelonetouch3075m/?login=1`

The plain route intentionally sends unauthenticated visitors to the site's 404 page. The query parameter only reveals the sign-in screen; it does **not** grant access. Every API operation still requires a valid Worker session and the authorized GitHub account.

## Security notes

- Do not point this backup frontend at the production Worker. That could cause backup administration actions to modify production content.
- Do not install the backup GitHub App on the production repository.
- The browser never receives the GitHub App private key, OAuth client secret, or installation token except for the narrowly scoped, short-lived upload token returned to an authenticated admin session.
- The URL being obscure is not an authentication mechanism. Authorization is enforced by the Worker.
