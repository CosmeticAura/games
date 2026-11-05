// All sounds are made here with Web Audio. No samples, nothing to download. See SOUNDS.md.
// The context starts on the first tap (iOS needs that).
import { SOUND_PACKS } from '../shared/themes.js';
export class Sfx {
  constructor() { this.ctx = null; this.vol = 0.7; this.muted = false; this.coinN = 0; this.packName = 'classic'; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.level(); this.master.connect(c.destination);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = w * 0.6 + b * 3; }
    this.noise = buf;
    // wind: rumble + whoosh + hiss
    const layer = (type, f, q) => {
      const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random();
      const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.master); s.start(); return { fl, g };
    };
    this.wRumble = layer('lowpass', 140, 0.5);
    this.wWhoosh = layer('bandpass', 400, 0.8);
    this.wHiss = layer('highpass', 3200, 0.4);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.7; lg.gain.value = 60;
    lfo.connect(lg); lg.connect(this.wWhoosh.fl.frequency); lfo.start();
  }
  level() { return this.muted ? 0 : this.vol * ((SOUND_PACKS[this.packName] || {}).gain ?? 1); }
  setPack(n) { this.packName = SOUND_PACKS[n] ? n : 'classic'; this.apply(); }
  apply() { if (this.master) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.04); }
  setVolume(v) { this.vol = Math.max(0, Math.min(1, v)); this.apply(); }
  setMuted(m) { this.muted = !!m; this.apply(); }
  get ok() { return !!this.ctx && this.level() > 0; }

  // s: 0 still .. 1 top speed
  wind(s) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime; s = Math.max(0, Math.min(1, s));
    this.wRumble.g.gain.setTargetAtTime(s < 0.02 ? 0 : 0.10 + 0.25 * s, t, 0.2);
    this.wWhoosh.fl.frequency.setTargetAtTime(260 + s * s * 1700, t, 0.15);
    this.wWhoosh.g.gain.setTargetAtTime(s < 0.02 ? 0 : 0.03 + s * 0.26, t, 0.15);
    this.wHiss.g.gain.setTargetAtTime(s < 0.45 ? 0 : (s - 0.45) * 0.16, t, 0.2);
  }
  burst(type, freq, dur, vol, q = 1, delay = 0, endFreq = null) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  tone(freq, dur, vol, slideTo = null, delay = 0, type = null) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || (this.packName === 'arcade' ? 'square' : 'sine'); o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  snap(v = 1) { if (!this.ok) return; this.burst('highpass', 2500, 0.05, 0.5 * v, 0.7); this.tone(170, 0.28, 0.4 * v, 60, 0.01); this.burst('bandpass', 700, 0.3, 0.18 * v, 0.6, 0.02, 200); }
  thud(v = 1) { if (!this.ok) return; this.tone(120, 0.22, 0.5 * v, 45); this.burst('lowpass', 420, 0.12, 0.25 * v); }
  crash(v = 1) {
    if (!this.ok) return;
    this.tone(95, 0.45, 0.6 * v, 28);
    for (let i = 0; i < 9; i++) this.burst('bandpass', 300 + Math.random() * 2700, 0.05 + Math.random() * 0.07, (0.25 + Math.random() * 0.25) * v, 1.5, Math.random() * 0.2);
  }
  coin(i = 0) { if (!this.ok) return; const f = 1318 * Math.pow(2, ((i % 12) / 12)); this.tone(f, 0.05, 0.07); this.tone(f * 2, 0.04, 0.03); }
  cheer() {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime;
    [700, 1800].forEach((f, k) => {
      const s = c.createBufferSource(); s.buffer = this.noise;
      const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = 2.2;
      const g = c.createGain(); g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16 - k * 0.06, t + 0.35); g.gain.linearRampToValueAtTime(0.0, t + 1.3);
      const am = c.createOscillator(), ag = c.createGain(); am.frequency.value = 9 + k * 5; ag.gain.value = 0.05 - k * 0.02;
      am.connect(ag); ag.connect(g.gain);
      s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + 1.4); am.start(t); am.stop(t + 1.4);
    });
  }
  click() { if (!this.ok) return; this.burst('highpass', 3000, 0.02, 0.12, 0.7); }
  stopAll() { this.wind(0); }
}
