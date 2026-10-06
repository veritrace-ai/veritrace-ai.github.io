# Deploying VeriTrace AI

The site is a static bundle. Pushing to `main` builds it and publishes it to GitHub Pages,
which serves it over your own domain at no hosting cost.

> **Before you start:** the custom domain must already be **registered *and* delegated**
> (i.e. have nameservers assigned). A domain with no nameservers returns `NXDOMAIN` for
> every lookup, and GitHub Pages will refuse it with `InvalidDNSError`. See §0.

---

## 0. Domain prerequisite — nameservers must exist

This is the single most common cause of a failed custom domain. A registered domain that
has never had nameservers assigned does **not** resolve, and no amount of A/CNAME records
will help, because there is no zone to put them in.

### Check whether the domain is delegated

```bash
nslookup -type=NS yourdomain.com 8.8.8.8
nslookup -type=SOA yourdomain.com 8.8.8.8
```

| Result | Meaning | Action |
|---|---|---|
| Returns nameservers | Delegated ✅ | Go to §1 |
| `Non-existent domain` / no NS | **Not delegated** ❌ | Do the steps below first |

### Fix it

1. Log in to the registrar where the domain was purchased.
2. Find **Nameservers** (sometimes "DNS servers" or "Delegation").
3. Either:
   - **Use the registrar's own DNS** — select their default nameservers, then manage
     records in their DNS panel; or
   - **Use a dedicated DNS provider** such as Cloudflare — point the nameservers at it and
     manage records there. Free, and gives you faster propagation and better tooling.
4. Save. Delegation usually takes **15 minutes to 24 hours**. Verify with the `nslookup`
   commands above before continuing — do not add records to a zone that isn't live yet.

> If you change nameservers, any existing DNS records at the old provider stop working.
> Recreate anything else you rely on (especially **MX records for email**) at the new one.

---

## 1. One-time repository setup

1. Push this repository to GitHub (§2).
2. **Settings → Pages → Source:** `GitHub Actions` — *not* "Deploy from a branch".
3. **Settings → Actions → General → Workflow permissions:** ensure *Read and write
   permissions* is allowed.

---

## 2. Pushing the code

```bash
cd veritrace-website
git init -b main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/veritrace-ai/veritrace-website.git
git push -u origin main
```

### Signing in as the `veritrace-ai` account

```bash
gh auth login                       # add the account
gh auth status                      # list accounts
gh auth switch --user veritrace-ai  # make it active for git
```

To keep your global git identity clean, set it **for this repository only**:

```bash
git config user.name  "VeriTrace AI"
git config user.email "dev@veritrace.in"
```

### If the repository does not exist yet

```bash
gh repo create veritrace-ai/veritrace-website \
  --public \
  --description "VeriTrace AI — product authentication, serialization and traceability" \
  --source . --remote origin --push
```

---

## 3. Custom domain

The repository contains a `CNAME` file holding the domain. GitHub Pages reads it on every
deploy, so the domain survives redeploys automatically. Change it by editing that one file:

```bash
echo "yourdomain.com" > CNAME
git commit -am "Set custom domain" && git push
```

### DNS records (add these at your DNS provider)

For the apex domain (`veritrace.in`):

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

Optional IPv6 (recommended):

| Type | Name | Value |
|---|---|---|
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

> Delete any pre-existing `A`, `AAAA` or `CNAME` records on `@` and `www` first. A parking
> page or registrar redirect will silently override GitHub Pages.

> Domain verification: GitHub may ask you to prove ownership by adding a `TXT` record
> (`_github-pages-challenge-<user>`). Use the exact value it shows in
> **Settings → Pages**.

### Then, in GitHub

1. **Settings → Pages → Custom domain** — enter the domain, click **Save**.
2. Wait for the DNS check to pass (the "improperly configured" warning clears).
3. Tick **Enforce HTTPS** once the certificate is issued.

### Important: setting a custom domain redirects the github.io URL

Once a custom domain is set, `https://<user>.github.io/<repo>/` returns a **301 redirect**
to your domain. If DNS is not ready, the site becomes unreachable at *both* addresses.

**If you need the site live before DNS is ready,** temporarily clear
**Settings → Pages → Custom domain** (leave it blank and Save). The `github.io` URL starts
serving again immediately. Add the domain back once DNS resolves.

---

## 4. What actually gets published

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

Run the render check at <http://localhost:5173/_test/harness.html> and confirm every row is
green before you push.

---

## 6. Verifying a deployment

```bash
# Is DNS pointing where it should?
nslookup yourdomain.com 8.8.8.8

# Is the site serving?
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" -L https://yourdomain.com/

# Did the workflow pass?
gh run list --limit 5
gh run watch
gh run view --log-failed
```

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| **`InvalidDNSError` / "improperly configured"** | Domain has no nameservers, or no A/CNAME records | Fix §0 first, then add §3 records. Verify with `nslookup -type=NS` |
| `Non-existent domain` from `nslookup` | Not registered, or registered but never delegated | Set nameservers at the registrar (§0) |
| `Cannot serve from your custom domain` until DNS is ready | Custom domain is set but unresolvable, so `github.io` also redirects away | Clear the Custom domain field temporarily (§3) |
| Workflow fails: `Pages not enabled` | Pages source not set to GitHub Actions | Settings → Pages → Source → **GitHub Actions** |
| Deploy succeeds, site 404s | DNS still propagating, or a conflicting record exists | `nslookup yourdomain.com 8.8.8.8` should return `185.199.x.153` |
| Domain reverts to `github.io` | `CNAME` missing from the artifact | Confirm `CNAME` is at the repo root and the workflow copies it |
| Emails stopped working | Changing nameservers discarded the old MX records | Recreate MX records at the new DNS provider |
| Page renders blank | JavaScript failed before the reveal | Hard refresh (`Ctrl/Cmd + Shift + R`) — a 5-second failsafe reveals content regardless |
| `404` on a subpage | Page not built | Add it to `_pages/`, run `node build.js`, commit the generated `.html` |
