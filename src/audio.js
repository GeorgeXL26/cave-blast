// Procedural sound effects + background music via Web Audio API.
// No external audio files needed - everything is synthesized.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicNodes = [];
    this.musicTimer = null;
  }

  ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    this.ensure();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  tone(freq, dur, { type = 'square', gain = 0.2, delay = 0, slideTo = null, decay = true } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    if (decay) g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noiseBurst(dur, { gain = 0.2, delay = 0, filterFreq = 1200 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  shoot(weaponKey) {
    if (weaponKey === 'bazooka' || weaponKey === 'doubleBazooka') {
      this.tone(160, 0.22, { type: 'sawtooth', gain: 0.22, slideTo: 70 });
      this.noiseBurst(0.15, { gain: 0.14, filterFreq: 1400 });
    } else if (weaponKey === 'rifle' || weaponKey === 'dualRifles' || weaponKey === 'poweredRifle' || weaponKey === 'ultimate') {
      this.tone(520, 0.08, { type: 'sawtooth', gain: 0.15, slideTo: 220 });
    } else {
      this.tone(340, 0.09, { type: 'square', gain: 0.16, slideTo: 140 });
    }
  }

  explosion() {
    this.tone(90, 0.35, { type: 'sawtooth', gain: 0.26, slideTo: 40 });
    this.noiseBurst(0.28, { gain: 0.24, filterFreq: 900 });
  }

  enemyDeath() {
    this.tone(300, 0.14, { type: 'triangle', gain: 0.2, slideTo: 60 });
    this.noiseBurst(0.08, { gain: 0.1, filterFreq: 2000 });
  }

  playerHit() {
    this.tone(180, 0.18, { type: 'sawtooth', gain: 0.22, slideTo: 60 });
  }

  enemyShoot(kind) {
    if (kind === 'chainsaw') {
      this.tone(220, 0.12, { type: 'sawtooth', gain: 0.14, slideTo: 160 });
      this.noiseBurst(0.1, { gain: 0.08, filterFreq: 2500 });
    } else {
      this.tone(700, 0.06, { type: 'triangle', gain: 0.12, slideTo: 380 });
    }
  }

  bossChargeWarn() {
    this.tone(200, 0.5, { type: 'sawtooth', gain: 0.2, slideTo: 500 });
  }

  bossCharge() {
    this.tone(80, 0.3, { type: 'sawtooth', gain: 0.25, slideTo: 50 });
    this.noiseBurst(0.3, { gain: 0.18, filterFreq: 600 });
  }

  coin() {
    this.tone(880, 0.05, { type: 'sine', gain: 0.15 });
    this.tone(1200, 0.06, { type: 'sine', gain: 0.12, delay: 0.04 });
  }

  bonusCollect() {
    this.tone(660, 0.08, { type: 'sine', gain: 0.2 });
    this.tone(990, 0.12, { type: 'sine', gain: 0.18, delay: 0.07 });
  }

  weaponUpgrade() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone(f, 0.16, { type: 'square', gain: 0.2, delay: i * 0.09 })
    );
  }

  waveCleared() {
    [523, 659, 784].forEach((f, i) =>
      this.tone(f, 0.3, { type: 'triangle', gain: 0.18, delay: i * 0.11 })
    );
  }

  bossWarning() {
    this.tone(140, 0.5, { type: 'sawtooth', gain: 0.22, slideTo: 90 });
    this.tone(100, 0.6, { type: 'square', gain: 0.15, delay: 0.15, slideTo: 60 });
  }

  startMusic() {
    this.stopMusic();
    const bass = [130.8, 130.8, 174.6, 146.8];
    const lead = [261.6, 329.6, 392.0, 329.6, 392.0, 440.0, 392.0, 329.6];
    let step = 0;
    const stepDur = 0.22;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) {
        step++;
        return;
      }
      const bi = step % bass.length;
      const li = step % lead.length;
      this.tone(bass[bi], stepDur * 0.9, { type: 'triangle', gain: 0.06 });
      if (step % 2 === 0) {
        this.tone(lead[li], stepDur * 0.7, { type: 'square', gain: 0.05 });
      }
      step++;
    }, stepDur * 1000);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}

export const audio = new AudioEngine();
