#!/usr/bin/env node
/**
 * Daily SEO health check + index submission.
 *
 *   node scripts/seo-check.mjs
 *
 * What this does — and what it cannot do:
 *
 *   This keeps the site INDEXED and CATCHES REGRESSIONS. It does not and
 *   cannot raise rankings. Search position comes from content, backlinks,
 *   technical health and time. No script can move it.
 *
 * Checks:
 *   1. every sitemap URL returns 200
 *   2. each page's canonical matches its sitemap URL
 *   3. title, meta description and a social image are present
 *   4. internal links resolve (no 404s leaking crawl budget)
 *   5. IndexNow submission to Bing / Yandex / Seznam (NOT Google —
 *      Google has no equivalent endpoint and discovers via the sitemap)
 *
 * Optional, if the Google service-account secrets are configured:
 *   6. Search Console report — impressions, clicks, average position
 *
 * Exit code is non-zero only on a real failure, so the workflow surfaces
 * breakage without crying wolf over a slow response.
 *
 * Environment:
 *   SITE_URL          default https://veritrace.in
 *   INDEXNOW_KEY      required for submission; skipped if absent
 *   GSC_SA_EMAIL      service account email   (optional)
 *   GSC_SA_KEY        service account private key, PEM (optional)
 *   GSC_SITE          Search Console property (optional)
 */

import { createSign } from 'node:crypto';

const SITE = (process.env.SITE_URL || 'https://veritrace.in').replace(/\/$/, '');
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';
const TIMEOUT_MS = 20000;

const problems = [];
const notes = [];

function ok(msg) { console.log('  \u2713 ' + msg); }
function warn(msg) { console.log('  ! ' + msg); notes.push(msg); }
function fail(msg) { console.log('  \u2717 ' + msg); problems.push(msg); }

async function get(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'VeriTrace-SEO-Check/1.0 (+https://veritrace.in)' }
    });
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------------------------------------------ *
 * 1-4. Sitemap, canonical, meta and link checks
 * ------------------------------------------------------------------ */

async function readSitemap() {
  const res = await get(SITE + '/sitemap.xml');
  if (!res.ok) throw new Error('sitemap.xml returned ' + res.status);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  return [...new Set(urls)];
}

function attr(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

async function checkPage(url) {
  const res = await get(url);
  if (!res.ok) {
    fail(url + ' -> HTTP ' + res.status);
    return null;
  }
  const html = await res.text();

  const canonical = attr(html, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
  if (!canonical) {
    fail(url + ' -> no canonical tag');
  } else if (canonical.replace(/\/$/, '') !== url.replace(/\/$/, '')) {
    fail(url + ' -> canonical mismatch: ' + canonical);
  }

  const title = attr(html, /<title>([^<]*)<\/title>/i);
  if (!title || title.length < 10) fail(url + ' -> missing or too-short title');
  else if (title.length > 65) warn(url + ' -> title is ' + title.length + ' chars (Google truncates ~60)');

  const desc = attr(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
  if (!desc) fail(url + ' -> missing meta description');
  else if (desc.length > 165) warn(url + ' -> description is ' + desc.length + ' chars (truncates ~155)');

  if (!/application\/ld\+json/.test(html)) fail(url + ' -> no structured data');

  const ogImage = attr(html, /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  if (!ogImage) {
    fail(url + ' -> no og:image');
  } else {
    const imgRes = await get(ogImage);
    if (!imgRes.ok) fail(url + ' -> og:image ' + ogImage + ' returns ' + imgRes.status);
  }

  return { url, html, canonical };
}

function internalLinks(html) {
  const hrefs = [...html.matchAll(/href="([^"#?]+)(?:[#?][^"]*)?"/g)].map((m) => m[1]);
  return [...new Set(hrefs)].filter((h) =>
    h.startsWith('/') &&
    !h.startsWith('//') &&
    !/\.(css|js|png|jpe?g|svg|webp|ico|xml|txt|webmanifest|woff2?)$/i.test(h)
  );
}

/* ------------------------------------------------------------------ *
 * 5. IndexNow — Bing, Yandex, Seznam, Naver. Not Google.
 * ------------------------------------------------------------------ */

async function submitIndexNow(urls) {
  if (!INDEXNOW_KEY) {
    warn('IndexNow skipped — INDEXNOW_KEY not set');
    return;
  }
  const keyFile = await get(SITE + '/' + INDEXNOW_KEY + '.txt');
  if (!keyFile.ok) {
    fail('IndexNow key file /' + INDEXNOW_KEY + '.txt returns ' + keyFile.status);
    return;
  }
  const body = await keyFile.text();
  if (body.trim() !== INDEXNOW_KEY) {
    fail('IndexNow key file contents do not match the key');
    return;
  }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE).host,
      key: INDEXNOW_KEY,
      keyLocation: SITE + '/' + INDEXNOW_KEY + '.txt',
      urlList: urls
    })
  });

  // 200 = accepted, 202 = accepted pending key validation
  if (res.status === 200 || res.status === 202) {
    ok('IndexNow accepted ' + urls.length + ' URL(s) (HTTP ' + res.status + ')');
  } else {
    warn('IndexNow returned HTTP ' + res.status + ' — check the key file is live');
  }
}

/* ------------------------------------------------------------------ *
 * 6. Search Console report (optional — needs a service account)
 * ------------------------------------------------------------------ */

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function googleAccessToken(email, key) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const signingInput = header + '.' + claim;

  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(key.replace(/\\n/g, '\n')).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signingInput + '.' + signature
    })
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(json.error_description || 'no access token');
  return json.access_token;
}

