/**
 * Generates one static page per service in public/services/ from data/services.json.
 * Run: npm run build:services
 */
const fs = require('fs');
const path = require('path');
const services = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'services.json'), 'utf8'));
const outDir = path.join(__dirname, '..', 'public', 'services');
fs.mkdirSync(outDir, { recursive: true });
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function cta(s) {
  if (s.status !== 'live') return `<a class="btn gold" href="#waitlist">Join the waitlist</a>`;
  if (s.bookingType === 'shop') return `<a class="btn gold" href="../shop.html">Shop press-on nails</a>`;
  if (s.bookingType === 'quote') return `<a class="btn gold" href="#quote">Get a free quote</a> <a class="btn outline" href="../book.html?service=${s.id}">Book a date</a>`;
  return `<a class="btn gold" href="../book.html?service=${s.id}">Book now</a>`;
}

function quoteForm(s) {
  if (s.status !== 'live' || s.bookingType === 'shop') return '';
  const fields = (s.intake || []).map(f => {
    const id = 'q-' + f.name;
    let input;
    if (f.type === 'select') input = `<select id="${id}" name="${f.name}">${f.options.map(o => `<option>${esc(o)}</option>`).join('')}</select>`;
    else if (f.type === 'textarea') input = `<textarea id="${id}" name="${f.name}" placeholder="${esc(f.placeholder || '')}"></textarea>`;
    else input = `<input id="${id}" name="${f.name}" placeholder="${esc(f.placeholder || '')}">`;
    return `<div class="field"><label for="${id}">${esc(f.label)}</label>${input}</div>`;
  }).join('');
  const title = s.bookingType === 'quote' ? 'Get a free quote' : 'Ask a question first';
  return `
  <section class="section alt" id="quote">
    <div class="container grid cols-2" style="align-items:start">
      <div>
        <div class="eyebrow">${s.bookingType === 'quote' ? 'Step one' : 'Not ready to book?'}</div>
        <h2>${title}</h2>
        <p class="muted">${s.bookingType === 'quote' ? 'Tell us about the job and we reply within 24 hours with a clear price. Approve it, pay the deposit, and your date is locked.' : 'Send us a note and we will get right back to you.'}</p>
        ${s.notice ? `<div class="notice">${esc(s.notice)}</div>` : ''}
      </div>
      <form class="asb card" data-form="quote">
        <input type="hidden" name="service" value="${esc(s.name)}">
        <div class="row"><div class="field"><label for="q-name">Name</label><input id="q-name" name="name" required></div><div class="field"><label for="q-phone">Phone</label><input id="q-phone" name="phone" type="tel" required></div></div>
        <div class="field"><label for="q-email">Email</label><input id="q-email" name="email" type="email" required></div>
        <div class="field"><label for="q-address">Service address or area</label><input id="q-address" name="address"></div>
        ${fields}
        <input type="text" name="website" tabindex="-1" autocomplete="off" style="display:none" aria-hidden="true">
        <button class="btn primary" type="submit">Send request</button>
        <p class="form-note">Photos help. Reply to our confirmation email to attach them.</p>
      </form>
    </div>
  </section>`;
}

function waitlist(s) {
  if (s.status === 'live') return '';
  return `
  <section class="section alt" id="waitlist">
    <div class="container grid cols-2" style="align-items:center">
      <div><div class="eyebrow">Coming soon</div><h2>Be first in line</h2><p class="muted">${esc(s.name)} launches soon. Join the waitlist and you'll hear from us before anyone else, with a launch offer.</p></div>
      <form class="asb card" data-form="waitlist">
        <input type="hidden" name="service" value="${esc(s.name)}">
        <div class="row"><div class="field"><label for="w-name">Name</label><input id="w-name" name="name" required></div><div class="field"><label for="w-email">Email</label><input id="w-email" name="email" type="email" required></div></div>
        <div class="field"><label for="w-notes">What are you hoping for?</label><textarea id="w-notes" name="notes"></textarea></div>
        <button class="btn primary" type="submit">Join the waitlist</button>
      </form>
    </div>
  </section>`;
}

for (const s of services) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(s.name)} | ${esc(s.service)} by All Shades of Brown</title>
  <meta name="description" content="${esc(s.tagline)} ${esc(s.summary)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/asb.css">
</head>
<body data-page="service-${s.id}" data-root="..">
  <div id="site-header"></div>
  <section class="page-hero">
    <div class="container">
      <div class="icon" aria-hidden="true">${s.icon}</div>
      <div class="eyebrow" style="color:var(--gold)">${esc(s.service)} · <span class="badge ${s.status === 'live' ? 'live' : ''}">${s.status === 'live' ? 'Booking open' : 'Coming soon'}</span></div>
      <h1>${esc(s.name)}</h1>
      <p class="lead">${esc(s.tagline)}</p>
      <p style="margin-top:1.25rem">${cta(s)}</p>
    </div>
  </section>

  <section class="section">
    <div class="container grid cols-2" style="align-items:start">
      <div class="prose">
        <div class="eyebrow">About this service</div>
        <h2>${esc(s.service)}, the ASB way</h2>
        <p>${esc(s.summary)}</p>
        <p><strong>${esc(s.startingAt)}</strong>${s.deposit > 0 ? ` · <span class="muted">$${s.deposit} non-refundable deposit to book, applied to your total</span>` : ''}</p>
        <div class="card" style="margin-top:1.5rem;background:var(--latte);border:0;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;color:var(--caramel)">Photo gallery coming soon</div>
      </div>
      <div class="stack">
        <div class="card"><h3>What's included</h3><ul class="checks">${(s.included || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>
        <div class="card"><h3>How it works</h3><div class="steps" style="grid-template-columns:1fr">${(s.steps || []).map(st => `<div class="step">${esc(st)}</div>`).join('')}</div></div>
      </div>
    </div>
  </section>

  ${quoteForm(s)}
  ${waitlist(s)}

  <section class="section">
    <div class="container center">
      <h2>Ready when you are</h2>
      <p class="muted">Every ASB service comes with the same promise: on time, done right, treated like our own.</p>
      <p>${cta(s)}</p>
    </div>
  </section>

  <div id="site-footer"></div>
  <script src="../js/site.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(outDir, `${s.id}.html`), html);
  console.log('wrote services/' + s.id + '.html');
}
