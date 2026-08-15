(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════════
     SML Music Engine — Mixed Soundtrack
     Cycles: Cinematic Intro → Trap → Electronic → Lo-Fi → Cinematic Swell
  ══════════════════════════════════════════════════════════════════════ */

  const SMLMusic = {
    _ctx: null,
    _master: null,
    _playing: false,
    _muted: localStorage.getItem('sml_music_muted') === '1',
    _timers: [],
    _gestured: false,
    _nextBar: 0,
    _section: 0,   // cycles through SECTIONS
    _barCount: 0,  // bars played in current section

    BPM: 88,

    SECTIONS: ['trap', 'electronic', 'lofi', 'cinematic'],
    BARS_PER_SECTION: 8,

    // ── Context ─────────────────────────────────────────────────────────
    _getCtx() {
      if (!this._ctx) {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._master = this._ctx.createGain();
        this._master.gain.setValueAtTime(this._muted ? 0 : 0.36, this._ctx.currentTime);
        this._master.connect(this._ctx.destination);
      }
      if (this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    },

    // ── Primitives ───────────────────────────────────────────────────────
    _osc(freq, type, t, dur, vol, dest) {
      const ctx = this._ctx;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(dest || this._master);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.007);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.04);
    },

    _sweep(t, f0, f1, type, dur, vol) {
      const ctx = this._ctx;
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(this._master);
      osc.type = type;
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.04);
    },

    _noise(t, dur, vol, hp, lp) {
      const ctx = this._ctx;
      const size = Math.floor(ctx.sampleRate * Math.min(dur + 0.05, 2));
      const buf  = ctx.createBuffer(1, size, ctx.sampleRate);
      const d    = buf.getChannelData(0);
      for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      let node = src;
      if (hp) {
        const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
        src.connect(f); node = f;
      }
      if (lp) {
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
        node.connect(f); node = f;
      }
      const g = ctx.createGain(); node.connect(g); g.connect(this._master);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.start(t); src.stop(t + dur + 0.04);
    },

    _pad(freqs, t, dur, vol, wave) {
      freqs.forEach(f => {
        const ctx = this._ctx;
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.connect(g); g.connect(this._master);
        osc.type = wave || 'triangle';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.4);
        g.gain.setValueAtTime(vol, t + Math.max(dur - 0.45, 0.1));
        g.gain.linearRampToValueAtTime(0, t + dur);
        osc.start(t); osc.stop(t + dur + 0.04);
      });
    },

    // ── Drum voices ──────────────────────────────────────────────────────
    _kick(t, vol) {
      const ctx = this._ctx, v = vol || 0.88;
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(this._master);
      osc.frequency.setValueAtTime(155, t);
      osc.frequency.exponentialRampToValueAtTime(36, t + 0.19);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);
      osc.start(t); osc.stop(t + 0.48);
    },

    _snare(t, vol) {
      this._noise(t, 0.17, (vol || 0.32), 1000, null);
      this._osc(205, 'triangle', t, 0.09, (vol || 0.22));
    },

    _rimshot(t, vol) {
      this._noise(t, 0.055, (vol || 0.28), 3000, null);
      this._osc(480, 'square', t, 0.04, (vol || 0.12));
    },

    _hat(t, vol, open) {
      this._noise(t, open ? 0.18 : 0.05, vol || 0.09, 7500, null);
    },

    _808(freq, t, dur, vol) {
      const ctx = this._ctx;
      const osc = ctx.createOscillator();
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 170;
      const g   = ctx.createGain();
      osc.connect(flt); flt.connect(g); g.connect(this._master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.91, t + 0.07);
      g.gain.setValueAtTime(vol || 0.72, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.5));
      osc.start(t); osc.stop(t + (dur || 0.5) + 0.04);
    },

    _clap(t, vol) {
      [0, 0.012, 0.024].forEach(offset => {
        this._noise(t + offset, 0.13, (vol || 0.26), 800, 8000);
      });
    },

    // ── CHORD PALETTES ───────────────────────────────────────────────────
    // Am – F – C – G  (all modes share this root)
    _CH: {
      trap:       [[220,261,330],[174,220,261],[130,196,261],[196,246,294]],
      electronic: [[220,277,330],[174,220,261],[130,164,196],[164,207,247]],
      lofi:       [[220,261,330,392],[174,220,261,329],[130,196,261,329],[196,246,294,370]],
      cinematic:  [[110,165,220,330],[87,131,174,261],[130,165,196,261],[98,147,196,294]],
    },
    _BASS: {
      trap:       [55, 43.65, 32.7, 49],
      electronic: [55, 43.65, 32.7, 41.2],
      lofi:       [55, 43.65, 32.7, 49],
      cinematic:  [55, 43.65, 32.7, 49],
    },

    // ── SECTION SCHEDULERS ───────────────────────────────────────────────

    _barTrap(t) {
      const beat = 60 / this.BPM;
      // Kick: 1, off-beat before 2 (trap), 3
      this._kick(t);
      this._kick(t + beat * 0.75, 0.6);
      this._kick(t + beat * 2);
      // Snare: 2 & 4
      this._snare(t + beat);
      this._snare(t + beat * 3);
      // Clap layered on snare
      this._clap(t + beat, 0.2);
      this._clap(t + beat * 3, 0.2);
      // 16th hi-hats
      for (let i = 0; i < 8; i++) {
        const ht = t + i * beat * 0.5;
        const isOff = i % 2 === 1;
        this._hat(ht, isOff ? 0.055 : 0.1, false);
      }
      this._hat(t + beat * 1.5, 0.14, true); // open hat
      // 808 bass groove
      const ch = this._CH.trap; const bs = this._BASS.trap;
      [0,1,2,3].forEach(b => {
        this._808(bs[b], t + b * beat, beat * 0.8, 0.68);
        this._pad(ch[b], t + b * beat, beat * 0.92, 0.042);
      });
      // Trap melody (synth stabs)
      [[880,0],[784,0.5],[880,1.5],[988,2],[880,2.5],[784,3],[659,3.5]].forEach(([f,off]) => {
        this._osc(f, 'sawtooth', t + off * beat, beat * 0.18, 0.055);
      });
    },

    _barElectronic(t) {
      const beat = 60 / this.BPM;
      // Four-on-floor kick
      for (let b = 0; b < 4; b++) this._kick(t + b * beat, 0.82);
      // Snare on 2 & 4
      this._snare(t + beat, 0.28); this._snare(t + beat * 3, 0.28);
      // Driving 16th hi-hats
      for (let i = 0; i < 16; i++) {
        this._hat(t + i * beat * 0.25, i % 4 === 0 ? 0.12 : 0.065, false);
      }
      this._hat(t + beat * 0.75, 0.16, true);
      this._hat(t + beat * 2.75, 0.16, true);
      // Electronic bass pulse
      const bs = this._BASS.electronic; const ch = this._CH.electronic;
      [0,1,2,3].forEach(b => {
        this._808(bs[b], t + b * beat, beat * 0.6, 0.62);
        this._pad(ch[b], t + b * beat, beat * 0.9, 0.04, 'sawtooth');
      });
      // Synth arpeggio
      const arp = [880,1047,1319,1047, 784,880,1047,880];
      arp.forEach((f, i) => {
        this._osc(f, 'sawtooth', t + i * beat * 0.5, beat * 0.22, 0.06);
      });
      // Synth sweep rise every bar
      this._sweep(t, 220, 880, 'sawtooth', beat * 3.5, 0.04);
    },

    _barLofi(t) {
      const beat = 60 / this.BPM;
      // Lazy kick (1 and 3, slightly late feel)
      this._kick(t + 0.012, 0.7);
      this._kick(t + beat * 2 + 0.018, 0.65);
      // Soft snare 2 & 4
      this._snare(t + beat, 0.2);
      this._snare(t + beat * 3, 0.22);
      // Shuffled hi-hats (swing feel)
      const swing = beat * 0.08;
      for (let b = 0; b < 4; b++) {
        this._hat(t + b * beat,               0.08,  false);
        this._hat(t + b * beat + beat*0.5 + swing, 0.055, false);
        this._hat(t + b * beat + beat*0.75,   0.035, false);
      }
      this._hat(t + beat * 1.5, 0.12, true);
      // Lo-fi bass (rounder, shorter)
      const bs = this._BASS.lofi; const ch = this._CH.lofi;
      [0,1,2,3].forEach(b => {
        this._808(bs[b], t + b * beat + 0.018, beat * 0.55, 0.55);
        this._pad(ch[b], t + b * beat, beat * 0.95, 0.05, 'triangle');
      });
      // Mellow melody (piano-like sine)
      [[880,0],[784,1],[659,1.5],[698,2],[784,2.5],[880,3],[784,3.5]].forEach(([f,off]) => {
        this._osc(f, 'sine', t + off * beat, beat * 0.35, 0.07);
      });
      // Vinyl crackle texture
      this._noise(t, beat * 4, 0.018, 2000, 6000);
    },

    _barCinematic(t) {
      const beat = 60 / this.BPM;
      const bar  = beat * 4;
      // Cinematic kick (half-time feel: 1 and 3)
      this._kick(t, 1.0);
      this._kick(t + beat * 2, 0.85);
      // Heavy snare/clap 2 & 4
      this._snare(t + beat, 0.42); this._clap(t + beat, 0.35);
      this._snare(t + beat * 3, 0.38); this._clap(t + beat * 3, 0.3);
      // Sparse hats
      this._hat(t + beat * 0.5, 0.07, false);
      this._hat(t + beat * 1.5, 0.07, false);
      this._hat(t + beat * 2.5, 0.07, false);
      this._hat(t + beat * 3.5, 0.07, false);
      // Epic 808
      this._808(55, t, bar * 0.45, 0.85);
      this._808(43.65, t + beat * 2, bar * 0.45, 0.78);
      // Cinematic string-like pads (full bar)
      const ch = this._CH.cinematic;
      [0,1,2,3].forEach(b => {
        this._pad(ch[b], t + b * beat, beat * 0.97, 0.08, 'triangle');
      });
      // Dramatic stabs (brass-like sawtooth)
      this._osc(220, 'sawtooth', t,            0.25, 0.08);
      this._osc(277, 'sawtooth', t,            0.25, 0.06);
      this._osc(174, 'sawtooth', t + beat * 2, 0.25, 0.08);
      this._osc(220, 'sawtooth', t + beat * 2, 0.25, 0.06);
      // Rising tension sweep every 4 bars
      if (this._barCount % 4 === 3) {
        this._sweep(t + beat * 2, 110, 880, 'sawtooth', beat * 2, 0.08);
      }
      // High string melody
      [[1319,0],[1175,0.5],[1047,1],[880,1.5],[988,2],[1047,2.5],[880,3],[988,3.5]].forEach(([f,off]) => {
        this._osc(f, 'sine', t + off * beat, beat * 0.28, 0.055);
      });
    },

    // ── SCHEDULE ENGINE ─────────────────────────────────────────────────
    _scheduleBar(t) {
      const section = this.SECTIONS[this._section % this.SECTIONS.length];

      // Cross-fade transition: brief cinematic swell between sections
      if (this._barCount === 0 && this._section > 0) {
        this._sweep(t, 55, 440, 'sine', (60 / this.BPM) * 0.5, 0.12);
      }

      switch (section) {
        case 'trap':       this._barTrap(t);       break;
        case 'electronic': this._barElectronic(t); break;
        case 'lofi':       this._barLofi(t);       break;
        case 'cinematic':  this._barCinematic(t);  break;
      }

      this._barCount++;
      if (this._barCount >= this.BARS_PER_SECTION) {
        this._barCount = 0;
        this._section++;
      }
    },

    _loop() {
      if (!this._playing) return;
      const ctx  = this._ctx;
      const bar  = (60 / this.BPM) * 4;
      const LOOK = bar * 2.5;

      while (this._nextBar < ctx.currentTime + LOOK) {
        this._scheduleBar(this._nextBar);
        this._nextBar += bar;
      }

      const id = setTimeout(() => { if (this._playing) this._loop(); }, bar * 480);
      this._timers.push(id);
    },

    // ── EPIC INTRO FANFARE (~8 s) ────────────────────────────────────────
    _playIntro() {
      const ctx = this._getCtx();
      const t   = ctx.currentTime + 0.1;

      // Deep sub rumble
      this._sweep(t, 30, 65, 'sine', 1.6, 0.3);

      // First cinematic chord stab
      this._pad([110,165,220,330], t + 1.55, 1.2, 0.14);
      this._kick(t + 1.55, 1.1);
      this._808(55, t + 1.55, 1.0, 0.9);

      // Snare crack
      this._snare(t + 2.0, 0.55);
      this._clap(t + 2.0, 0.4);

      // Electronic synth sweep rise
      this._sweep(t + 2.0, 110, 1320, 'sawtooth', 1.8, 0.1);

      // Second power stab
      this._pad([110,220,277,330,440], t + 3.8, 1.4, 0.14);
      this._kick(t + 3.8, 1.15);
      this._808(55, t + 3.8, 0.9, 0.9);
      this._snare(t + 4.3, 0.5);
      this._clap(t + 4.3, 0.38);

      // Lo-fi piano sparkle
      [880,988,1047,1175,1319,1568].forEach((f, i) => {
        this._osc(f, 'sine', t + 4.8 + i * 0.11, 0.5, 0.08 + i * 0.008);
      });

      // Big trap finale hit
      this._kick(t + 5.7, 1.2);
      this._snare(t + 5.7, 0.6);
      this._clap(t + 5.7, 0.5);
      this._808(55, t + 5.7, 1.4, 0.95);
      this._pad([110,220,330,440,550], t + 5.7, 2.2, 0.12);

      // Rising electronic sweep to loop start
      this._sweep(t + 6.5, 220, 1760, 'sawtooth', 1.2, 0.07);

      // Kick into first loop bar
      const loopAt = t + 8.0;
      this._nextBar  = loopAt;
      this._section  = 0;
      this._barCount = 0;

      const delay = Math.max((loopAt - ctx.currentTime) * 1000 - 150, 0);
      const id = setTimeout(() => { if (this._playing) this._loop(); }, delay);
      this._timers.push(id);
    },

    // ── PUBLIC API ───────────────────────────────────────────────────────
    start() {
      if (this._playing) return;
      this._playing = true;
      this._getCtx();
      this._playIntro();
      this._refreshUI();
    },

    stop() {
      this._playing = false;
      this._timers.forEach(clearTimeout);
      this._timers = [];
      if (this._master && this._ctx) {
        const t = this._ctx.currentTime;
        this._master.gain.linearRampToValueAtTime(0, t + 0.6);
        setTimeout(() => {
          if (!this._playing && this._ctx) {
            this._master = this._ctx.createGain();
            this._master.gain.setValueAtTime(this._muted ? 0 : 0.36, this._ctx.currentTime);
            this._master.connect(this._ctx.destination);
          }
        }, 700);
      }
      this._refreshUI();
    },

    toggle() { if (this._playing) this.stop(); else this.start(); },

    mute(on) {
      this._muted = (on === undefined ? !this._muted : !!on);
      localStorage.setItem('sml_music_muted', this._muted ? '1' : '0');
      if (this._master && this._ctx) {
        this._master.gain.linearRampToValueAtTime(
          this._muted ? 0 : 0.36,
          this._ctx.currentTime + 0.3
        );
      }
      this._refreshUI();
      return this._muted;
    },

    _refreshUI() {
      document.querySelectorAll('.sml-music-btn').forEach(b => {
        const on = this._playing && !this._muted;
        b.textContent = on ? '🎵' : (this._playing ? '🔇' : '🎵');
        b.title = on
          ? 'Music playing — click to stop'
          : this._playing ? 'Music muted — click to unmute' : 'Click to play music';
        b.style.opacity = this._playing ? '1' : '0.45';
      });
    },
  };

  window.SMLMusic = SMLMusic;

  // ── Auto-start on first user gesture (browser autoplay policy) ─────────
  // Use BUBBLE phase (no capture) so music button can stopPropagation and
  // handle itself — prevents the race where doc listener starts music and
  // button listener immediately toggles it off on the same click.
  function onAnyGesture() {
    if (SMLMusic._gestured) return;
    SMLMusic._gestured = true;
    document.removeEventListener('click',      onAnyGesture);
    document.removeEventListener('touchstart', onAnyGesture);
    document.removeEventListener('keydown',    onAnyGesture);
    if (!SMLMusic._muted) SMLMusic.start();
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Register bubble-phase listeners — music button stops propagation so
    // these only fire when the user interacts with something else first.
    document.addEventListener('click',      onAnyGesture);
    document.addEventListener('touchstart', onAnyGesture);
    document.addEventListener('keydown',    onAnyGesture);

    document.querySelectorAll('.sml-music-btn').forEach(b => {
      SMLMusic._refreshUI();
      b.addEventListener('click', e => {
        // Stop bubble so the document listener above doesn't also fire
        e.stopPropagation();
        if (!SMLMusic._gestured) {
          // First interaction ever — remove doc listeners, start music
          SMLMusic._gestured = true;
          document.removeEventListener('click',      onAnyGesture);
          document.removeEventListener('touchstart', onAnyGesture);
          document.removeEventListener('keydown',    onAnyGesture);
          SMLMusic.start();
        } else {
          SMLMusic.toggle();
        }
      });
    });
  });
})();
