/* All Shades of Brown — shared site script (no build step) */
(function () {
  const ROOT = ('root' in document.body.dataset) ? document.body.dataset.root : '.';
  const ASB = (window.ASB = window.ASB || {});
  ASB.root = ROOT;

  ASB.services = null;
  ASB.loadServices = async function () {
    if (ASB.services) return ASB.services;
    const res = await fetch(ROOT + '/data/services.json', { cache: 'no-cache' });
    ASB.services = await res.json();
    return ASB.services;
  };

  ASB.page = document.body.dataset.page || '';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  ASB.esc = esc;

  /* ---------- Header / footer ---------- */
  function renderHeader(services) {
    const items = services.map(s => `
      <a href="${ROOT}/services/${s.id}.html">
        <span class="ico">${s.icon}</span>
        <span class="lbl">${esc(s.name)}<small>${esc(s.service)}</small></span>
        ${s.status === 'soon' ? '<span class="soon">Soon</span>' : ''}
      </a>`).join('');
    const link = (href, label, key) => `<a href="${ROOT}/${href}" class="${ASB.page === key ? 'active' : ''}">${label}</a>`;
    return `
    <header class="site-header">
      <div class="container bar">
        <a class="brand" href="${ROOT}/index.html" aria-label="All Shades of Brown home">
          <span class="mark" aria-hidden="true"></span>
          <span class="name">All Shades of Brown<small>Services · Community · Care</small></span>
        </a>
        <button class="menu-toggle" aria-label="Open menu" aria-expanded="false">☰</button>
        <nav class="nav" aria-label="Main">
          ${link('about.html', 'About ASB', 'about')}
          <div class="has-menu">
            <button type="button" aria-haspopup="true">Services ▾</button>
            <div class="menu">${items}</div>
          </div>
          ${link('shop.html', 'Shop', 'shop')}
          ${link('community.html', 'Community', 'community')}
          ${link('careers.html', 'Careers', 'careers')}
          ${link('contact.html', 'Contact', 'contact')}
          <a href="${ROOT}/book.html" class="btn primary small cta">Book a service</a>
        </nav>
      </div>
    </header>`;
  }

  function renderFooter(services) {
    const svc = services.map(s => `<li><a href="${ROOT}/services/${s.id}.html">${esc(s.name)}</a></li>`).join('');
    const year = new Date().getFullYear();
    return `
    <footer class="site-footer">
      <div class="container">
        <div class="grid">
          <div>
            <a class="brand" href="${ROOT}/index.html" style="color:var(--ivory)"><span class="mark" aria-hidden="true"></span><span class="name">All Shades of Brown</span></a>
            <p style="margin-top:1rem;max-width:26rem">One family of services, every shade of care. Founded by Rose Brown to serve our community with excellence and heart.</p>
            <h4>Join the ASB community</h4>
            <form class="newsletter" data-form="newsletter">
              <input type="email" name="email" placeholder="Your email" required aria-label="Email address">
              <button class="btn gold small" type="submit">Join</button>
            </form>
            <div class="social" aria-label="Social media">
              <a href="#" aria-label="Instagram">IG</a><a href="#" aria-label="Facebook">FB</a><a href="#" aria-label="TikTok">TT</a><a href="#" aria-label="YouTube">YT</a>
            </div>
          </div>
          <div><h4>Services</h4><ul>${svc}</ul></div>
          <div><h4>Company</h4><ul>
            <li><a href="${ROOT}/about.html">About ASB</a></li>
            <li><a href="${ROOT}/book.html">Book a service</a></li>
            <li><a href="${ROOT}/community.html">Community &amp; events</a></li>
            <li><a href="${ROOT}/community.html#giveaway">Sweepstakes &amp; giveaways</a></li>
            <li><a href="${ROOT}/careers.html">Careers</a></li>
            <li><a href="${ROOT}/contact.html">Contact</a></li>
          </ul></div>
          <div><h4>Legal</h4><ul>
            <li><a href="${ROOT}/legal/terms.html">Terms of Service</a></li>
            <li><a href="${ROOT}/legal/privacy.html">Privacy Policy</a></li>
            <li><a href="${ROOT}/legal/refunds.html">Deposits, Cancellations &amp; Refunds</a></li>
            <li><a href="${ROOT}/legal/sweepstakes.html">Sweepstakes Rules</a></li>
          </ul></div>
        </div>
        <div class="bottom">
          <span>© ${year} All Shades of Brown. All rights reserved.</span>
          <span class="legal"><a href="${ROOT}/legal/privacy.html">Privacy</a><a href="${ROOT}/legal/terms.html">Terms</a><a href="${ROOT}/contact.html">Contact</a></span>
        </div>
      </div>
    </footer>`;
  }

  /* ---------- Forms ---------- */
  function showMsg(form, kind, text) {
    let box = form.querySelector('.alert');
    if (!box) { box = document.createElement('div'); form.appendChild(box); }
    box.className = 'alert ' + kind; box.textContent = text;
  }

  async function submitForm(form) {
    const type = form.dataset.form;
    const data = Object.fromEntries(new FormData(form).entries());
    const btn = form.querySelector('[type=submit]');
    if (btn) btn.disabled = true;
    try {
      const res = await fetch(ROOT + '/api/forms/' + encodeURIComponent(type), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
      showMsg(form, 'ok', json.message || 'Thank you! We received your message.');
      form.querySelectorAll('input:not([type=hidden]), textarea, select').forEach(el => { if (el.type === 'checkbox') el.checked = false; else el.value = ''; });
    } catch (err) {
      showMsg(form, 'err', err.message);
    } finally { if (btn) btn.disabled = false; }
  }

  function wireForms(scope) {
    scope.querySelectorAll('form[data-form]').forEach(form => {
      if (form.dataset.wired) return; form.dataset.wired = '1';
      form.addEventListener('submit', e => { e.preventDefault(); submitForm(form); });
    });
  }
  ASB.wireForms = wireForms;

  /* ---------- Calendar widget ---------- */
  ASB.calendar = function (el, opts) {
    const o = Object.assign({ minDate: new Date(), events: {}, onSelect: () => {}, disablePast: true, disableSundays: false }, opts);
    let view = new Date(); view.setDate(1);
    let selected = null;
    const key = d => d.toISOString().slice(0, 10);
    function draw() {
      const y = view.getFullYear(), m = view.getMonth();
      const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
      const monthName = first.toLocaleString('default', { month: 'long', year: 'numeric' });
      let html = `<div class="head"><button type="button" data-nav="-1" aria-label="Previous month">‹</button><strong>${monthName}</strong><button type="button" data-nav="1" aria-label="Next month">›</button></div>`;
      html += '<div class="dow">' + ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => `<span>${d}</span>`).join('') + '</div><div class="days">';
      for (let i = 0; i < first.getDay(); i++) html += '<button type="button" class="day other" tabindex="-1"></button>';
      const today = new Date(); today.setHours(0, 0, 0, 0);
      for (let d = 1; d <= last.getDate(); d++) {
        const date = new Date(y, m, d); const k = key(date);
        const past = o.disablePast && date < today;
        const sun = o.disableSundays && date.getDay() === 0;
        const cls = ['day', o.events[k] ? 'event' : '', selected === k ? 'selected' : ''].filter(Boolean).join(' ');
        html += `<button type="button" class="${cls}" data-date="${k}" ${past || sun ? 'disabled' : ''}>${d}</button>`;
      }
      el.innerHTML = html + '</div>';
      el.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => { view.setMonth(view.getMonth() + Number(b.dataset.nav)); draw(); }));
      el.querySelectorAll('.day[data-date]').forEach(b => b.addEventListener('click', () => { selected = b.dataset.date; draw(); o.onSelect(selected, o.events[selected] || []); }));
    }
    el.classList.add('calendar'); draw();
    return { select(k) { selected = k; view = new Date(k + 'T00:00:00'); view.setDate(1); draw(); }, redraw: draw };
  };

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    let services = [];
    try { services = await ASB.loadServices(); } catch (e) { console.error('services.json failed to load', e); }
    const h = document.getElementById('site-header'); if (h) h.outerHTML = renderHeader(services);
    const f = document.getElementById('site-footer'); if (f) f.outerHTML = renderFooter(services);
    const toggle = document.querySelector('.menu-toggle'), nav = document.querySelector('.nav');
    if (toggle && nav) toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
    document.querySelectorAll('.has-menu > button').forEach(b => b.addEventListener('click', e => { e.preventDefault(); b.parentElement.classList.toggle('open'); }));
    wireForms(document);
    document.dispatchEvent(new CustomEvent('asb:ready', { detail: { services } }));
  });
})();
