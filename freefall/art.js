// Sprite loading and drawing helpers.
import { CATALOG } from './catalog.js';

export const POSES = ['fall_a', 'fall_b', 'hang', 'open', 'land', 'crash'];
const SCENERY = ['sc_tree_pine', 'sc_tree_round', 'sc_house_0', 'sc_house_1', 'sc_cloud_0', 'sc_cloud_1', 'sc_cloud_2', 'sc_bird_0', 'sc_bird_1',
  'trail_smoke', 'trail_fire', 'trail_rainbow', 'trail_stardust', 'bg_day', 'bg_dusk', 'bg_night', 'bg_candy', 'bg_aurora', 'bg_space'];

export class Art {
  constructor() { this.img = {}; this.meta = null; }
  names() {
    const n = [...SCENERY];
    for (const c of CATALOG.chute) { n.push(c.id, c.id + '_down'); }
    for (const p of CATALOG.plane) n.push(p.id);
    for (const pose of POSES) {
      for (const s of CATALOG.suit) n.push(`diver_${s.id}_${pose}`);
      for (const h of CATALOG.helmet) n.push(`head_${h.id}_${pose}`);
    }
    return n;
  }
  emoteNames() {
    const n = [];
    for (const e of CATALOG.emote) for (const v of ['a', 'b']) {
      const k = `emo_${e.id.slice(6)}_${v}`;
      for (const s of CATALOG.suit) n.push(`diver_${s.id}_${k}`);
      for (const h of CATALOG.helmet) n.push(`head_${h.id}_${k}`);
    }
    return n;
  }
  loadEmotes() {
    for (const n of this.emoteNames()) { if (this.img[n]) continue; const im = new Image(); im.decoding = 'async'; im.src = `sprites/${n}.png`; this.img[n] = im; }
  }
  async load(onProgress) {
    this.meta = await (await fetch('sprites/meta.json')).json();
    const list = this.names(); let done = 0;
    await Promise.all(list.map((n) => new Promise((res) => {
      const im = new Image(); im.decoding = 'async';
      im.onload = im.onerror = () => { done++; onProgress && onProgress(done / list.length); res(); };
      im.src = `sprites/${n}.png`; this.img[n] = im;
    })));
  }
  get(n) { const i = this.img[n]; return i && i.complete && i.naturalWidth ? i : null; }

