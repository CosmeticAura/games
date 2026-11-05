// All sounds are synthesised, nothing to download. Starts on the first tap (iOS needs that).
export class Sfx {
  constructor() { this.ctx = null; this.on = true; this.beat = 0; this.wind = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.on ? 0.8 : 0; this.master.connect(c.destination);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    this.wf = c.createBiquadFilter(); this.wf.type = 'bandpass'; this.wf.frequency.value = 300; this.wf.Q.value = 0.7;
    this.wg = c.createGain(); this.wg.gain.value = 0;
    src.connect(this.wf); this.wf.connect(this.wg); this.wg.connect(this.master); src.start();
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v ? 0.8 : 0, this.ctx.currentTime, 0.05); }
  // speed01: 0 still .. 1 terminal. Pitch and volume of the wind rise with it.
  setWind(speed01) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, s = Math.max(0, Math.min(1, speed01));
    this.wf.frequency.setTargetAtTime(220 + s * s * 1900, t, 0.12);
    this.wg.gain.setTargetAtTime(s < 0.02 ? 0 : 0.03 + s * 0.2, t, 0.15);
  }
  // soft heartbeat, faster as the multiplier climbs
  heart(dt, mult, active) {
    if (!this.ctx || !active) return;
    this.beat -= dt;
    if (this.beat > 0) return;
    this.beat = 0.95 - Math.min(0.55, (mult - 1) / 25);
    this.thump(0.0, 0.16); this.thump(0.17, 0.1);
  }
  thump(delay, vol) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.25);
  }
  burst(freq, dur, vol, q = 1) {
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, freq / 6), t + dur); f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  tone(freq, dur, vol, type = 'triangle', slideTo = null, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  whump() { if (!this.ctx) return; this.tone(140, 0.45, 0.5, 'sine', 38); this.burst(900, 0.35, 0.35); }
  crash() { if (!this.ctx) return; this.tone(90, 0.5, 0.6, 'sine', 30); this.burst(1400, 0.45, 0.6); }
  land() { if (!this.ctx) return; this.tone(180, 0.18, 0.3, 'sine', 70); this.burst(500, 0.18, 0.2); }
  coin(i = 0) { if (!this.ctx) return; this.tone(1200 + (i % 5) * 130, 0.12, 0.09, 'triangle', null, 0); this.tone(1800 + (i % 5) * 130, 0.18, 0.06, 'triangle', null, 0.05); }
  botOpen() { if (!this.ctx) return; this.tone(520, 0.1, 0.07, 'triangle', 330); }
  click() { if (!this.ctx) return; this.tone(660, 0.05, 0.05, 'square'); }
  win() { if (!this.ctx) return; [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 0.1, 'triangle', null, i * 0.08)); }
  stopAll() { if (this.ctx) this.setWind(0); }
}
