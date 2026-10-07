# VeriTrace AI — Website

> **Verify every product. Trace every journey.**
> Static marketing site for VeriTrace AI Technologies Private Limited.

Corporate white-and-blue marketing site with a GSAP motion system: preloader curtain,
SplitText headlines, ScrollTrigger reveals, a pinned horizontal scroller, scrollytelling,
parallax, counters, marquees and SVG line-drawing.

---

## Quick start

```bash
node build.js      # regenerate the root .html files from _pages + _partials
node server.js     # serve at http://localhost:5173
```

Or both at once:

```bash
npm run dev
```

There are **no dependencies**. Node 18+ is the only requirement.

---

## How the site is structured

```
.
├── index.html                    ← GENERATED (from _pages/index.html)
├── 404.html                      ← GENERATED
├── features/index.html           ← GENERATED  → served at /features/
├── solutions/index.html          ← GENERATED  → served at /solutions/
├── … one folder per page …
├── _pages/                       ← EDIT THESE. One file per page body.
├── _partials/                    ← Shared chrome: head, sprite, nav, footer
├── build.js                      ← Assembles _pages + _partials → output
├── server.js                     ← Zero-dependency local preview server
├── assets/
│   ├── css/main.css              ← Complete design system (tokens → components)
│   ├── js/app.js                 ← Declarative GSAP motion engine
│   ├── js/vendor/                ← GSAP, ScrollTrigger, SplitText, Lenis (vendored)
│   └── img/                      ← Logo suite, favicon, pattern, social card
├── brand/index.html              ← Brand sheet (logo, palette, typography)
├── _test/harness.html            ← Automated render check across every page
├── .github/workflows/deploy.yml  ← Build + deploy to GitHub Pages
└── CNAME                         ← Custom domain
```

### Clean URLs — no `.html` in the address bar

Routes are folder-based. Each page is written to `<slug>/index.html`, which the web
server resolves to `/slug/`:

| Source | Output | URL |
|---|---|---|
| `_pages/index.html` | `index.html` | `/` |
| `_pages/features.html` | `features/index.html` | `/features/` |
| `_pages/404.html` | `404.html` | `/404.html` |

`404.html` stays a real root file because GitHub Pages requires that exact path for its
custom error document.

**All internal links are root-relative** (`/features/`, `/assets/css/main.css`). This keeps
them correct at any nesting depth — a page at `/features/` linking to `pricing.html` would
otherwise resolve to `/features/pricing.html`. `build.js` normalises links on every build,
so hand-edited sources can't silently drift.

### The golden rule

**Never edit the generated output.** Edit `_pages/` for content or `_partials/` for shared
chrome, then run `node build.js`. There are no hand-authored exceptions — every page,
including the homepage, comes from `_pages/`.

---

## Editing content

Every page body lives in `_pages/<name>.html` and starts with a JSON front-matter block:

```html
<!--@
{
  "title": "Page title | VeriTrace AI",
  "desc": "Meta description.",
  "keywords": "comma, separated, keywords",
  "robots": "index, follow",
  "canonical": "https://veritrace.in/example"
}
@-->

<section class="section">
  ... page content ...
</section>
```

`build.js` wraps that body with the shared head, icon sprite, navigation and footer.

To add a page:

1. Create `_pages/newpage.html` with the front matter above.
2. Run `node build.js`.
3. Add a link to `_partials/nav.html` and `_partials/footer.html`, then rebuild.

---

## The motion system

`assets/js/app.js` is fully **declarative** — behaviour is driven by `data-*` attributes
in the markup, so content authors never touch JavaScript.

| Attribute | Effect |
|---|---|
| `data-split="lines\|words\|chars"` | SplitText reveal on scroll |
| `data-hero-title` | Same, but driven by the intro timeline after the preloader |
| `data-reveal` | Fade + rise into view |
| `data-stagger="selector"` | Staggered children (use `:scope > *`) |
| `data-clip` | Clip-path wipe reveal |
| `data-parallax="0.15"` | Scroll-linked vertical drift |
| `data-count="1200"` | Animated counter (add `data-decimals`, `data-suffix`) |
| `data-marquee="1"` | Infinite marquee (`-1` reverses direction) |
| `data-draw` | Animate SVG strokes drawing themselves |
| `data-hpin` | Pin the section and scroll horizontally |
| `data-scrolly` | Sticky scrollytelling with layered steps |
| `data-tilt="8"` | 3D tilt toward the cursor |
| `data-magnetic="0.3"` | Magnetic button pull |
| `data-hl` | Word-by-word highlight on scroll |
| `data-tabs` / `data-acc` | Tabs and accordion |
| `data-verify` | Product verification demo (verify page) |
| `data-spy` | Sticky sub-nav scroll spy |

