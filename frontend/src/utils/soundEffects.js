class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Realistic card flick / swoosh sound
  playCardFlip() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(3200, t + 0.08);
      filter.Q.value = 3;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.12);

      // Snap transient
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t + 0.02);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);
      oscGain.gain.setValueAtTime(0.16, t + 0.02);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t + 0.02);
      osc.stop(t + 0.09);
    } catch {}
  }

  // Cinematic dark suspense reveal sting
  playDramaticReveal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Deep ominous bass drone
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(85, t);
      sub.frequency.exponentialRampToValueAtTime(38, t + 0.85);
      subGain.gain.setValueAtTime(0.35, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(t);
      sub.stop(t + 0.85);

      // Ominous mystery overtone
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chime.type = 'sawtooth';
      chime.frequency.setValueAtTime(260, t);
      chime.frequency.exponentialRampToValueAtTime(130, t + 0.7);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, t);

      chimeGain.gain.setValueAtTime(0.12, t);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      chime.connect(filter);
      filter.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);
      chime.start(t);
      chime.stop(t + 0.7);
    } catch {}
  }

  // Subtle tactile click for buttons
  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.035);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.035);
    } catch {}
  }

  // Chime when a player joins room
  playPlayerJoined() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      [440, 660].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);
        gain.gain.setValueAtTime(0.12, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.25);
      });
    } catch {}
  }

  // Card distribution flutter sound
  playShuffle() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      for (let i = 0; i < 7; i++) {
        const offset = i * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180 + i * 40, t + offset);
        gain.gain.setValueAtTime(0.12, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.04);
      }
    } catch {}
  }

  // Jester Solo Victory Fanfare
  playJesterVictory() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Playful theatrical arpeggio (Am -> F -> G -> C -> E)
      const notes = [440, 523.25, 659.25, 698.46, 783.99, 880, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.1);
        gain.gain.setValueAtTime(0.18, t + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.1);
        osc.stop(t + idx * 0.1 + 0.45);
      });
    } catch {}
  }

  // Detective Investigation chime
  playInvestigation() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.18); // A5
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    } catch {}
  }
}

export const sounds = new SoundManager();
