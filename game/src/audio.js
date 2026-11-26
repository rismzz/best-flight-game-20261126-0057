// Synthesised WebAudio sound effects — no audio assets, no network. The
// engine is a quiet sawtooth hum whose pitch follows speed; rings chime,
// hits thud, and a run-complete fanfare plays a tiny arpeggio.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      engineOsc.connect(filt).connect(engineGain).connect(ctx.destination);
      engineOsc.start();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    try {
      const t0 = ctx.currentTime + when;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch { /* audio is best-effort */ }
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    setMuted(m) { muted = m; if (engineGain) engineGain.gain.value = 0; },
    isMuted() { return muted; },
    engine(speed01, flying) {
      if (!ctx || !engineOsc || muted) return;
      try {
        engineOsc.frequency.value = 48 + speed01 * 70;
        engineGain.gain.setTargetAtTime(flying ? 0.035 + speed01 * 0.02 : 0.0, ctx.currentTime, 0.1);
      } catch { /* ignore */ }
    },
    ring() { tone(880, 0.16, 'sine', 0.16); tone(1318, 0.22, 'sine', 0.12, 0.07); },
    nearMiss() { tone(1568, 0.1, 'triangle', 0.08); },
    hit() { tone(110, 0.3, 'square', 0.2); tone(55, 0.4, 'sawtooth', 0.16, 0.02); },
    click() { tone(660, 0.07, 'square', 0.08); },
    fanfare() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.09));
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, i * 0.13));
    },
  };
}