async function searchConsoleReport() {
  const email = process.env.GSC_SA_EMAIL;
  const key = process.env.GSC_SA_KEY;
  const site = process.env.GSC_SITE;

  if (!email || !key || !site) {
    warn('Search Console report skipped — GSC_SA_EMAIL / GSC_SA_KEY / GSC_SITE not set');
    return;
  }

  try {
    const token = await googleAccessToken(email, key);
    const end = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    const start = new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 10);

    const res = await fetch(
      'https://searchconsole.googleapis.com/webmasters/v3/sites/' +
      encodeURIComponent(site) + '/searchAnalytics/query',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: start,
          endDate: end,
          dimensions: ['query'],
          rowLimit: 15
        })
      }
    );
    const json = await res.json();
    const rows = json.rows || [];

    console.log('\n  Search Console — last 28 days (' + start + ' to ' + end + ')');
    if (!rows.length) {
      console.log('    no impressions recorded yet — normal for a new site');
      return;
    }
    console.log('    ' + 'query'.padEnd(42) + 'clicks  impr   pos');
    rows.forEach((r) => {
      console.log('    ' +
        String(r.keys[0]).slice(0, 40).padEnd(42) +
        String(r.clicks).padStart(5) + '  ' +
        String(r.impressions).padStart(5) + '  ' +
        r.position.toFixed(1).padStart(5));
    });

    const totals = rows.reduce((a, r) => ({
      clicks: a.clicks + r.clicks,
      impressions: a.impressions + r.impressions
    }), { clicks: 0, impressions: 0 });
    console.log('    ' + 'TOTAL (top 15 queries)'.padEnd(42) +
      String(totals.clicks).padStart(5) + '  ' + String(totals.impressions).padStart(5));
  } catch (e) {
    warn('Search Console report failed: ' + e.message);
  }
}

/* ------------------------------------------------------------------ */

async function main() {
  console.log('\nSEO health check — ' + SITE + '  (' + new Date().toISOString() + ')\n');

  console.log('Sitemap and pages');
  let urls;
  try {
    urls = await readSitemap();
  } catch (e) {
    fail('could not read sitemap: ' + e.message);
    report();
    return;
  }
  ok('sitemap lists ' + urls.length + ' URL(s)');

  const pages = [];
  for (const url of urls) {
    const p = await checkPage(url);
    if (p) pages.push(p);
  }
  if (pages.length === urls.length) ok('all ' + urls.length + ' page(s) respond and carry metadata');

  console.log('\nInternal links');
  const targets = new Set();
  pages.forEach((p) => internalLinks(p.html).forEach((h) => targets.add(h)));
  let broken = 0;
  for (const t of targets) {
    const res = await get(SITE + t);
    if (!res.ok) { fail('broken internal link: ' + t + ' -> ' + res.status); broken++; }
  }
  if (!broken) ok(targets.size + ' internal link target(s) resolve');

  console.log('\nIndex submission');
  await submitIndexNow(urls);

  console.log('\nSearch visibility');
  await searchConsoleReport();

  report();
}

function report() {
  console.log('\n' + '─'.repeat(64));
  if (problems.length) {
    console.log('FAILED — ' + problems.length + ' problem(s):');
    problems.forEach((p) => console.log('  \u2717 ' + p));
  } else {
    console.log('PASSED — no SEO problems found');
  }
  if (notes.length) {
    console.log('\n' + notes.length + ' note(s):');
    notes.forEach((n) => console.log('  ! ' + n));
  }
  console.log('');
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error('\nUnexpected failure: ' + e.message);
  process.exit(1);
});
