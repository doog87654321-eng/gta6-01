// All sound is synthesised with WebAudio — no audio files, no network.
// The context is created on the first user gesture; in screenshot staging
// (no gesture) every call is a silent no-op.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenOn = false;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 420;
      this.engineOsc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'square';
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch (e) { this.ctx = null; }
  }

  setMuted(m) { this.muted = m; if (this.engineGain) this.engineGain.gain.value = 0; if (this.sirenGain) this.sirenGain.gain.value = 0; }

  engine(level) {
    if (!this.ctx || this.muted || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(55 + level * 130, t, 0.08);
    // Level 0 means on foot: silence the drone instead of humming at idle.
    this.engineGain.gain.setTargetAtTime(level <= 0 ? 0 : 0.028 + level * 0.035, t, 0.1);
  }

  siren(on) {
    if (!this.ctx || !this.sirenOsc) return;
    this.sirenOn = on;
    const t = this.ctx.currentTime;
    if (!on || this.muted) { this.sirenGain.gain.setTargetAtTime(0, t, 0.1); return; }
    this.sirenGain.gain.setTargetAtTime(0.016, t, 0.2);
    this.sirenOsc.frequency.setTargetAtTime(660, t, 0.05);
    // The two-tone wail is driven by update(): it flips the frequency.
  }

  sirenTick(time) {
    if (!this.ctx || !this.sirenOn || this.muted || !this.sirenOsc) return;
    this.sirenOsc.frequency.setTargetAtTime(time % 1 < 0.5 ? 660 : 880, this.ctx.currentTime, 0.03);
  }

  tone(freq, dur, type, gain) {
    if (!this.ctx || this.muted) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain || 0.08, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(this.ctx.currentTime + dur);
    } catch (e) { /* audio is best-effort */ }
  }

  noise(dur, gain) {
    if (!this.ctx || this.muted) return;
    try {
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      const g = this.ctx.createGain();
      g.gain.value = gain || 0.15;
      src.buffer = buf; src.connect(g); g.connect(this.ctx.destination);
      src.start();
    } catch (e) { /* audio is best-effort */ }
  }

  shot() { this.noise(0.14, 0.22); this.tone(190, 0.08, 'square', 0.05); }
  // Two-tone car horn, for the H key while driving.
  horn() { this.tone(370, 0.22, 'square', 0.07); setTimeout(() => this.tone(440, 0.22, 'square', 0.06), 40); }
  reload() { this.tone(520, 0.07, 'square', 0.05); }
  pickup() { this.tone(880, 0.1, 'sine', 0.08); this.tone(1320, 0.14, 'sine', 0.06); }
  cash() { this.tone(990, 0.09, 'sine', 0.09); setTimeout(() => this.tone(1480, 0.16, 'sine', 0.08), 90); }
  thud() { this.noise(0.18, 0.2); this.tone(70, 0.18, 'sine', 0.12); }
  jingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.08), i * 110)); }
  busted() { this.tone(220, 0.5, 'sawtooth', 0.08); this.tone(174, 0.7, 'sawtooth', 0.07); }
}
