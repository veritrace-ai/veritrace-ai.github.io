# Reusable prompts

Copy-paste prompts for standing up another static site with the same stack — GSAP motion,
GSAP Pages hosting, and a custom domain — in a fresh repository.

Replace the bracketed values with your own.

---

## 1. Scaffold a new animated static site

> Build me a modern marketing website in a new folder called `[project-name]`.
>
> Stack: **static HTML, CSS and vanilla JavaScript. No framework, no build step, no npm
> dependencies.** Vendor GSAP locally rather than using a CDN.
>
> Requirements:
> - A complete design system in `assets/css/main.css` driven by CSS custom properties
>   (colour tokens, fluid typographic scale with `clamp()`, spacing scale, elevation,
>   motion easing, z-index layers). Light theme: white surfaces with a single deep
>   `[#1B5FD9]` accent.
> - A declarative motion engine in `assets/js/app.js` where behaviour comes from
>   `data-*` attributes in the markup, so content authors never edit JavaScript.
>   Support: split-text line reveals, scroll reveals, staggered children, clip-path
>   wipes, parallax, animated counters, infinite marquees, SVG line drawing, cursor
>   tilt, magnetic buttons, tabs, accordions and a sticky sub-nav scroll spy.
> - Include a preloader curtain, smooth scrolling via Lenis, and a custom cursor.
> - Full `prefers-reduced-motion` support, plus a hard failsafe that reveals all
>   content if anything stalls.
> - Fully responsive down to 360 px, with no horizontal overflow at any width.
>
> Then run an automated render check in a headless browser across every page at
> 1440×900: confirm the preloader clears, no element is left invisible, there is no
> horizontal overflow and there are no JavaScript errors. Report the results in a table.

---

## 2. Set up a build system for a multi-page static site

> The site has [N] pages that share a navigation, footer, head and icon sprite. Rather
> than duplicating that markup, create a zero-dependency build system:
>
> - `_partials/` holds `head.html`, `sprite.html`, `nav.html`, `footer.html` with
>   `{{TITLE}}`, `{{DESC}}`, `{{CANONICAL}}` style placeholders.
> - `_pages/` holds one file per page, each starting with a JSON front-matter block:
>   `<!--@ { "title": "…", "desc": "…", "canonical": "…" } @-->`
> - `build.js` reads each page, wraps it with the partials and writes the finished
>   `.html` to the project root.
> - The root HTML files are **generated output** and must say so clearly in the README.
> - Add `package.json` scripts: `build`, `start` and `dev` (build then serve).
> - Also write a zero-dependency `server.js` static preview server with correct MIME
>   types, directory-index handling, HTML extension fallback and path-traversal
>   protection.
>
> Run the build and confirm every page generates without error.

---

## 3. Publish any static site to GitHub Pages with a custom domain

> Add GitHub Pages deployment to this repository, triggered on every push to `main`.
>
> - Create `.github/workflows/deploy.yml` using `actions/configure-pages`,
>   `actions/upload-pages-artifact` and `actions/deploy-pages`.
> - Set the required permissions (`pages: write`, `id-token: write`) and a `concurrency`
>   group so deploys never overlap.
> - **Do not** publish the whole repository. Assemble a clean `dist/` containing only
>   public files — the built `.html`, `assets/`, `sitemap.xml`, `robots.txt`,
>   `site.webmanifest` and `CNAME`. Build tooling, page sources, partials and test
>   harnesses must be excluded.
> - Add a `.nojekyll` file to the artifact so GitHub Pages does not run Jekyll.
> - Add a `CNAME` file at the repository root containing `[yourdomain.com]`.
> - Add a `.gitignore` covering `node_modules/`, `dist/` and local tooling folders.
>
> Then write `docs/DEPLOY.md` covering: the one-time Pages setting, the exact DNS records
> (including the apex `A` records and the `www` `CNAME`), enforcing HTTPS, what gets
> published, and a troubleshooting table.