### Reduced motion and failsafes

- `prefers-reduced-motion: reduce` bypasses the whole motion system and renders static content.
- A hard 5-second failsafe removes the preloader and reveals all content if anything stalls.
- A background-tab guard skips the animated curtain entirely (`requestAnimationFrame` is
  throttled in hidden tabs, which would otherwise leave the screen covered).

---

## Forms and where they send

The site is static — there is no server to receive a submission. Forms post to a hosted
form provider that forwards to email.

**Currently wired to [Web3Forms](https://web3forms.com)** — free, unlimited submissions, no
backend, sends straight to your inbox.

### One-time setup (2 minutes)

1. Go to <https://web3forms.com> and enter **`veritrace.ai@gmail.com`**.
2. Check that inbox for the access key.
3. Paste it into `_pages/contact.html`, replacing `REPLACE_WITH_WEB3FORMS_ACCESS_KEY`:

```html
<input type="hidden" name="access_key" value="your-key-here">
```

4. `node build.js` and push.

Until a real key is in place, the form detects the placeholder and shows
*"The form is not connected yet"* with your email address — so a misconfiguration is visible
to visitors rather than silently swallowing enquiries.

### How it behaves

| Situation | What the visitor sees |
|---|---|
| No key configured | Amber error with your email address |
| Key present, submission succeeds | Green success message; form resets |
| Provider returns an error | Red error with the provider's message |
| Network failure | Red error with your email address |

`app.js` reads `data-ajax` on the `<form>` and posts via `fetch`. A hidden `botcheck`
honeypot field catches most spam bots. Forms **without** `action` or `data-ajax` fall back
to a simulated submit, which is how the demo subscribe forms behave.

### Switching providers

Any provider that accepts a normal `POST` works — change the `action`, keep `data-ajax`, and
adjust the field names. Formspree, Getform and Basin are drop-in alternatives.

> **Note:** the newsletter forms on `/blog/` and `/status/` are still in demo mode. Point
> them at a provider the same way, or remove them.

---

## Automated render check

With the preview server running, open:

```
http://localhost:5173/_test/harness.html
```

It loads every page in an iframe at 1440×900, scrolls each one end-to-end to trigger
ScrollTrigger, and reports: preloader state, `vt-ready` class, GSAP load, H1 visibility,
horizontal overflow, any element left invisible, body height, generated QR codes, counter
completion and JavaScript errors. Every row should read green or `none`.

---

## Brand

`brand/index.html` is the living brand sheet: symbol, lockups, clear space, palette,
typography and applications.

The logo is a shield (protection) enclosing a stylised QR grid (serialized identity) with a
trace line that exits as an arrow (the product journey).

| File | Use | Background |
|---|---|---|
| `logo-mark.svg` | Symbol only — nav, small spaces | Light |
| `logo-mark-mono.svg` | Inherits `currentColor` | Any |
| `logo-full.svg` | Horizontal lockup with tagline | Light |
| `logo-full-reversed.svg` | Horizontal lockup | Dark / blue |
| `logo-stacked.svg` | Centred stacked lockup | Light |
| `favicon.svg` | Tab icon, app icon, PWA | Any |
| `og-cover.svg` | Social share card, 1200×630 — export a PNG before use | Dark |

**Note:** the lockup SVGs set the wordmark in Manrope via `font-family`. If Manrope is not
available to the renderer they fall back to Inter, then the system UI font. For print or
third-party use, convert the text to outlines first.

---

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which rebuilds the pages,
assembles a clean publish directory and deploys it to GitHub Pages.

One-time setup — including the domain-delegation prerequisite that causes most
custom-domain failures — plus DNS records and troubleshooting:
**[docs/DEPLOY.md](docs/DEPLOY.md)**.

---

## License

Proprietary. © VeriTrace AI Technologies Private Limited. All rights reserved.
