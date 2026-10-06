/**
 * VeriTrace AI — static page builder (zero dependencies).
 *
 *   node build.js
 *
 * Assembles every page in ./_pages into a standalone .html file at the
 * project root, wrapping the page body with the shared chrome:
 *
 *   _partials/head.html    +  _partials/sprite.html  +  _partials/nav.html
 *   + <page body>          +  _partials/footer.html
 *
 * Each file in _pages starts with a JSON front-matter block:
 *
 *   <!--@
 *   { "title": "...", "desc": "...", "keywords": "...",
 *     "canonical": "https://veritrace.in/xyz", "robots": "index, follow" }
 *   @-->
 *
 * Edit the partials or a page, re-run `node build.js`, and the root HTML
 * files are regenerated. Pages already at the root that have no matching
 * source file (index.html, features.html) are left untouched.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PAGES_DIR = path.join(ROOT, '_pages');
const PARTIALS_DIR = path.join(ROOT, '_partials');

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

function build() {
  const head = readPartial('head.html');
  const sprite = readPartial('sprite.html');
  const nav = readPartial('nav.html');
  const footer = readPartial('footer.html');

  const sources = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.html'));
  const built = [];

  sources.forEach((file) => {
    const raw = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
    const parsed = parseFrontMatter(raw);
    const meta = parsed.meta;

    const page = [
      fill(head, meta),
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

    fs.writeFileSync(path.join(ROOT, file), page, 'utf8');
    built.push(file);
  });

  console.log('Built ' + built.length + ' page(s):');
  built.forEach((f) => console.log('  → ' + f));
}

try {
  build();
} catch (err) {
  console.error('Build failed: ' + err.message);
  process.exit(1);
}