  // Draw the diver (suit + helmet) with the hip at (x,y). cell = drawn size of the 256px sprite.
  diver(ctx, x, y, cell, suit, helmet, pose, flip = 1, rot = 0, alpha = 1) {
    const a = this.get(`diver_${suit}_${pose}`), h = this.get(`head_${helmet}_${pose}`);
    if (!a) return;
    const k = cell / 256, ox = 128 * k, oy = (128 + this.meta.cz * (256 / this.meta.scale)) * k;
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(flip, 1); if (alpha !== 1) ctx.globalAlpha = alpha;
    ctx.drawImage(a, -ox, -oy, cell, cell);
    if (h) ctx.drawImage(h, -ox, -oy, cell, cell);
    ctx.restore();
  }
  // Canopy with ropes. hip is the diver hip; mpp is pixels per metre of the diver model.
  chute(ctx, hx, hy, mpp, id, flip = 1, swing = 0, inflate = 1) {
    const im = this.get(id); if (!im) return;
    const hands = this.meta.pose_hang.hands; const k = mpp / (256 / this.meta.scale);
    const hip = this.meta.pose_hang.hip, px = hx + (hands[0] - hip[0]) * k * flip, py = hy + (hands[1] - hip[1]) * k;
    const rope = 1.7 * mpp, cw = im.width * (mpp / 64), ch = im.height * (mpp / 64);
    const baseY = py - rope;
    ctx.save(); ctx.translate(px, py); ctx.rotate(swing); ctx.translate(-px, -py);
    const sx = inflate <= 0 ? 0.001 : inflate, sy = inflate;
    const rimX = 2.55 * mpp * sx, ry = baseY + (py - baseY) * (1 - sy);
    ctx.strokeStyle = 'rgba(245,245,245,.75)'; ctx.lineWidth = Math.max(1, mpp * 0.03);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - rimX, ry); ctx.moveTo(px, py); ctx.lineTo(px + rimX, ry);
    ctx.moveTo(px, py); ctx.lineTo(px - rimX * 0.45, ry - 2); ctx.moveTo(px, py); ctx.lineTo(px + rimX * 0.45, ry - 2); ctx.stroke();
    // image centre is world z=1.2 m; the rim is 1.2 m below it
    const cy = ry - 1.2 * mpp * sy;
    ctx.drawImage(im, px - (cw / 2) * sx, cy - (ch / 2) * sy, cw * sx, ch * sy);
    ctx.restore();
  }
  // preview of a catalog item drawn into a small canvas (shop cards)
  preview(canvas, cat, id, bgColors, extra = {}) {
    const c = canvas.getContext('2d'), W = canvas.width, H = canvas.height; c.clearRect(0, 0, W, H);
    const draw = (n, cx, cy, w, h) => { const i = this.get(n); if (i) c.drawImage(i, cx - w / 2, cy - h / 2, w, h); };
    const s = this.meta.scale, hang = this.meta.pose_hang;
    if (cat === 'chute') { const i = this.get(id); if (i) { const w = W * 0.95; c.drawImage(i, (W - w) / 2, H * 0.5 - (w * i.height / i.width) / 2, w, w * i.height / i.width); } }
    else if (cat === 'plane') { const i = this.get(id); if (i) { const w = W * 0.98; c.drawImage(i, (W - w) / 2, H * 0.5 - (w * i.height / i.width) / 2, w, w * i.height / i.width); } }
    else if (cat === 'suit') { const sz = H * 1.25; const a = this.get(`diver_${id}_hang`), h = this.get('head_helmet_classic_hang'); if (a) { c.drawImage(a, (W - sz) / 2, H * 0.5 - sz * 0.5 - sz * 0.02, sz, sz); if (h) c.drawImage(h, (W - sz) / 2, H * 0.5 - sz * 0.5 - sz * 0.02, sz, sz); } }
    else if (cat === 'emote') {
      const k = `emo_${id.slice(6)}_${extra.frame || 'a'}`, sz = H * 1.2;
      const a = this.get(`diver_${extra.suit || 'suit_classic'}_${k}`), h = this.get(`head_${extra.helmet || 'helmet_classic'}_${k}`);
      if (a) { c.drawImage(a, (W - sz) / 2, H * 0.52 - sz * 0.5, sz, sz); if (h) c.drawImage(h, (W - sz) / 2, H * 0.52 - sz * 0.5, sz, sz); }
    }
    else if (cat === 'helmet') {
      const sz = H * 3.2, k = sz / 256, hd = hang.head; const h = this.get(`head_${id}_hang`), a = this.get('diver_suit_classic_hang');
      const ox = W / 2 - hd[0] * k, oy = H * 0.58 - hd[1] * k;
      if (a) c.drawImage(a, ox, oy, sz, sz); if (h) c.drawImage(h, ox, oy, sz, sz);
    } else if (cat === 'trail') {
      if (id === 'none') { c.fillStyle = 'rgba(255,255,255,.35)'; c.font = '600 13px system-ui'; c.textAlign = 'center'; c.fillText('none', W / 2, H / 2 + 4); }
      else for (let i = 0; i < 4; i++) draw(id, W * (0.22 + i * 0.19), H * (0.7 - i * 0.14), 34 + i * 12, 34 + i * 12);
    } else if (cat === 'bg') {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, bgColors[0]); g.addColorStop(1, bgColors[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
      draw(id, W * 0.7, H * 0.32, W * 0.5, W * 0.5);
    }
  }
}
