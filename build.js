/**
 * VeriTrace AI — static page builder (zero dependencies).
 *
 *   node build.js
 *
 * Assembles every page in ./_pages into a published file, wrapping the page
 * body with the shared chrome:
 *
 *   _partials/head.html    +  _partials/sprite.html  +  _partials/nav.html
 *   + <page body>          +  _partials/footer.html
 *
 * Each file in _pages starts with a JSON front-matter block:
 *
 *   <!--@
 *   { "title": "...", "desc": "...", "keywords": "...",
 *     "canonical": "https://veritrace.in/xyz/", "robots": "index, follow" }
 *   @-->
 *
 * OUTPUT PATHS — clean URLs, no .html in the address bar:
 *
 *   _pages/index.html    ->  ./index.html          served at  /
 *   _pages/features.html ->  ./features/index.html served at  /features/
 *   _pages/404.html      ->  ./404.html            served at  /404.html
 *
 * The 404 stays a real file at the root because GitHub Pages requires
 * /404.html as its custom error document.
 *
 * Edit a page or a partial, re-run `node build.js`, and the output is
 * regenerated. Stale output folders are pruned automatically.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PAGES_DIR = path.join(ROOT, '_pages');
const PARTIALS_DIR = path.join(ROOT, '_partials');

// Pages that must stay as root-level files rather than folders.
const ROOT_LEVEL = {
  'index.html': 'index.html',
  '404.html': '404.html'
};

function outputPathFor(pageFile) {
  if (ROOT_LEVEL[pageFile]) return path.join(ROOT, ROOT_LEVEL[pageFile]);
  const slug = pageFile.replace(/\.html$/, '');
  return path.join(ROOT, slug, 'index.html');
}

function readPartial(name) {
  return fs.readFileSync(path.join(PARTIALS_DIR, name), 'utf8').trimEnd();
}

function parseFrontMatter(raw) {
  const m = raw.match(/^\s*<!--@([\s\S]*?)@-->\s*/);
  if (!m) throw new Error('Missing <!--@ ... @--> front matter');
  let meta;
  try {
    meta = JSON.parse(m[1]);
  } catch (e) {
    throw new Error('Invalid JSON front matter: ' + e.message);
  }
  return { meta: meta, body: raw.slice(m[0].length) };
}

function fill(template, meta) {
  const values = {
    TITLE: meta.title || 'VeriTrace AI',
    DESC: meta.desc || '',
    KEYWORDS: meta.keywords || 'product authentication, traceability, serialization, QR codes, India',
    ROBOTS: meta.robots || 'index, follow',
    CANONICAL: meta.canonical || 'https://veritrace.in/',
    EXTRA_HEAD: meta.extraHead || ''
  };
  return template.replace(/\{\{(\w+)\}\}/g, function (all, key) {
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : all;
  });
}

/**
 * Normalises internal links in the generated output:
 *   - strips any leftover ".html" from internal page links
 *   - anchors the 404 as a real file
 *   - keeps asset paths root-relative
 * Links in _pages/ and _partials/ are already relative-free, so this is a
 * safety net that keeps hand-edited sources honest.
 */
function normaliseLinks(html) {
  const SLUGS = ['index', 'features', 'solutions', 'pricing', 'verify', 'about',
    'contact', 'security', 'privacy', 'terms', 'careers', 'blog', 'status'];

  SLUGS.forEach(function (slug) {
    const target = slug === 'index' ? '/' : '/' + slug + '/';
    html = html.replace(
      new RegExp('href="' + slug + '\\.html"', 'g'),
      'href="' + target + '"'
    );
    html = html.replace(
      new RegExp('href="' + slug + '\\.html#([^"]*)"', 'g'),
      'href="' + target + '#$1"'
    );
  });

  html = html.replace(/href="404\.html"/g, 'href="/404.html"');
  html = html.replace(/(href|src)="assets\//g, '$1="/assets/');
  return html;
}

function build() {
  const head = readPartial('head.html');
  const sprite = readPartial('sprite.html');
  const nav = readPartial('nav.html');
  const footer = readPartial('footer.html');

  const sources = fs.readdirSync(PAGES_DIR).filter(function (f) { return f.endsWith('.html'); });
  const built = [];
  const expected = new Set();

  sources.forEach(function (file) {
    const raw = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
    const parsed = parseFrontMatter(raw);

    const page = [
      fill(head, parsed.meta),
      '',
      sprite,
      '',
      nav,
      '',
      '<main id="main">',
      parsed.body.trim(),
      '</main>',
      '',
      footer,
      ''
    ].join('\n');

    const out = outputPathFor(file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, normaliseLinks(page), 'utf8');
    expected.add(path.resolve(out));

    const url = path.relative(ROOT, out).replace(/\\/g, '/').replace(/index\.html$/, '');
    built.push({ file: file, url: '/' + url });
  });

  // Prune stale output: any <slug>/index.html we generated previously but no
  // longer produce (e.g. after deleting or renaming a page).
  fs.readdirSync(ROOT, { withFileTypes: true }).forEach(function (entry) {
    if (!entry.isDirectory()) return;
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) return;
    if (['assets', 'brand', 'docs', 'node_modules'].indexOf(entry.name) !== -1) return;
    const indexFile = path.join(ROOT, entry.name, 'index.html');
    if (fs.existsSync(indexFile) && !expected.has(path.resolve(indexFile))) {
      fs.rmSync(path.join(ROOT, entry.name), { recursive: true, force: true });
      console.log('  pruned stale  /' + entry.name + '/');
    }
  });

  console.log('\nBuilt ' + built.length + ' page(s):');
  built.sort(function (a, b) { return a.url.localeCompare(b.url); });
  built.forEach(function (b) {
    console.log('  ' + b.url.padEnd(14) + ' <- _pages/' + b.file);
  });
}

try {
  build();
} catch (err) {
  console.error('Build failed: ' + err.message);
  process.exit(1);
}

