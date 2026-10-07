# SEO — what actually works, and what to ignore

**Read this first.** Most SEO advice online is either obsolete or a trap. This document
covers what genuinely moves rankings for a site like this, what is automated, and what
you should not waste money on.

---

## The honest part

**There is no daily script that raises your Google ranking.** There is no endpoint you
ping to climb. Anyone selling you an "SEO automation" that promises position gains is
selling a subscription, not results.

Google ranks pages on four things:

1. **Content** — does it answer a real question better than the alternatives?
2. **Backlinks** — do other credible sites link to you?
3. **Technical health** — can Google crawl, render and understand the site?
4. **Time and authority** — newer domains simply rank lower for competitive terms.

Automation can only meaningfully help with **#3**. That is what this repository does, and
it is genuinely worth doing — but it is the smallest of the four levers.

### Realistic expectations

| Timeline | What to expect |
|---|---|
| Week 1–2 | Google discovers and indexes the site |
| Month 1–3 | Ranking for your own brand name ("veritrace ai") |
| Month 3–6 | Long-tail, low-competition phrases |
| Month 6–12+ | Competitive commercial terms, *if* backlinks exist |

If you want commercial terms like "traceability software India" inside six months, the
work is **content and links**, not tooling.

---

## What is automated

### On every deploy (`.github/workflows/deploy.yml`)

- Rebuilds all pages from `_pages/`
- Generates `og-cover.png` from the SVG — social platforms do not read SVG, so without
  this step every share had no preview image
- Publishes `sitemap.xml`, `robots.txt` and the IndexNow key file

### Daily (`.github/workflows/seo-daily.yml`, 08:00 IST)

Runs `scripts/seo-check.mjs`:

| Check | Why it matters |
|---|---|
| Every sitemap URL returns 200 | A 404 in the sitemap wastes crawl budget and drops that page from the index |
| Canonical matches the sitemap URL | A mismatch splits ranking signals across two URLs |
| Title under 60 chars, description under 155 | Longer text is truncated mid-sentence in search results |
| Structured data present | Required for rich results (breadcrumbs, FAQ expansion) |
| Social image resolves | Broken `og:image` means no preview on any share |
| Internal links resolve | Broken links leak authority out of the site |
| **IndexNow submission** | Tells Bing, Yandex, Seznam and Naver about changes |

**Google is not in that last list, deliberately.** Google has no IndexNow equivalent.
It discovers changes through the sitemap and by crawling. Nothing here accelerates Google.

Run it yourself any time:

```bash
npm run seo
```

### Optional: Search Console reporting

The daily job can also email you impressions, clicks and average position — the genuinely
useful part, because it tells you *what is working* so you can write more of it.

It is off by default. To enable it, create a Google Cloud service account:

1. <https://console.cloud.google.com> → create a project
2. **APIs & Services → Library** → enable **Google Search Console API**
3. **IAM → Service Accounts** → create one → **Keys → Add key → JSON**
4. In [Search Console](https://search.google.com/search-console) → **Settings → Users and
   permissions** → add the service-account email as a **Full** user
5. Add three repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `GSC_SA_EMAIL` | the service-account email (`...@....iam.gserviceaccount.com`) |
| `GSC_SA_KEY` | the entire JSON key file contents |
| `GSC_SITE` | `sc-domain:veritrace.in` (or `https://veritrace.in/`) |

The job skips this step safely if the secrets are absent.

---

## One-time manual steps

These need a human and are worth doing once:

1. **Verify the domain in [Google Search Console](https://search.google.com/search-console).**
   Use DNS verification and add the provided `TXT` record at GoDaddy. This is how you see
   what Google actually knows about the site — impressions, coverage, errors.
2. **Submit the sitemap** in Search Console → Sitemaps → `sitemap.xml`.
3. **Verify in [Bing Webmaster Tools](https://www.bing.com/webmasters)** too. It can import
   directly from Search Console. Bing powers ChatGPT search and Copilot, which is now a
   meaningful traffic source.
4. **Create a Google Business Profile** if you have a physical office. Local results are far
   easier to win than national ones.

---

## What actually moves the needle

In rough order of impact per hour spent:

### 1. Content that answers real questions

You already know the questions — they are in the FAQ. Every one of those, expanded into a
proper article, is a page that can rank:

- "What does DPDP require when a consumer scans a product code?"
- "How to reduce counterfeit complaints without changing your printers"
- "FSSAI traceability records: what inspectors actually ask for"
- "Serialization for MSMEs: getting started without a serialization team"

Target one clear question per page. Depth beats breadth.

### 2. Backlinks

This is the hard one, and where most of the effort belongs:

- **Industry directories** — pharma, FMCG and packaging associations
- **Guest articles** in Indian manufacturing and supply-chain publications
- **Partner and customer sites** — ask every one of them for a link
- **Original data** — publish anonymised scan statistics. Journalists and bloggers link to
  data. Nobody links to a product page.
- **Speaker profiles** and conference listings

One link from a credible industry site outweighs a hundred directory submissions.

### 3. Page experience

Already handled: fast static pages, no layout shift, mobile-first, no blocking scripts.

### 4. Local and regional

- Regional-language versions of the key pages (Hindi first) with proper `hreflang`
- Local business listings

---

## What to ignore

| Tactic | Why to skip it |
|---|---|
| "Instant indexing" services | Do nothing Google respects. IndexNow has no Google endpoint. |
| Paid backlink packages | Google detects and devalues them. Can trigger a manual penalty. |
| Keyword-stuffed meta tags | `keywords` has been ignored by Google since 2009. It is in the head for legacy reasons only. |
| Submitting to 500 directories | Ineffective since roughly 2012, and actively harmful if low quality. |
| AI-generated article farms | Google's spam systems target exactly this. It can deindex the whole domain. |
| Buying a `.in` exact-match domain | Legacy tactic, no meaningful benefit, real cost. |
| Daily "SEO automation" subscriptions | This repository does the useful parts for free, in CI. |

---

## Current state of this site

| Item | Status |
|---|---|
| Clean URLs (`/features/`) | ✅ |
| Canonical tags | ✅ correct on every page |
| `sitemap.xml` | ✅ generated, 13 URLs |
| `robots.txt` | ✅ allows all, points at the sitemap |
| Structured data | ✅ auto-generated (Organization, WebSite, WebPage, BreadcrumbList, FAQPage) |
| Titles under 60 / descriptions under 155 | ✅ verified by the daily check |
| Mobile responsive | ✅ from 360 px |
| `prefers-reduced-motion` | ✅ supported |
| Core Web Vitals | ✅ static, no layout shift |
| Social share image | ✅ generated at deploy |
| Analytics | ✅ GA4, IP-anonymised |
| IndexNow | ✅ daily |
| Backlinks | ❌ **this is the gap** |
| Blog content | ⚠️ placeholder articles |

**The two things that will actually hold you back: no backlinks, and placeholder blog
content.** Everything else is in reasonable shape.

---

## Checking your own work

```bash
npm run seo        # full health check against production
npm run dev        # local preview at http://localhost:5173
```

The daily workflow also writes a summary to **Actions → Daily SEO health check**, so you
can scan results without opening logs.

### When you add a page

The build generates its structured data and the daily check validates it. Just remember:

- Put the page in `_pages/`, run `node build.js`
- Add it to `sitemap.xml`
- Keep the title under 60 characters and the description under 155
- Link to it from somewhere — orphan pages rank poorly