---

## 4. Push to a specific GitHub account (not the currently active one)

> Push this repository to `[account]/[repo]` on GitHub.
>
> My machine is currently authenticated as a **different** GitHub account, and I do not
> want that account touched. So:
> - Do not push until I confirm I have switched accounts with
>   `gh auth switch --user [account]`.
> - Set the repository-local git identity with `git config --local user.name` and
>   `git config --local user.email` so my global identity is left alone.
> - Show me the exact commands you would run, then wait for my go-ahead.

---

## 5. Restyle an existing site to a corporate light theme

> Restyle the whole site from a dark theme to a **corporate light theme**: white and very
> light grey surfaces, deep navy headings, and a single restrained blue accent.
>
> Approach: change the **design tokens only** — the CSS custom properties at the top of
> `main.css`. Do not hand-edit individual component rules unless a value cannot be
> expressed as a token.
>
> Requirements:
> - Surfaces: `#FFFFFF` cards on `#F6F9FC` bands, `#E8EEF6` hairlines.
> - Text: `#0B2545` headings, `#47586B` body, `#7387A0` secondary.
> - Accent: `#1B5FD9` for actions and links, `#2E7CF6` for gradients.
> - Status colours used **only** for meaning: green verified, amber warning, red error.
> - Redesign elevation for light mode — replace dark glow shadows with soft, layered,
>   low-opacity shadows.
> - Keep the preloader and the main CTA bands on a deep navy gradient; dark anchors stop a
>   light theme from feeling washed out.
> - Check every icon, badge, chip and inline SVG for hard-coded dark-theme colours and
>   migrate them too.
>
> Afterwards, measure the computed colour of body text, card headings, buttons and footer
> links to confirm contrast, and confirm zero references to the old palette remain.

---

## 6. Design a logo suite for a brand

> Create a complete SVG logo suite for `[brand]` using this concept: `[concept]`.
>
> Deliver, in `assets/img/`:
> - `logo-mark.svg` — symbol only, for navigation and small spaces
> - `logo-mark-mono.svg` — inherits `currentColor` so it works on any surface
> - `logo-full.svg` — horizontal lockup with a tagline
> - `logo-full-reversed.svg` — horizontal lockup for dark backgrounds
> - `logo-stacked.svg` — centred stacked lockup
> - `favicon.svg` — tab icon, app icon and PWA icon
> - `og-cover.svg` — a 1200×630 social share card
>
> Constraints:
> - Use the brand gradient, defined as an SVG `linearGradient` with a unique `id`.
> - Include `<title>` and `role="img"` with `aria-label` on every file.
> - **Keep every SVG file pure ASCII and free of control characters** — an invalid byte
>   makes a browser refuse to parse the file entirely.
> - Set wordmark text in `Manrope, Inter, 'Segoe UI', system-ui, sans-serif` and note that
>   it should be converted to outlines for print use.
>
> Then build `brand/index.html`, a living brand sheet showing every lockup on light, tinted,
> dark and transparent backgrounds, plus clear-space rules, minimum sizes, the full colour
> palette with hex values, and type specimens.
>
> Finally, render the social card in a browser at 1200×630 and export it as a PNG, since
> social platforms do not read SVG.

---

## 7. Reusable prompt: audit an existing page before shipping

> Before I push, audit every page of this site in a headless browser at 1440×900:
>
> 1. Load each page and wait for the preloader or intro animation to finish.
> 2. Scroll each page from top to bottom so every scroll-triggered animation fires, then
>    return to the top.
> 3. Report, per page: preloader cleared, animation library loaded, `h1` visible, horizontal
>    overflow in pixels, count of elements still invisible, document height, generated
>    decorations, and any JavaScript errors.
> 4. Flag anything that is not green, diagnose the root cause, and fix it.
>
> Also check keyboard focus visibility, and confirm the site renders correctly with
> `prefers-reduced-motion: reduce`.
