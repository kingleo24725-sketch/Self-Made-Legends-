/* ==========================================================================
   Self-Made Legends — hero film loop and the sound control
   Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.

   ┌──────────────────────────────────────────────────────────────────────┐
   │  ABOUT PLAYING MUSIC WHEN THE PAGE OPENS                             │
   │                                                                      │
   │  You cannot. Every current browser blocks audio that starts before   │
   │  the visitor has interacted with the page — Chrome, Safari, Firefox  │
   │  and Edge all do it, and they do not tell you they have. A site      │
   │  that "plays music on load" is a site playing silence.               │
   │                                                                      │
   │  What IS allowed, and what this file does:                           │
   │                                                                      │
   │    1. A MUTED video may autoplay. So the hero carries the film on a  │
   │       loop with no sound — the motion is free, and it is what makes  │
   │       a shop feel open rather than photographed.                     │
   │                                                                      │
   │    2. Once the visitor clicks anything, audio is unlocked. The       │
   │       Sound button turns the theme on, and the choice is remembered  │
   │       so it does not have to be made twice.                          │
   │                                                                      │
   │  That is the same pattern every luxury brand site uses, for the same │
   │  reason. It is not a compromise; it is the only version that plays.  │
   └──────────────────────────────────────────────────────────────────────┘
   ========================================================================== */
(function () {
  'use strict';

  var VIDEO = 'assets/video/sml-hero-loop.mp4';
  var THEME = 'assets/video/sml-theme.mp3';
  var KEY   = 'sml-sound';

  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Data Saver, or a connection that will make a 1MB loop hurt. `connection`
  // is unsupported in Safari, hence the optional chaining by hand.
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var thrifty = !!(conn && (conn.saveData === true ||
                            /^(slow-)?2g$/.test(conn.effectiveType || '')));

  /* ── 1. the muted loop ─────────────────────────────────────────────────
     Added only when it earns its place. The still image underneath is the
     guaranteed layer and the page is complete without this ever running. */
  function addLoop() {
    var mount = document.querySelector('.hero-city');
    if (!mount || reduced || thrifty) return;
    if (window.innerWidth < 700) return;   // phones keep the still

    var v = document.createElement('video');
    v.src = VIDEO;
    v.muted = true;                        // must be set before play()
    v.defaultMuted = true;                 // and as an attribute, for Safari
    v.setAttribute('muted', '');
    v.loop = true;
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'auto';
    v.className = 'hero-loop';

    // Only reveal it once frames actually exist. Otherwise a slow network
    // shows a black rectangle over the still for several seconds.
    v.addEventListener('canplay', function () { v.classList.add('on'); }, { once: true });
    v.addEventListener('error', function () { v.remove(); });

    mount.appendChild(v);

    var p = v.play();
    if (p && typeof p.catch === 'function') {
      // Autoplay refused anyway — some battery-saver modes do. Remove it and
      // leave the still, rather than a frozen first frame pretending to play.
      p.catch(function () { v.remove(); });
    }
  }

  /* ── 2. the sound control ──────────────────────────────────────────────
     Deliberately opt-in, and it stays where the visitor put it. */
  function addSound() {
    var btn = document.getElementById('soundToggle');
    if (!btn) return;

    var audio = null;
    var on = false;

    function make() {
      if (audio) return audio;
      audio = new Audio(THEME);
      audio.loop = true;
      audio.volume = 0;                 // faded up, never a jump scare
      return audio;
    }

    function fade(to, done) {
      var a = make(), step = (to - a.volume) / 18;
      var id = setInterval(function () {
        a.volume = Math.min(1, Math.max(0, a.volume + step));
        if ((step > 0 && a.volume >= to) || (step < 0 && a.volume <= to)) {
          clearInterval(id); a.volume = to; if (done) done();
        }
      }, 40);
    }

    function set(next, remember) {
      on = next;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('is-on', on);
      btn.querySelector('.sound-t').textContent = on ? 'Sound on' : 'Sound';

      if (on) {
        var a = make();
        var p = a.play();
        if (p && typeof p.catch === 'function') {
          p.catch(function () { set(false, false); });   // still blocked; don't lie
        }
        fade(0.45);
      } else if (audio) {
        fade(0, function () { audio.pause(); });
      }
      if (remember) {
        try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* private mode */ }
      }
    }

    btn.hidden = false;
    btn.addEventListener('click', function () { set(!on, true); });

    // A remembered "on" still cannot start on its own — the browser has not
    // seen a gesture yet on this load. Arm it for the first click anywhere.
    var wanted = false;
    try { wanted = localStorage.getItem(KEY) === '1'; } catch (e) { /* ignore */ }
    if (wanted) {
      var arm = function () { set(true, false); document.removeEventListener('click', arm); };
      document.addEventListener('click', arm, { once: true });
    }

    // Never leave music playing in a tab nobody is looking at.
    document.addEventListener('visibilitychange', function () {
      if (!audio) return;
      if (document.hidden) { audio.pause(); }
      else if (on) { audio.play().catch(function () {}); }
    });
  }

  addLoop();
  addSound();
})();
