/* ==========================================================================
   Self-Made Legends — Question of the Week
   Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.

   The question, the options and the results all come from api/poll.php.
   Nothing about the poll is configured in this file — change the question
   in api/poll.php and this follows.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('poll-body');
  if (!root) return;

  var API  = 'api/poll.php';
  var SEEN = 'sml_poll_voted';   // remembers, on this device only, which
                                 // poll id you last voted in

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Every storage call is wrapped: private windows and blocked site data
  // throw on access, and a poll that cannot remember your vote is still a
  // working poll.
  function remember(id) {
    try { window.localStorage.setItem(SEEN, id); } catch (e) { /* fine */ }
  }
  function remembered() {
    try { return window.localStorage.getItem(SEEN); } catch (e) { return null; }
  }

  function pct(n, total) {
    if (!total) return 0;
    return Math.round((n / total) * 100);
  }

  /* ── the ballot ────────────────────────────────────────────────────────── */

  function renderBallot(data) {
    var opts = (data.options || []).map(function (o) {
      return '' +
        '<label class="poll-opt">' +
          '<input type="radio" name="choice" value="' + esc(o.key) + '" required>' +
          '<span class="poll-opt-text">' + esc(o.label) + '</span>' +
        '</label>';
    }).join('');

    root.innerHTML = '' +
      '<form id="pollForm" method="post" action="' + API + '" novalidate>' +
        '<input type="hidden" name="poll_id" value="' + esc(data.id) + '">' +
        // honeypot — hidden from people, irresistible to bots
        '<div class="hp" aria-hidden="true">' +
          '<label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>' +
        '</div>' +
        '<div class="poll-opts">' + opts +
          '<label class="poll-opt">' +
            '<input type="radio" name="choice" value="other">' +
            '<span class="poll-opt-text">Something else &mdash; tell us</span>' +
          '</label>' +
        '</div>' +
        '<div class="poll-idea" id="pollIdea" hidden>' +
          '<label class="sr-only" for="poll_idea">What would you rather see?</label>' +
          '<textarea id="poll_idea" name="idea" rows="3" maxlength="500" ' +
            'placeholder="What would you rather see? Say it plainly."></textarea>' +
        '</div>' +
        '<div class="poll-actions">' +
          '<button class="btn btn-solid" type="submit">Cast My Vote</button>' +
        '</div>' +
        '<p class="form-msg" id="pollMsg" role="status" aria-live="polite"></p>' +
      '</form>';

    var form = document.getElementById('pollForm');
    var idea = document.getElementById('pollIdea');
    var box  = document.getElementById('poll_idea');

    // The write-in box only appears once "Something else" is chosen, so the
    // ballot reads as four choices rather than a form.
    form.addEventListener('change', function (e) {
      if (e.target.name !== 'choice') return;
      var other = e.target.value === 'other';
      idea.hidden = !other;
      if (other) box.focus();
    });

    form.addEventListener('submit', onSubmit);
  }

  function onSubmit(e) {
    e.preventDefault();

    var form   = e.currentTarget;
    var msg    = document.getElementById('pollMsg');
    var button = form.querySelector('button[type=submit]');
    var picked = form.querySelector('input[name=choice]:checked');

    if (!picked) {
      msg.textContent = 'Pick one first.';
      msg.className = 'form-msg show err';
      return;
    }

    button.disabled = true;
    button.textContent = 'Counting…';

    fetch(API, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        // A rejected vote can still carry the results — that is what comes
        // back when you have already voted from this address.
        if (data && data.options && data.counts) {
          remember(data.id);
          renderResults(data, data.message || '');
          return;
        }

        button.disabled = false;
        button.textContent = 'Cast My Vote';
        msg.textContent = (data && data.message) || 'Something went wrong. Please try again.';
        msg.className = 'form-msg show err';
      })
      .catch(function () {
        button.disabled = false;
        button.textContent = 'Cast My Vote';
        msg.textContent = 'Could not reach the server. Please try again.';
        msg.className = 'form-msg show err';
      });
  }

  /* ── the results ───────────────────────────────────────────────────────── */

  function renderResults(data, note) {
    var counts = data.counts || {};
    var total  = data.total || 0;

    var rows = (data.options || []).slice();
    rows.push({ key: 'other', label: 'Something else' });

    // Winner is whatever leads on votes. A tie shows both bars level and no
    // crown, which is honest — there is no winner yet.
    var top = 0;
    rows.forEach(function (r) { top = Math.max(top, counts[r.key] || 0); });
    var tied = top > 0 && rows.filter(function (r) { return (counts[r.key] || 0) === top; }).length > 1;

    var bars = rows.map(function (r) {
      var n = counts[r.key] || 0;
      var p = pct(n, total);
      var lead = n === top && top > 0 && !tied;

      return '' +
        '<li class="poll-res' + (lead ? ' lead' : '') + '">' +
          '<div class="poll-res-top">' +
            '<span class="poll-res-label">' +
              (lead ? '<svg class="poll-crown" viewBox="0 0 88 42" aria-hidden="true"><use href="#crown"/></svg>' : '') +
              esc(r.label) +
            '</span>' +
            '<span class="poll-res-num">' + p + '%</span>' +
          '</div>' +
          '<div class="poll-bar"><i style="width:' + p + '%"></i></div>' +
        '</li>';
    }).join('');

    root.innerHTML = '' +
      (note ? '<p class="form-msg show ok">' + esc(note) + '</p>' : '') +
      '<ul class="poll-results">' + bars + '</ul>' +
      '<p class="poll-total">' +
        esc(total) + (total === 1 ? ' vote' : ' votes') + ' so far &middot; ' +
        'one vote each &middot; results update as they come in' +
      '</p>';
  }

  /* ── what won last time ────────────────────────────────────────────────── */

  function renderPrevious(prev) {
    var slot = document.getElementById('poll-previous');
    if (!slot || !prev || !prev.winner || !prev.outcome) return;

    slot.innerHTML = '' +
      '<p class="eyebrow">Last time you asked</p>' +
      (prev.question ? '<p class="poll-prev-q">' + esc(prev.question) + '</p>' : '') +
      '<p class="poll-prev-win"><span>You said</span> ' + esc(prev.winner) + '</p>' +
      '<p class="poll-prev-did"><span>We did</span> ' + esc(prev.outcome) + '</p>';
    slot.hidden = false;
  }

  /* ── boot ──────────────────────────────────────────────────────────────── */

  fetch(API, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data || !data.ok) throw new Error('bad payload');

      var q = document.getElementById('poll-question');
      var n = document.getElementById('poll-note');
      if (q) q.textContent = data.question || '';
      if (n) n.textContent = data.note || '';

      renderPrevious(data.previous);

      // The server is the authority on whether you voted. localStorage only
      // matters when the server says no — the same house, two people, one
      // router, and the second person should still get to vote.
      if (data.voted && data.counts) {
        remember(data.id);
        renderResults(data, '');
      } else {
        if (remembered() !== data.id) {
          try { window.localStorage.removeItem(SEEN); } catch (e) { /* fine */ }
        }
        renderBallot(data);
      }
    })
    .catch(function () {
      root.innerHTML =
        '<p class="form-msg show err">The question could not be loaded. ' +
        'Please refresh, or come back shortly.</p>';
    });
})();
