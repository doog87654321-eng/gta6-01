// All sound is synthesised with WebAudio: engine hum, sirens, gunshots,
// pickups and a small bass-and-hats groove. No audio files, no network.
// Everything is guarded so a browser without audio still plays fine.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let muted = false;
  let musicStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // Engine: two detuned saws through a lowpass, pitched by speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'sawtooth';
      engineOsc2.frequency.value = 58;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      engineOsc2.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineOsc2.start();
      // Siren: a square wave whose pitch alternates on a timer.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || !master) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + dur + 0.02);
    } catch {
      // Ignore one-off synth errors.
    }
  }

  function noiseBurst(dur, vol, cutoff) {
    if (!ctx || !master) return;
    try {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      const gain = ctx.createGain();
      gain.gain.value = vol;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
    } catch {
      // Ignore one-off synth errors.
    }
  }

  // A lazy bassline: A minor groove, one note a beat, hats on the off-beat.
  const BASS = [55, 0, 55, 0, 65.4, 0, 49, 0, 55, 0, 55, 0, 82.4, 0, 73.4, 0];
  function musicTick() {
    if (!ctx || muted) return;
    const note = BASS[musicStep % BASS.length];
    if (note > 0) blip(note, 0.22, 'triangle', 0.16);
    if (musicStep % 2 === 1) noiseBurst(0.03, 0.05, 6000);
    musicStep += 1;
  }

  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (ctx && !musicTimer) musicTimer = window.setInterval(musicTick, 240);
    },
    setMuted(value) {
      muted = value;
      if (master && ctx) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    /** Engine pitch follows speed 0..1; silent on foot. */
    engine(speed01, on) {
      if (!ctx || !engineGain || !engineOsc) return;
      const target = on ? 0.05 + speed01 * 0.09 : 0;
      engineGain.gain.setTargetAtTime(muted ? 0 : target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(52 + speed01 * 130, ctx.currentTime, 0.08);
    },
    /** Siren wails while police are close; the pitch alternates each call. */
    siren(on) {
      if (!ctx || !sirenGain || !sirenOsc) return;
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.045 : 0, ctx.currentTime, 0.15);
      if (on) sirenOsc.frequency.value = sirenOsc.frequency.value < 800 ? 950 : 700;
    },
    gunshot() {
      noiseBurst(0.14, 0.5, 1800);
      blip(120, 0.1, 'square', 0.2);
    },
    crash() {
      noiseBurst(0.25, 0.4, 900);
    },
    pickup() {
      blip(880, 0.12, 'sine', 0.25);
      blip(1318, 0.18, 'sine', 0.22, 0.09);
    },
    cash() {
      blip(1046, 0.1, 'sine', 0.22);
      blip(1318, 0.1, 'sine', 0.22, 0.08);
      blip(1568, 0.2, 'sine', 0.22, 0.16);
    },
    missionDone() {
      [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.22, 'triangle', 0.22, i * 0.12));
    },
    busted() {
      [392, 330, 262].forEach((f, i) => blip(f, 0.3, 'sawtooth', 0.15, i * 0.18));
    },
    denied() {
      blip(180, 0.18, 'square', 0.18);
    },
  };
}
