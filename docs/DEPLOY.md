# Deploying VeriTrace AI

The site is a static bundle. Pushing to `main` builds it and publishes it to GitHub Pages,
which serves it over your own domain at no hosting cost.

> **Before you start:** the custom domain must already be **registered *and* delegated**
> (i.e. have nameservers assigned). A domain with no nameservers returns `NXDOMAIN` for
> every lookup, and GitHub Pages will refuse it with `InvalidDNSError`. See §0.

---

## 0. Domain prerequisites — two ways this fails

A custom domain fails with `InvalidDNSError` in **two distinct** situations. Diagnose which
one you have before doing anything else, because the fixes are completely different.

### Diagnose it

```bash
# Does the domain resolve publicly?
nslookup veritrace.in 8.8.8.8

# Is it delegated at the registry?
nslookup -type=NS veritrace.in 8.8.8.8

# If it's a newer domain, ask the registry for its status:
curl -s -H "Accept: application/rdap+json" \
  "https://rdap.nixiregistry.in/rdap/domain/veritrace.in"
```

| Symptom | Registry status | Cause | Fix |
|---|---|---|---|
| `Non-existent domain`, no NS | *(no record)* | Never registered | Register it |
| `Non-existent domain`, no NS | *(record exists)* | **Registered but no nameservers** | §0.1 |
| `Non-existent domain`, but the registrar's own NS answer when queried directly | **`client hold`** | **Registrar suspension — usually pending email verification** | §0.2 |

> The third row is the subtle one. The domain is registered, nameservers are set, and the
> DNS provider's zone is populated — yet public resolvers still say `NXDOMAIN`, because the
> registry has pulled the delegation. Always check the registry status.

### 0.1 Not delegated — no nameservers

1. Log in to the registrar where the domain was purchased.
2. Find **Nameservers** (sometimes "DNS servers" or "Delegation").
3. Either use the registrar's own DNS, or point at a dedicated provider such as Cloudflare.
4. Save. Delegation takes **15 minutes to 24 hours**.

> Changing nameservers discards any records at the old provider. Recreate anything you rely
> on — especially **MX records for email**.

### 0.2 `client hold` — the registrar has suspended it

`clientHold` means the registry is **not publishing your delegation**, so the domain is
invisible to the internet even though it is registered.

For a **newly registered** domain this is almost always **pending registrant email
verification** — registrars are required to verify the contact address, and the domain is
suspended until the link is clicked.

**Fix:**

1. Check the inbox used to register the domain for a message from your registrar
   ("Verify your email", "Action required", "Complete your registration").
2. Click the verification link. Also check **spam** — and if the address differs from the
   one you normally use, check that one instead.
3. Alternatively, sign in to the registrar and open the domain's management page — a
   verification or suspension notice is usually shown as a banner.
4. Confirm payment cleared, if the purchase was recent.

`clientHold` normally lifts within minutes of verification, though propagation can take a
few hours. Re-run the `nslookup` above to confirm before adding any records.

**Verify it's lifted:**

```bash
nslookup veritrace.in 8.8.8.8     # must return IPs, not NXDOMAIN
```

### 0.3 Then manage records where the nameservers point

Records must be added in the DNS panel of whoever runs your nameservers — the registrar's
panel, or your DNS provider. If the nameservers are the registrar's own (for example
`ns15.domaincontrol.com` / `ns16.domaincontrol.com` are GoDaddy's), add the records in the
registrar's DNS panel.

Check for **existing parking records** — a newly registered domain often has placeholder
`A` records pointing at a registrar landing page. These must be **replaced**, not added
alongside, or the parking page will win.

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
| **`InvalidDNSError` / "improperly configured"** | Domain suspended at the registry (`client hold`), not delegated, or has no A/CNAME records | Diagnose with §0 — check the registry status first |
| **Registry status shows `client hold`** | Registrar suspension — usually unverified registrant email | Click the verification link in your inbox (§0.2) |
| `Non-existent domain` from `nslookup`, but the registrar's nameservers answer when queried directly | Delegation pulled by the registry | §0.2 — check registry status |
| `Non-existent domain` from `nslookup`, no NS anywhere | Not registered, or no nameservers assigned | §0.1 |
| `Cannot serve from your custom domain` until DNS is ready | Custom domain is set but unresolvable, so `github.io` also redirects away | Clear the Custom domain field temporarily (§3) |
| Workflow fails: `Pages not enabled` | Pages source not set to GitHub Actions | Settings → Pages → Source → **GitHub Actions** |
| Deploy succeeds, site 404s | DNS still propagating, or a conflicting record exists | `nslookup yourdomain.com 8.8.8.8` should return `185.199.x.153` |
| Domain shows the registrar's parking page | Placeholder A records still present | Replace them with the GitHub IPs (§3) — do not add alongside |
| Domain reverts to `github.io` | `CNAME` missing from the artifact | Confirm `CNAME` is at the repo root and the workflow copies it |
| Emails stopped working | Changing nameservers discarded the old MX records | Recreate MX records at the new DNS provider |
| Page renders blank | JavaScript failed before the reveal | Hard refresh (`Ctrl/Cmd + Shift + R`) — a 5-second failsafe reveals content regardless |
| `404` on a subpage | Page not built | Add it to `_pages/`, run `node build.js`, commit the generated `.html` |
