(function () {
  'use strict';

  const SMLMusic = {
    _ctx: null,
    _master: null,
    _playing: false,
    _muted: localStorage.getItem('sml_music_muted') === '1',
    _timers: [],
    _gestured: false,
    _nextBar: 0,
    BPM: 90,

    // ── Audio context ──────────────────────────────────────────────────────
    _getCtx() {
      if (!this._ctx) {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._master = this._ctx.createGain();
        this._master.gain.setValueAtTime(this._muted ? 0 : 0.38, this._ctx.currentTime);
        this._master.connect(this._ctx.destination);
      }
      if (this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    },

    // ── Primitive sound builders ───────────────────────────────────────────
    _osc(freq, type, t, dur, vol, dest) {
      const ctx = this._ctx;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest || this._master);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.05);
    },

    _sweep(t, f0, f1, type, dur, vol) {
      const ctx = this._ctx;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(this._master);
      osc.type = type;
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.05);
    },

    _noise(t, dur, vol, hpFreq) {
      const ctx = this._ctx;
      const size = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, size, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const flt = ctx.createBiquadFilter();
      flt.type = 'highpass';
      flt.frequency.value = hpFreq || 5000;
      const g = ctx.createGain();
      src.connect(flt); flt.connect(g); g.connect(this._master);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.start(t); src.stop(t + dur + 0.05);
    },

    // ── Drum voices ────────────────────────────────────────────────────────
    _kick(t, vol) {
      const ctx = this._ctx, v = vol || 0.9;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(this._master);
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(38, t + 0.18);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.start(t); osc.stop(t + 0.45);
    },

    _snare(t, vol) {
      this._noise(t, 0.18, (vol || 0.35), 1200);
      this._osc(210, 'triangle', t, 0.1, (vol || 0.25));
    },

    _hat(t, vol, open) {
      this._noise(t, open ? 0.14 : 0.055, vol || 0.1, 8000);
    },

    _808(freq, t, dur, vol) {
      const ctx = this._ctx;
      const osc = ctx.createOscillator();
      const flt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      flt.type = 'lowpass'; flt.frequency.value = 180;
      osc.connect(flt); flt.connect(g); g.connect(this._master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, t + 0.06);
      g.gain.setValueAtTime(vol || 0.75, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.5));
      osc.start(t); osc.stop(t + (dur || 0.5) + 0.05);
    },

    _pad(freqs, t, dur, vol) {
      freqs.forEach(f => {
        const ctx = this._ctx;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(this._master);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol || 0.055, t + 0.35);
        g.gain.setValueAtTime(vol || 0.055, t + dur - 0.4);
        g.gain.linearRampToValueAtTime(0, t + dur);
        osc.start(t); osc.stop(t + dur + 0.05);
      });
    },

    // ── Intro fanfare (~7 s) ───────────────────────────────────────────────
    _playIntro() {
      const ctx = this._getCtx();
      const t = ctx.currentTime + 0.15;

      // Low sub rumble builds
      this._sweep(t, 35, 70, 'sine', 1.4, 0.25);

      // First dramatic chord stab (t+1.4)
      this._pad([220, 261, 330, 415], t + 1.4, 1.1, 0.13);
      this._kick(t + 1.4, 1.1);
      this._808(55, t + 1.4, 0.9, 0.85);

      // Snare crack (t+1.9)
      this._snare(t + 1.9, 0.5);

      // Rising cinematic sweep
      this._sweep(t + 1.9, 180, 1100, 'sawtooth', 1.6, 0.13);

      // Second power chord stab (t+3.5)
      this._pad([220, 277, 330, 440], t + 3.5, 1.3, 0.15);
      this._kick(t + 3.5, 1.1);
      this._808(55, t + 3.5, 0.7, 0.85);
      this._snare(t + 4.0, 0.5);

      // Ascending sparkle run
      [880, 1047, 1319, 1568, 1760].forEach((f, i) => {
        this._osc(f, 'sine', t + 4.5 + i * 0.1, 0.45, 0.1 + i * 0.01);
      });

      // Big final hit (t+5.5)
      this._kick(t + 5.5, 1.2);
      this._snare(t + 5.5, 0.55);
      this._808(55, t + 5.5, 1.2, 0.9);
      this._pad([110, 220, 330, 440, 550], t + 5.5, 1.8, 0.1);

      // Transition into loop
      const startLoopAt = t + 7.2;
      this._nextBar = startLoopAt;
      const delay = (startLoopAt - ctx.currentTime) * 1000 - 200;
      const id = setTimeout(() => { if (this._playing) this._scheduleBars(); }, delay);
      this._timers.push(id);
    },

    // ── Main beat loop (trap + cinematic) ─────────────────────────────────
    // Chord progression: Am – F – C – Em
    _CHORDS: [
      [220, 261, 330],   // Am
      [174, 220, 261],   // F
      [130, 196, 261],   // C
      [164, 207, 247],   // Em
    ],
    _BASS: [55, 43.65, 32.7, 41.2],

    _scheduleBar(barStart) {
      const beat = 60 / this.BPM;

      for (let b = 0; b < 4; b++) {
        const bt = barStart + b * beat;

        // Kick: 1, and 2.75 (trap anticipation), and 3
        if (b === 0) { this._kick(bt); this._kick(bt + beat * 0.75, 0.65); }
        if (b === 2) { this._kick(bt); }

        // Snare: 2 and 4
        if (b === 1 || b === 3) this._snare(bt);

        // Hi-hats 8th + 16th rolls on 2 and 4
        this._hat(bt, 0.1);
        this._hat(bt + beat * 0.5, 0.07);
        if (b === 1 || b === 3) {
          this._hat(bt + beat * 0.25, 0.055, false);
          this._hat(bt + beat * 0.75, 0.055, false);
        }
        // Open hat on the 8th before 3
        if (b === 1) this._hat(bt + beat * 0.5, 0.12, true);

        // Chord pad each beat
        this._pad(this._CHORDS[b], bt, beat * 0.92, 0.045);

        // 808 bass
        this._808(this._BASS[b], bt, beat * 0.75, 0.7);
      }

      // Melody accent (top of each bar)
      this._osc(880, 'sine', barStart + beat * 0, 0.12, 0.08);
      this._osc(784, 'sine', barStart + beat * 1, 0.1,  0.07);
      this._osc(880, 'sine', barStart + beat * 2, 0.1,  0.07);
      this._osc(988, 'sine', barStart + beat * 3, 0.14, 0.08);
    },

    _scheduleBars() {
      if (!this._playing) return;
      const ctx = this._ctx;
      const bar = (60 / this.BPM) * 4;
      const ahead = bar * 2.5;

      while (this._nextBar < ctx.currentTime + ahead) {
        this._scheduleBar(this._nextBar);
        this._nextBar += bar;
      }

      const id = setTimeout(() => { if (this._playing) this._scheduleBars(); }, bar * 500);
      this._timers.push(id);
    },

    // ── Controls ───────────────────────────────────────────────────────────
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
        this._master.gain.linearRampToValueAtTime(0, this._ctx.currentTime + 0.6);
        setTimeout(() => {
          // Rebuild master gain for next start
          if (!this._playing && this._ctx) {
            this._master = this._ctx.createGain();
            this._master.gain.setValueAtTime(this._muted ? 0 : 0.38, this._ctx.currentTime);
            this._master.connect(this._ctx.destination);
          }
        }, 700);
      }
      this._refreshUI();
    },

    toggle() {
      if (this._playing) this.stop(); else this.start();
    },

    mute(on) {
      this._muted = (on === undefined ? !this._muted : on);
      localStorage.setItem('sml_music_muted', this._muted ? '1' : '0');
      if (this._master && this._ctx) {
        this._master.gain.linearRampToValueAtTime(
          this._muted ? 0 : 0.38,
          this._ctx.currentTime + 0.3
        );
      }
      this._refreshUI();
      return this._muted;
    },

    _refreshUI() {
      document.querySelectorAll('.sml-music-btn').forEach(b => {
        if (this._playing && !this._muted) {
          b.textContent = '🎵'; b.title = 'Music on — click to stop';
        } else if (this._playing && this._muted) {
          b.textContent = '🔇'; b.title = 'Music muted — click to unmute';
        } else {
          b.textContent = '🎵'; b.title = 'Click to play music';
          b.style.opacity = '0.45';
        }
        if (this._playing) b.style.opacity = '1';
      });
    },
  };

  window.SMLMusic = SMLMusic;

  // Start on first user gesture (browser autoplay policy)
  function onFirstGesture() {
    if (SMLMusic._gestured) return;
    SMLMusic._gestured = true;
    document.removeEventListener('click',      onFirstGesture, true);
    document.removeEventListener('touchstart', onFirstGesture, true);
    document.removeEventListener('keydown',    onFirstGesture, true);
    if (!SMLMusic._muted) SMLMusic.start();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click',      onFirstGesture, true);
    document.addEventListener('touchstart', onFirstGesture, true);
    document.addEventListener('keydown',    onFirstGesture, true);

    document.querySelectorAll('.sml-music-btn').forEach(b => {
      SMLMusic._refreshUI();
      b.addEventListener('click', e => {
        e.stopPropagation();
        if (!SMLMusic._gestured) {
          SMLMusic._gestured = true;
          SMLMusic.start();
        } else {
          SMLMusic.toggle();
        }
      });
    });
  });
})();
