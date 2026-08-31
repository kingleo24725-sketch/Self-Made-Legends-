/* ==========================================================================
   Self-Made Legends — selfmadelegendsz.com
   Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.

   Progressive enhancement only. With JavaScript disabled, both forms still
   submit normally to api/submit.php, which redirects back with a status in
   the query string. Nothing here is required for the site to function.
   ========================================================================== */
(function () {
  'use strict';

  /* ── mobile nav ─────────────────────────────────────────────────────── */
  var toggle = document.getElementById('navToggle');
  var links  = document.getElementById('navLinks');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Close' : 'Menu';
    });

    // close after tapping a link
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'Menu';
      }
    });

    // close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'Menu';
        toggle.focus();
      }
    });
  }

  /* ── form handling ──────────────────────────────────────────────────── */
  function setMessage(box, text, kind) {
    if (!box) return;
    box.textContent = text;
    box.className = 'form-msg show ' + kind;
  }

  function clearMessage(box) {
    if (!box) return;
    box.textContent = '';
    box.className = 'form-msg';
  }

  function wireForm(formId, msgId, successText) {
    var form = document.getElementById(formId);
    var msg  = document.getElementById(msgId);
    if (!form) return;

    form.addEventListener('submit', function (e) {
      // Let the browser show its own validation UI first.
      if (!form.checkValidity()) {
        form.reportValidity();
        e.preventDefault();
        return;
      }

      e.preventDefault();
      clearMessage(msg);

      var button = form.querySelector('button[type=submit]');
      var label  = button ? button.textContent : '';
      if (button) {
        button.disabled = true;
        button.textContent = 'Sending…';
      }

      function restore() {
        if (button) {
          button.disabled = false;
          button.textContent = label;
        }
      }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
        .then(function (res) {
          return res.json().catch(function () {
            throw new Error('The server sent an unexpected response.');
          });
        })
        .then(function (data) {
          restore();
          if (data && data.ok) {
            setMessage(msg, data.message || successText, 'ok');
            form.reset();
          } else {
            setMessage(msg, (data && data.message) || 'Something went wrong. Please try again.', 'err');
          }
        })
        .catch(function () {
          restore();
          setMessage(
            msg,
            'Could not reach the server. Please try again, or email info@selfmadelegendsz.com.',
            'err'
          );
        });
    });
  }

  wireForm('newsForm',    'newsMsg',    "You're on the list.");
  wireForm('legendForm',  'legendMsg',  'Your entry is in.');
  wireForm('supportForm', 'supportMsg', 'Message received.');

  /* ── no-JS fallback: surface ?sent= / ?error= from the PHP redirect ──── */
  var params = new URLSearchParams(window.location.search);
  var sent   = params.get('sent');
  var error  = params.get('error');

  var boxes = {
    newsletter: 'newsMsg',
    legend:     'legendMsg',
    support:    'supportMsg'
  };

  var successText = {
    newsletter: "You're on the list.",
    legend:     'Your entry is in. One name is called at the end of the month.',
    support:    'Message received. We read every one and will reply personally.'
  };

  if (sent && boxes[sent]) {
    setMessage(document.getElementById(boxes[sent]), successText[sent], 'ok');
  }

  if (error) {
    var which = params.get('form');
    var id = boxes[which] || 'newsMsg';
    setMessage(document.getElementById(id), decodeURIComponent(error), 'err');
  }

  // Tidy the URL so a refresh doesn't repeat the message.
  if ((sent || error) && window.history.replaceState) {
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
  }
})();

/* ==========================================================================
   Count the visit.

   Fired once per page load, after everything else has finished, so it can
   never compete with a photograph for bandwidth or hold up the first paint.

   sendBeacon is the right tool: the browser takes the payload and delivers
   it on its own time, outside the page's lifetime if need be. It survives
   the visitor closing the tab immediately, which a fetch() does not, and it
   cannot delay unload. If the browser is too old for it, nothing happens —
   one uncounted visit is not worth a fallback that could block.

   What is sent: the path, the referring page, and the window width. No
   cookie is set and no identifier is stored on the device, which is why
   this site needs no cookie banner. The server turns the IP into a hash
   that changes daily and never writes the address down — see api/hit.php.
   ========================================================================== */
(function () {
  'use strict';

  if (!navigator.sendBeacon) return;

  // Respect a visitor who has asked not to be tracked. Counting them would
  // be within the law and against the point.
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  function count() {
    try {
      var d = new FormData();
      d.append('path', location.pathname);
      d.append('ref', document.referrer || '');
      d.append('w', String(window.innerWidth || 0));
      navigator.sendBeacon('api/hit.php', d);
    } catch (e) {
      // A counter must never be the reason something on this page breaks.
    }
  }

  // requestIdleCallback puts it behind everything the visitor can see.
  if (window.requestIdleCallback) {
    requestIdleCallback(count, { timeout: 4000 });
  } else {
    setTimeout(count, 1200);
  }
})();
