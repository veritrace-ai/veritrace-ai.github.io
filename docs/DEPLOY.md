# Deploying VeriTrace AI

The site is a static bundle. Pushing to `main` builds it and publishes it to GitHub Pages,
which serves it over your own domain at no hosting cost.

---

## 1. One-time repository setup

1. Push this repository to GitHub (see §2).
2. Open **Settings → Pages**.
   - **Source:** `GitHub Actions` — *not* "Deploy from a branch".
3. Open **Settings → Actions → General → Workflow permissions** and confirm
   *Read and write permissions* is allowed (the workflow needs `pages: write`).

That is the whole build side. No server, no build minutes on your machine.

---

## 2. Pushing the code

### First push

```bash
cd veritrace-website
git init -b main
git add .
git commit -m "Initial commit: VeriTrace AI marketing site"
git remote add origin https://github.com/veritrace-ai/veritrace-website.git
git push -u origin main
```

### Signing in as the `veritrace-ai` account

GitHub CLI can hold more than one account. To add and switch:

```bash
# Add the account (choose HTTPS, authenticate in the browser)
gh auth login

# List accounts
gh auth status

# Switch the active account for git operations
gh auth switch --user veritrace-ai

# Confirm
gh auth status
```

If your global git identity is set to another account, override it **for this repository only**:

```bash
git config user.name  "VeriTrace AI"
git config user.email "dev@veritrace.in"
```

`git config --local` (the default inside a repo) never touches your other projects.

### If the repository does not exist yet

```bash
gh repo create veritrace-ai/veritrace-website \
  --public \
  --description "VeriTrace AI — product authentication, serialization and traceability" \
  --source . \
  --remote origin \
  --push
```

---

## 3. Custom domain

The repository contains a `CNAME` file holding the domain. GitHub Pages reads it on every
deploy, so the domain survives redeploys automatically.

To change the domain, edit **one file** and push:

```bash
echo "yourdomain.com" > CNAME
git commit -am "Set custom domain" && git push
```

### DNS records

At your domain registrar, for an apex domain (`veritrace.in`):

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

For the `www` subdomain:

| Type | Name | Value |
|---|---|---|
| CNAME | `www` | `veritrace-ai.github.io` |

Optional but recommended, so the apex domain works over IPv6:

| Type | Name | Value |
|---|---|---|
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

> Remove any conflicting `A`, `AAAA` or `CNAME` records on `@` and `www` first — a parked
> page or registrar redirect will silently win over GitHub Pages.

### Enforce HTTPS

After DNS resolves (usually 15 minutes, up to 24 hours):

1. **Settings → Pages → Custom domain** — enter the domain, click **Save**.
2. Wait for the certificate to be issued.
3. Tick **Enforce HTTPS**.

---

## 4. What actually gets published

The workflow publishes only public files:

```
*.html                 ← rebuilt from _pages/ and _partials/
assets/                ← css, js, vendor, img
brand/index.html       ← brand sheet
sitemap.xml  robots.txt  site.webmanifest
CNAME  .nojekyll
```

`_pages/`, `_partials/`, `_test/`, `build.js`, `server.js`, `package.json`, `README.md` and
`docs/` stay in the repository but are **not** served.

---

## 5. Local preview before pushing

```bash
npm run dev      # builds, then serves at http://localhost:5173
```

Run the render check at <http://localhost:5173/_test/harness.html> and confirm every row
is green before you push.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Workflow fails: `Pages not enabled` | Pages source not set to GitHub Actions | Settings → Pages → Source → **GitHub Actions** |
| Deploy succeeds, site 404s | DNS still propagating, or a conflicting record exists | Check `dig veritrace.in` resolves to the `185.199.x.153` range |
| Page renders blank | JavaScript failed before the reveal | Hard refresh (`Ctrl/Cmd + Shift + R`). A 5-second failsafe reveals content regardless |
| Styles missing | Asset paths assumed a subdirectory | All paths are relative and root-based; deploy must be at the domain root |
| Domain reverts to `github.io` | `CNAME` missing from the artifact | Confirm `CNAME` exists at the repo root and the workflow copies it |
| `404` on a subpage | Page not built | Add it to `_pages/`, run `node build.js`, commit the generated `.html` |

### Checking a deploy

```bash
gh run list --limit 5
gh run watch
gh run view --log-failed
```
