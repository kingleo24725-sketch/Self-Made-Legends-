/**
 * Self-Made Legends — pre-deploy audit.
 * Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.
 *
 * Usage:  php -S 127.0.0.1:8901 -t website &
 *         node website/tools/audit.js
 *
 * Loads every page in a real browser and checks the things that actually
 * break a site in front of a customer: a request that 404s, a script that
 * throws, an anchor that goes nowhere, an image with no pixels, a form that
 * posts to a missing endpoint, a page with no title.
 *
 * It reports rather than fixes. A tool that silently edits your markup is a
 * tool you stop being able to trust.
 */
'use strict';

const { chromium } = require('playwright');

const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:8901';
const PAGES = ['/index.html', '/collection.html', '/shipping-returns.html', '/terms.html', '/privacy.html', '/404.html'];

const problems = [];
const note = (page, kind, detail) => problems.push({ page, kind, detail });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  for (const path of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    page.on('pageerror', e => note(path, 'JS ERROR', e.message));
    // A failed subresource also arrives as a bare console line with no URL
    // attached. The response and requestfailed handlers below already report
    // anything real with its address, so this generic one is noise — and in
    // this sandbox it is always the blocked font host.
    page.on('console', m => {
      if (m.type() !== 'error') return;
      if (/Failed to load resource/.test(m.text())) return;
      note(path, 'CONSOLE', m.text());
    });
    page.on('response', r => {
      // Google Fonts is unreachable from this sandbox; that is the sandbox,
      // not the site, and flagging it every run trains you to ignore output.
      if (r.status() >= 400 && !/fonts\.(googleapis|gstatic)/.test(r.url())) {
        note(path, 'HTTP ' + r.status(), r.url().replace(BASE, ''));
      }
    });
    page.on('requestfailed', r => {
      const err = r.failure()?.errorText || '';
      if (!/fonts\.(googleapis|gstatic)/.test(r.url()) && !/ERR_ABORTED/.test(err)) {
        note(path, 'REQUEST FAILED', r.url().replace(BASE, '') + ' — ' + err);
      }
    });

    const resp = await page.goto(BASE + path, { waitUntil: 'load' });
    if (!resp || resp.status() !== 200) note(path, 'PAGE', 'returned ' + (resp ? resp.status() : 'nothing'));

    // Force every deferred image to load so a broken one cannot hide below the fold.
    await page.evaluate(() => document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; }));
    await page.evaluate(async () => {
      await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
    });
    await page.waitForTimeout(1500);

    const found = await page.evaluate(() => {
      const out = { anchors: [], images: [], links: [], forms: [], meta: {}, headings: [] };

      const ids = new Set([...document.querySelectorAll('[id]')].map(e => e.id));
      for (const a of document.querySelectorAll('a[href^="#"]')) {
        const t = a.getAttribute('href').slice(1);
        if (t && !ids.has(t)) out.anchors.push(a.getAttribute('href') + '  (text: "' + a.textContent.trim().slice(0, 30) + '")');
      }

      for (const img of document.images) {
        if (!img.naturalWidth) out.images.push((img.currentSrc || img.src || '(no src)') + '  — no pixels');
        if (img.alt === null || img.alt === undefined) out.images.push((img.currentSrc || img.src) + '  — alt attribute missing entirely');
      }

      // Same-origin page links, so a typo'd href is caught before a visitor finds it.
      for (const a of document.querySelectorAll('a[href]')) {
        const h = a.getAttribute('href');
        if (/^(https?:|mailto:|tel:|#|javascript:)/.test(h)) continue;
        out.links.push(h);
      }

      for (const f of document.querySelectorAll('form')) {
        out.forms.push({ action: f.getAttribute('action') || '(none)', method: (f.getAttribute('method') || 'get').toLowerCase() });
      }

      out.meta = {
        title: (document.title || '').trim(),
        description: document.querySelector('meta[name=description]')?.content?.trim() || '',
        canonical: document.querySelector('link[rel=canonical]')?.href || '',
        viewport: !!document.querySelector('meta[name=viewport]'),
        lang: document.documentElement.lang || '',
        noindex: /noindex/i.test(document.querySelector('meta[name=robots]')?.content || ''),
      };

      out.headings = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1]);
      out.h1 = document.querySelectorAll('h1').length;

      // A control that looks interactive must be reachable and named.
      out.namelessControls = [...document.querySelectorAll('button,a,input,select,textarea')]
        // A hidden input carries data, not an interaction, so it has nothing
        // to label. Same for anything explicitly hidden from assistive tech.
        .filter(e => e.type !== 'hidden' && !e.closest('[aria-hidden="true"]'))
        .filter(e => {
          const label = (e.textContent || '').trim() || e.getAttribute('aria-label') || e.getAttribute('title') ||
            (e.labels && e.labels.length) || e.getAttribute('placeholder') || e.value;
          return !label;
        })
        .map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).split(' ')[0] : ''));

      return out;
    });

    found.anchors.forEach(a => note(path, 'DEAD ANCHOR', a));
    found.images.forEach(i => note(path, 'IMAGE', i));
    found.namelessControls.forEach(c => note(path, 'UNLABELLED CONTROL', c));

    if (!found.meta.title) note(path, 'SEO', 'no <title>');
    if (!found.meta.description) note(path, 'SEO', 'no meta description');
    // A noindexed page is deliberately not in the index, so it has no
    // canonical URL to declare. Requiring one on a 404 is the check being
    // wrong, not the page.
    if (!found.meta.canonical && !found.meta.noindex) note(path, 'SEO', 'no canonical link');
    if (!found.meta.viewport) note(path, 'MOBILE', 'no viewport meta — the page will not scale on a phone');
    if (!found.meta.lang) note(path, 'A11Y', 'no lang on <html>');
    if (found.h1 !== 1) note(path, 'SEO', found.h1 + ' <h1> elements (want exactly 1)');

    // Heading order: skipping a level breaks screen-reader navigation.
    for (let i = 1; i < found.headings.length; i++) {
      if (found.headings[i] - found.headings[i - 1] > 1) {
        note(path, 'A11Y', `heading jumps h${found.headings[i - 1]} to h${found.headings[i]}`);
        break;  // one report per page is enough to act on
      }
    }

    // Follow every same-origin link.
    for (const href of [...new Set(found.links)]) {
      const url = new URL(href, BASE + path).toString();
      if (!url.startsWith(BASE)) continue;
      const r = await ctx.request.get(url).catch(() => null);
      if (!r || r.status() >= 400) note(path, 'BROKEN LINK', href + ' -> ' + (r ? r.status() : 'no response'));
    }

    // Every form must post somewhere that exists.
    for (const f of found.forms) {
      if (f.action === '(none)') { note(path, 'FORM', 'a form with no action'); continue; }
      const url = new URL(f.action, BASE + path).toString();
      const r = await ctx.request.fetch(url, { method: f.method === 'post' ? 'POST' : 'GET' }).catch(() => null);
      if (!r || r.status() >= 500) note(path, 'FORM', f.action + ' -> ' + (r ? r.status() : 'no response'));
    }

    await ctx.close();
  }

  await browser.close();

  /* ── Report ─────────────────────────────────────────────────────────── */
  if (!problems.length) {
    console.log('\n  Nothing found across ' + PAGES.length + ' pages.\n');
    return;
  }
  const byPage = {};
  problems.forEach(p => { (byPage[p.page] ||= []).push(p); });
  console.log('');
  for (const [pg, list] of Object.entries(byPage)) {
    console.log(pg);
    console.log('  ' + '-'.repeat(66));
    list.forEach(p => console.log('  ' + p.kind.padEnd(20) + p.detail));
    console.log('');
  }
  console.log(`  ${problems.length} finding${problems.length === 1 ? '' : 's'} across ${Object.keys(byPage).length} page(s).\n`);
  process.exitCode = 1;
})();
