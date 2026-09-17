(function () {
  'use strict';

  const SMLSounds = {
    _ctx: null,
    _muted: localStorage.getItem('sml_muted') === '1',

    _getCtx() {
      if (!this._ctx) {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    },

    isMuted() { return this._muted; },

    toggleMute() {
      this._muted = !this._muted;
      localStorage.setItem('sml_muted', this._muted ? '1' : '0');
      document.querySelectorAll('.sml-mute-btn').forEach(b => {
        b.textContent = this._muted ? '🔇' : '🔊';
        b.title = this._muted ? 'Unmute sounds' : 'Mute sounds';
      });
      return this._muted;
    },

    _play(fn) {
      if (this._muted) return;
      try { fn(this._getCtx()); } catch (e) { /* silent fail */ }
    },

    _tone(ctx, freq, type, t, duration, vol) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.01);
    },

    _sweep(ctx, freqStart, freqEnd, type, t, duration, vol) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, t);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.01);
    },

    // Very short UI click
    click() {
      this._play(ctx => {
        const t = ctx.currentTime;
        this._tone(ctx, 1100, 'sine', t, 0.055, 0.12);
      });
    },

    // Single bright ping — XP / small reward
    coin() {
      this._play(ctx => {
        const t = ctx.currentTime;
        this._tone(ctx, 1047, 'sine', t,        0.15, 0.28);
        this._tone(ctx, 1319, 'sine', t + 0.09, 0.2,  0.32);
      });
    },

    // Correct quiz answer — two upward tones
    correct() {
      this._play(ctx => {
        const t = ctx.currentTime;
        this._tone(ctx, 660,  'sine', t,        0.14, 0.3);
        this._tone(ctx, 880,  'sine', t + 0.11, 0.2,  0.35);
      });
    },

    // Wrong quiz answer — low descending buzz
    wrong() {
      this._play(ctx => {
        const t = ctx.currentTime;
        this._tone(ctx, 280, 'square', t,        0.15, 0.12);
        this._tone(ctx, 210, 'square', t + 0.13, 0.22, 0.12);
      });
    },

    // Soft two-tone notification ping (coach reply, etc.)
    notification() {
      this._play(ctx => {
        const t = ctx.currentTime;
        this._tone(ctx, 800,  'sine', t,        0.09, 0.16);
        this._tone(ctx, 1000, 'sine', t + 0.07, 0.12, 0.16);
      });
    },

    // Badge awarded — ascending 4-note arpeggio
    badge() {
      this._play(ctx => {
        const t = ctx.currentTime;
        [523, 659, 784, 1047].forEach((f, i) => {
          this._tone(ctx, f, 'sine', t + i * 0.11, 0.22, 0.32);
        });
      });
    },

    // Mission complete — punchy arpeggio + sparkle
    missionComplete() {
      this._play(ctx => {
        const t = ctx.currentTime;
        [392, 523, 659, 784].forEach((f, i) => {
          this._tone(ctx, f, 'sine', t + i * 0.1, 0.2, 0.3);
        });
        this._tone(ctx, 1319, 'sine', t + 0.45, 0.3, 0.35);
      });
    },

    // Rank up — rising sweep into bright ping
    rankUp() {
      this._play(ctx => {
        const t = ctx.currentTime;
        this._sweep(ctx, 300, 1100, 'sine', t, 0.5, 0.28);
        this._tone(ctx, 1319, 'sine', t + 0.48, 0.28, 0.38);
      });
    },

    // Trade win — cheerful cash-register ascending
    tradeWin() {
      this._play(ctx => {
        const t = ctx.currentTime;
        [784, 988, 1047, 1319].forEach((f, i) => {
          this._tone(ctx, f, 'sine', t + i * 0.09, 0.18, 0.3);
        });
      });
    },

    // Trade loss — descending minor sad tones
    tradeLoss() {
      this._play(ctx => {
        const t = ctx.currentTime;
        this._tone(ctx, 440, 'triangle', t,        0.2,  0.22);
        this._tone(ctx, 349, 'triangle', t + 0.18, 0.25, 0.2);
        this._tone(ctx, 294, 'triangle', t + 0.38, 0.35, 0.18);
      });
    },

    // Team created / joined — welcoming E-G-B chord rise
    teamJoin() {
      this._play(ctx => {
        const t = ctx.currentTime;
        [659, 784, 988].forEach((f, i) => {
          this._tone(ctx, f, 'sine', t + i * 0.1, 0.28, 0.28);
        });
        // Sustain chord
        [659, 784, 988].forEach(f => {
          this._tone(ctx, f, 'sine', t + 0.35, 0.65, 0.14);
        });
      });
    },

    // Boot Camp graduation — triumphant fanfare
    graduate() {
      this._play(ctx => {
        const t = ctx.currentTime;
        // Ascending run C5-E5-G5-C6
        [523, 659, 784, 1047].forEach((f, i) => {
          this._tone(ctx, f, 'sine', t + i * 0.1, 0.22, 0.35);
        });
        // Full chord hold
        [523, 659, 784, 1047].forEach(f => {
          this._tone(ctx, f, 'sine', t + 0.48, 1.1, 0.2);
        });
        // High sparkle
        this._tone(ctx, 2093, 'sine', t + 0.52, 0.55, 0.18);
      });
    },

    // Tournament / championship win — full victory fanfare
    victory() {
      this._play(ctx => {
        const t = ctx.currentTime;
        // Dramatic melody
        const melody = [523, 523, 523, 392, 523, 659, 784];
        melody.forEach((f, i) => {
          this._tone(ctx, f, 'sine', t + i * 0.13, 0.18, 0.38);
        });
        // Final chord
        [523, 659, 784, 1047].forEach(f => {
          this._tone(ctx, f, 'sine', t + melody.length * 0.13, 0.9, 0.22);
        });
        // High shimmer
        this._tone(ctx, 2093, 'sine', t + melody.length * 0.13 + 0.05, 0.7, 0.15);
      });
    },

    // Avatar saved — soft success chime
    avatarSave() {
      this._play(ctx => {
        const t = ctx.currentTime;
        this._tone(ctx, 880,  'sine', t,        0.14, 0.28);
        this._tone(ctx, 1047, 'sine', t + 0.1,  0.18, 0.3);
        this._tone(ctx, 1319, 'sine', t + 0.22, 0.25, 0.32);
      });
    },

    // Error / denied
    error() {
      this._play(ctx => {
        const t = ctx.currentTime;
        this._tone(ctx, 220, 'sawtooth', t,        0.12, 0.12);
        this._tone(ctx, 185, 'sawtooth', t + 0.1,  0.2,  0.12);
      });
    },
  };

  window.SMLSounds = SMLSounds;

  // Auto-init mute button state on page load
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sml-mute-btn').forEach(b => {
      b.textContent = SMLSounds.isMuted() ? '🔇' : '🔊';
      b.title = SMLSounds.isMuted() ? 'Unmute sounds' : 'Mute sounds';
      b.addEventListener('click', () => SMLSounds.toggleMute());
    });
  });
})();
