// Drawing for Freefall v4. Every shape follows ART.md: six hues, one ink outline, one half-tone.
import { find } from './catalog.js';

export const PAL = {
  ink: '#0d0e11', c0: '#14161a', c1: '#1c1f24', c2: '#2a2d34', char: '#2a2d34',
  cream: '#e8dcc3', gold: '#c9a24a', orange: '#e8873a', red: '#a3281f', redDeep: '#6e1612', green: '#58a368',
};
export const DISPLAY = "'Kaushan Script', 'Brush Script MT', cursive";
export const SYS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const col = (n) => PAL[n] || n || PAL.ink;
const HALF = 'rgba(13,14,17,0.28)';
export const STAND_H = 3.73;   // feet are this many u below the neck on a standing figure

// ---------- faces ----------
const FACES = [
  { skin: '#e8dcc3', hair: 'tuft', hc: 'ink', eyes: 'dot', mouth: 'smile' },
  { skin: '#d9b58a', hair: 'bob', hc: 'ink', eyes: 'dot', mouth: 'flat', extra: 'freckles' },
  { skin: '#c98f5c', hair: 'spikes', hc: 'orange', eyes: 'wide', mouth: 'open' },
  { skin: '#a96b43', hair: 'beanie', hc: 'red', eyes: 'dot', mouth: 'smirk' },
  { skin: '#e8dcc3', hair: 'band', hc: 'green', eyes: 'line', mouth: 'smile' },
  { skin: '#d9b58a', hair: 'bun', hc: 'ink', eyes: 'wink', mouth: 'smile', extra: 'blush' },
  { skin: '#c98f5c', hair: 'none', eyes: 'dot', mouth: 'smile', extra: 'stache' },
  { skin: '#a96b43', hair: 'tuft', hc: 'gold', eyes: 'wide', mouth: 'flat', extra: 'glasses' },
  { skin: '#e8dcc3', hair: 'bob', hc: 'orange', eyes: 'dot', mouth: 'open', extra: 'freckles' },
  { skin: '#d9b58a', hair: 'beanie', hc: 'green', eyes: 'line', mouth: 'flat' },
  { skin: '#c98f5c', hair: 'band', hc: 'red', eyes: 'wink', mouth: 'smirk' },
  { skin: '#a96b43', hair: 'spikes', hc: 'ink', eyes: 'dot', mouth: 'smile', extra: 'glasses' },
];

export function drawFace(ctx, idx, x, y, r, lw = 2) {
  const f = FACES[((idx % 12) + 12) % 12];
  ctx.save(); ctx.translate(x, y);
  ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = PAL.ink;
  const hc = col(f.hc);
  if (f.hair === 'bob') {
    ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 1.14, Math.PI, 0); ctx.lineTo(r * 1.14, r * 0.75); ctx.lineTo(-r * 1.14, r * 0.75); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (f.hair === 'bun') { ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -r * 1.1, r * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = f.skin; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - lw / 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = HALF; ctx.beginPath(); ctx.rect(-r, -r, r * 2, r * 2); ctx.arc(-r * 0.3, -r * 0.3, r * 1.12, 0, Math.PI * 2, true); ctx.fill('evenodd');
  ctx.restore();
  // front hair
  if (f.hair === 'tuft') {
    ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, 0, r * 1.02, Math.PI * 1.08, Math.PI * 1.92); ctx.quadraticCurveTo(r * 0.2, -r * 0.55, -r * 0.55, -r * 0.62); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 1.0); ctx.quadraticCurveTo(r * 0.1, -r * 1.5, r * 0.4, -r * 1.2); ctx.stroke();
  } else if (f.hair === 'beanie') {
    ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -r * 1.12, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = col('cream'); ctx.fill(); ctx.stroke();
  } else if (f.hair === 'band') {
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = hc; ctx.fillRect(-r, -r * 0.55, r * 2, r * 0.3); ctx.restore();
    ctx.strokeRect(-r, -r * 0.55, 0, 0); ctx.beginPath(); ctx.moveTo(r * 0.98, -r * 0.45); ctx.lineTo(r * 1.35, -r * 0.7); ctx.lineTo(r * 1.3, -r * 0.2); ctx.closePath(); ctx.fillStyle = hc; ctx.fill(); ctx.stroke();
  } else if (f.hair === 'spikes') {
    ctx.fillStyle = hc;
    for (const a of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(Math.sin(a) * r * 0.85 - r * 0.2, -Math.cos(a) * r * 0.85); ctx.lineTo(Math.sin(a) * r * 1.45, -Math.cos(a) * r * 1.5); ctx.lineTo(Math.sin(a) * r * 0.85 + r * 0.2, -Math.cos(a) * r * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  // features
  ctx.fillStyle = PAL.ink; ctx.strokeStyle = PAL.ink;
  const ex = r * 0.36, ey = -r * 0.02, er = r * (f.eyes === 'wide' ? 0.15 : 0.1);
  const dotEye = (sx) => { ctx.beginPath(); ctx.arc(sx, ey, er, 0, Math.PI * 2); ctx.fill(); };
  const lineEye = (sx) => { ctx.beginPath(); ctx.moveTo(sx - r * 0.12, ey); ctx.lineTo(sx + r * 0.12, ey); ctx.stroke(); };
  if (f.eyes === 'line') { lineEye(-ex); lineEye(ex); } else if (f.eyes === 'wink') { dotEye(-ex); lineEye(ex); } else { dotEye(-ex); dotEye(ex); }
  ctx.lineWidth = lw * 0.8; ctx.beginPath();
  if (f.mouth === 'smile') ctx.arc(0, r * 0.15, r * 0.3, 0.2 * Math.PI, 0.8 * Math.PI);
  else if (f.mouth === 'flat') { ctx.moveTo(-r * 0.22, r * 0.45); ctx.lineTo(r * 0.22, r * 0.45); }
  else if (f.mouth === 'smirk') { ctx.moveTo(-r * 0.2, r * 0.45); ctx.quadraticCurveTo(r * 0.1, r * 0.5, r * 0.3, r * 0.3); }
  if (f.mouth !== 'open') ctx.stroke();
  else { ctx.beginPath(); ctx.ellipse(0, r * 0.45, r * 0.14, r * 0.17, 0, 0, Math.PI * 2); ctx.fill(); }
  if (f.extra === 'freckles') { ctx.fillStyle = col('orange'); for (const [a, b] of [[-0.55, 0.28], [-0.4, 0.38], [0.5, 0.3], [0.38, 0.4]]) { ctx.beginPath(); ctx.arc(a * r, b * r, r * 0.05, 0, Math.PI * 2); ctx.fill(); } }
  if (f.extra === 'blush') { ctx.fillStyle = 'rgba(232,135,58,0.55)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.58, r * 0.3, r * 0.14, 0, Math.PI * 2); ctx.fill(); } }
  if (f.extra === 'stache') { ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.32); ctx.quadraticCurveTo(0, r * 0.15, r * 0.4, r * 0.32); ctx.quadraticCurveTo(0, r * 0.4, -r * 0.4, r * 0.32); ctx.fill(); }
  if (f.extra === 'glasses') { ctx.lineWidth = lw * 0.8; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * ex, ey, r * 0.24, 0, Math.PI * 2); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-ex + r * 0.24, ey); ctx.lineTo(ex - r * 0.24, ey); ctx.stroke(); }
  ctx.restore();
}

// ---------- helmets (drawn over the head) ----------
function drawHelmet(ctx, look, r, lw) {
  if (!look) return;
  const c = col(look.c1);
  ctx.save(); ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = PAL.ink; ctx.fillStyle = c;
  const k = look.kind;
  if (k === 'cap' || k === 'racer') {
    ctx.beginPath(); ctx.arc(0, 0, r * 1.06, Math.PI * 1.03, Math.PI * 1.97); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.55); ctx.quadraticCurveTo(r * 1.4, -r * 0.5, r * 1.35, -r * 0.3); ctx.lineTo(r * 0.6, -r * 0.35); ctx.fill(); ctx.stroke();
    if (k === 'racer') { ctx.strokeStyle = col('cream'); ctx.lineWidth = lw * 0.9; ctx.beginPath(); ctx.moveTo(0, -r * 1.04); ctx.lineTo(0, -r * 0.4); ctx.stroke(); }
  } else if (k === 'goggles') {
    ctx.beginPath(); ctx.arc(0, 0, r * 1.06, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fillStyle = col('char'); ctx.fill(); ctx.stroke();
    ctx.lineWidth = lw * 1.3; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(-r * 1.0, -r * 0.1); ctx.lineTo(r * 1.0, -r * 0.1); ctx.stroke();
    ctx.lineWidth = lw; ctx.fillStyle = 'rgba(232,220,195,0.35)';
    for (const s of [-1, 1]) { ctx.strokeStyle = PAL.ink; ctx.beginPath(); ctx.arc(s * r * 0.38, -r * 0.1, r * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  } else if (k === 'horns') {
    ctx.beginPath(); ctx.arc(0, 0, r * 1.06, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fillStyle = col('char'); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.95, -r * 0.45); ctx.quadraticCurveTo(s * r * 1.9, -r * 0.5, s * r * 1.55, -r * 1.5); ctx.quadraticCurveTo(s * r * 1.35, -r * 0.8, s * r * 0.7, -r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  } else if (k === 'spikes') {
    ctx.beginPath(); ctx.arc(0, 0, r * 1.06, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fillStyle = col('char'); ctx.fill(); ctx.stroke(); ctx.fillStyle = c;
    for (const a of [-0.65, -0.22, 0.22, 0.65]) { const bx = Math.sin(a) * r * 1.0, by = -Math.cos(a) * r * 1.0; ctx.beginPath(); ctx.moveTo(bx - r * 0.17, by + r * 0.05); ctx.lineTo(Math.sin(a) * r * 1.5, -Math.cos(a) * r * 1.55); ctx.lineTo(bx + r * 0.17, by + r * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  } else if (k === 'crown') {
    ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.7); ctx.lineTo(-r * 0.85, -r * 1.55); ctx.lineTo(-r * 0.4, -r * 1.1); ctx.lineTo(0, -r * 1.7); ctx.lineTo(r * 0.4, -r * 1.1); ctx.lineTo(r * 0.85, -r * 1.55); ctx.lineTo(r * 0.8, -r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = HALF; ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.7); ctx.lineTo(r * 0.45, -r * 1.1); ctx.lineTo(r * 0.85, -r * 1.55); ctx.lineTo(r * 0.8, -r * 0.7); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------- poses ----------
// angles: 0 hangs straight down, PI/2 sticks out sideways, PI points up. [upper, lower], right side is +x.
const STAND = { al: [0.2, 0.12], ar: [0.2, 0.12], ll: [0.16, 0.08], lr: [0.16, 0.08], dy: 0, rot: 0 };
export function poseFor(name, t) {
  const s = Math.sin;
  switch (name) {
    case 'fall': { const w = s(t * 11); return { al: [1.95 - 0.12 * w, 2.1 - 0.15 * w], ar: [1.95 + 0.12 * w, 2.1 + 0.15 * w], ll: [0.55 - 0.1 * w, 0.5], lr: [0.55 + 0.1 * w, 0.5], dy: 0, rot: 0 }; }
    case 'chute': { const w = s(t * 2.2); return { al: [2.75, 3.0], ar: [2.75, 3.0], ll: [0.12 - 0.06 * w, 0.06], lr: [0.12 + 0.06 * w, 0.06], dy: 0, rot: 0.05 * w }; }
    case 'crash': return { al: [2.3, 2.5], ar: [2.3, 2.5], ll: [0.5, 0.6], lr: [0.5, 0.6], dy: 0, rot: 0 };
    case 'wave': return { ...STAND, ar: [2.5, 2.9 + 0.55 * s(t * 9)] };
    case 'salute': return { ...STAND, ar: [1.95, 3.55 + 0.04 * s(t * 3)] };
    case 'pump': { const p = Math.abs(s(t * 5)); return { ...STAND, ar: [2.9 - 0.6 * p, 3.1 - 0.6 * p], dy: -p * 0.3 }; }
    case 'flex': { const p = 0.1 * s(t * 6); return { ...STAND, ar: [1.57, 2.9 + p], al: [1.57, 2.9 + p], ll: [0.3, 0.1], lr: [0.3, 0.1] }; }
    case 'dab': return { ...STAND, ar: [2.5, 2.5], al: [1.2, 3.9], ll: [0.25, 0.1], lr: [0.2, 0.1] };
    case 'dance': { const q = s(t * 6); return { al: [2.2 - 0.9 * q, 2.6 - 0.5 * q], ar: [2.2 + 0.9 * q, 2.6 + 0.5 * q], ll: [0.25 - 0.3 * q, 0.2], lr: [0.25 + 0.3 * q, 0.2], dy: -Math.abs(q) * 0.25, rot: 0.08 * q }; }
    case 'flip': {
      const p = (t % 2) / 2;
      if (p < 0.5) { const a = (p / 0.5) * Math.PI * 2; return { al: [0.7, 1.6], ar: [0.7, 1.6], ll: [0.8, 1.7], lr: [0.8, 1.7], dy: -Math.sin((p / 0.5) * Math.PI) * 1.7, rot: -a, pivot: true }; }
      return STAND;
    }
    case 'sit': return { al: [0.45, 0.3], ar: [0.45, 0.3], ll: [-1.5, -1.3], lr: [1.5, 1.3], dy: 1.9, rot: 0 };
    default: return STAND;
  }
}

// ---------- the diver ----------
// o: x, y (neck), u (size unit), face, suit look, helmet look, pose (poseFor result), rot, alpha
export function drawFigure(ctx, o) {
  const u = o.u, lw = Math.max(1.4, u * 0.16), p = o.pose || STAND;
  const suit = o.suit || { c1: 'char', c2: 'cream' };
  ctx.save();
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  ctx.translate(o.x, o.y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.translate(0, p.dy * u);
  if (p.rot) { const py = p.pivot ? 0.9 * u : 1.75 * u; ctx.translate(0, py); ctx.rotate(p.rot); ctx.translate(0, -py); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.ink;
  const hipY = 1.75 * u, shY = 0.2 * u;
  const limb = (sx, sy, a, side, l1, l2) => {
    const x1 = sx + side * Math.sin(a[0]) * l1, y1 = sy + Math.cos(a[0]) * l1;
    const x2 = x1 + side * Math.sin(a[1]) * l2, y2 = y1 + Math.cos(a[1]) * l2;
    ctx.lineWidth = lw * 1.5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    return [x2, y2];
  };
  limb(0, hipY, p.ll, -1, u, u); limb(0, hipY, p.lr, 1, u, u);
  // torso: suit colour, ink outline, half-tone on the right
  const tw = u * 0.55;
  ctx.lineWidth = tw + lw * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, hipY); ctx.stroke();
  ctx.lineWidth = tw; ctx.strokeStyle = col(suit.c1); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, hipY); ctx.stroke();
  ctx.lineWidth = tw * 0.4; ctx.strokeStyle = HALF; ctx.beginPath(); ctx.moveTo(tw * 0.3, u * 0.1); ctx.lineTo(tw * 0.3, hipY - u * 0.1); ctx.stroke();
  ctx.lineWidth = lw * 1.1; ctx.strokeStyle = col(suit.c2); ctx.beginPath(); ctx.moveTo(-tw * 0.5, hipY - u * 0.28); ctx.lineTo(tw * 0.5, hipY - u * 0.28); ctx.stroke();
  ctx.strokeStyle = PAL.ink;
  const hl = limb(0, shY, p.al, -1, u * 0.85, u * 0.8), hr = limb(0, shY, p.ar, 1, u * 0.85, u * 0.8);
  const hr0 = u * 0.62, hy = -hr0 * 1.02;
  drawFace(ctx, o.face || 0, 0, hy, hr0, lw);
  ctx.save(); ctx.translate(0, hy); drawHelmet(ctx, o.helmet, hr0, lw); ctx.restore();
  // hand and head positions in the caller's space (for parasol strings)
  const m = ctx.getTransform();
  const to = (x, y) => { const pt = m.transformPoint(new DOMPoint(x, y)); return [pt.x, pt.y]; };
  const out = { handL: to(hl[0], hl[1]), handR: to(hr[0], hr[1]), head: to(0, hy - hr0) };
  ctx.restore();
  // convert from device space back (caller uses CSS px with a scale transform): undo the base transform
  const base = ctx.getTransform(); const inv = base.inverse();
  const back = (pt) => { const q = inv.transformPoint(new DOMPoint(pt[0], pt[1])); return [q.x, q.y]; };
  return { handL: back(out.handL), handR: back(out.handR), head: back(out.head) };
}

// ---------- parasol ----------
export function drawParasol(ctx, x, y, w, look, open01 = 1, lw = 2) {
  const l = look || { pat: 'solid', c1: 'cream', c2: 'cream' };
  const e = Math.max(0.05, Math.min(1.2, open01));
  const wd = w * (0.3 + 0.7 * Math.min(1, e)) * (e > 1 ? 1 + (e - 1) * 0.3 : 1), hd = w * 0.5 * (0.35 + 0.65 * Math.min(1, e));
  const n = 5, x0 = x - wd / 2;
  const dome = new Path2D();
  dome.ellipse(x, y, wd / 2, hd, 0, Math.PI, Math.PI * 2);
  for (let k = n; k >= 1; k--) { const xs = x0 + (k * wd) / n, xe = xs - wd / n; dome.quadraticCurveTo((xs + xe) / 2, y + hd * 0.26, xe, y); }
  dome.closePath();
  ctx.save();
  ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = PAL.ink;
  ctx.fillStyle = col(l.c1); ctx.fill(dome);
  ctx.save(); ctx.clip(dome);
  const rib = (k) => [x0 + (k * wd) / n];
  const gore = (k, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - hd); ctx.quadraticCurveTo(x0 + (k * wd) / n - wd * 0.06 * (k - n / 2) / (n / 2) - 0, y - hd * 0.4, x0 + (k * wd) / n, y + hd * 0.3); ctx.lineTo(x0 + ((k + 1) * wd) / n, y + hd * 0.3); ctx.quadraticCurveTo(x0 + ((k + 1) * wd) / n - wd * 0.06 * (k + 1 - n / 2) / (n / 2), y - hd * 0.4, x, y - hd); ctx.fill(); };
  if (l.pat === 'stripes') for (let k = 0; k < n; k += 2) gore(k, col(l.c2));
  else if (l.pat === 'patch') { const cs = [l.c1, l.c2, 'gold', 'orange', 'cream']; for (let k = 0; k < n; k++) gore(k, col(cs[k % cs.length])); }
  else if (l.pat === 'checker') { ctx.fillStyle = col(l.c2); const s = wd / 8; for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) ctx.fillRect(x0 + i * s, y - hd + j * s, s, s); }
  else if (l.pat === 'dots') { ctx.fillStyle = col(l.c2); for (let i = 0; i < 9; i++) { const dx = ((i * 37) % 100) / 100, dy = ((i * 61) % 100) / 100; ctx.beginPath(); ctx.arc(x0 + wd * (0.12 + dx * 0.76), y - hd * (0.1 + dy * 0.75), Math.max(1, w * 0.03), 0, Math.PI * 2); ctx.fill(); } }
  ctx.fillStyle = HALF; ctx.beginPath(); ctx.moveTo(x + wd * 0.12, y - hd); ctx.lineTo(x + wd * 0.6, y - hd); ctx.lineTo(x + wd * 0.6, y + hd * 0.4); ctx.lineTo(x + wd * 0.2, y + hd * 0.4); ctx.closePath(); ctx.fill();
  ctx.lineWidth = lw * 0.6; for (let k = 1; k < n; k++) { ctx.beginPath(); ctx.moveTo(x, y - hd); ctx.quadraticCurveTo(x0 + (k * wd) / n - wd * 0.04 * (k - n / 2) / (n / 2), y - hd * 0.45, x0 + (k * wd) / n, y + hd * 0.3); ctx.stroke(); }
  ctx.restore();
  ctx.lineWidth = lw; ctx.stroke(dome);
  ctx.beginPath(); ctx.moveTo(x, y - hd); ctx.lineTo(x, y - hd - lw * 3); ctx.stroke();
  ctx.restore();
  return { left: [x0, y], right: [x0 + wd, y], hem: y };
}

export function drawStrings(ctx, p, handL, handR, lw = 2) {
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = Math.max(1, lw * 0.5); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p.left[0], p.left[1]); ctx.lineTo(handL[0], handL[1]); ctx.moveTo(p.right[0], p.right[1]); ctx.lineTo(handR[0], handR[1]); ctx.stroke(); ctx.restore();
}

// ---------- plane (faces right) ----------
export function drawPlane(ctx, x, y, s, look, t = 0, lw = 2) {
  const c = col(look && look.c1 || 'cream'), jet = look && look.kind === 'jet';
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = PAL.ink; ctx.fillStyle = c;
  // tail fin
  ctx.beginPath(); ctx.moveTo(-s * 1.9, -s * 0.05); ctx.lineTo(-s * 2.5, -s * 1.0); ctx.lineTo(-s * 1.7, -s * 0.9); ctx.lineTo(-s * 1.2, -s * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  // fuselage
  ctx.beginPath(); ctx.moveTo(-s * 2.5, -s * 0.2); ctx.quadraticCurveTo(-s * 0.5, -s * 0.7, s * 1.9, -s * 0.2); ctx.quadraticCurveTo(s * 2.3, s * 0.1, s * 1.9, s * 0.3); ctx.quadraticCurveTo(-s * 0.5, s * 0.7, -s * 2.5, s * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = HALF; ctx.beginPath(); ctx.moveTo(-s * 2.3, s * 0.05); ctx.quadraticCurveTo(-s * 0.5, s * 0.5, s * 1.9, s * 0.25); ctx.quadraticCurveTo(-s * 0.5, s * 0.7, -s * 2.4, s * 0.12); ctx.closePath(); ctx.fill();
  // wing
  ctx.fillStyle = c; ctx.beginPath();
  if (jet) { ctx.moveTo(s * 0.5, s * 0.1); ctx.lineTo(-s * 1.3, s * 0.95); ctx.lineTo(-s * 0.7, s * 0.95); ctx.lineTo(s * 0.9, s * 0.15); } else { ctx.moveTo(s * 0.7, s * 0.1); ctx.lineTo(s * 0.1, s * 0.95); ctx.lineTo(-s * 0.9, s * 0.95); ctx.lineTo(-s * 0.5, s * 0.1); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // windows
  ctx.fillStyle = PAL.ink; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(s * (0.3 + i * 0.4), -s * 0.12, s * 0.1, 0, Math.PI * 2); ctx.fill(); }
  if (!jet) { ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw * 1.2; const a = Math.sin(t * 40) * s * 0.55; ctx.beginPath(); ctx.moveTo(s * 2.05, s * 0.05 - a); ctx.lineTo(s * 2.05, s * 0.05 + a); ctx.stroke(); }
  ctx.restore();
}

// ---------- trail (drawn above a falling or floating diver, fading out) ----------
export function drawTrail(ctx, look, x, y, u, t, dir = 1) {
  if (!look || look.kind === 'none') return;
  const k = look.kind, c = col(look.c1);
  ctx.save();
  for (let i = 1; i <= 9; i++) {
    const f = i / 9, yy = y - dir * i * u * 1.15, wob = Math.sin(t * 5 + i * 1.3) * u * 0.35 * f, a = (1 - f) * 0.8;
    ctx.globalAlpha = a;
    if (k === 'smoke') { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + wob, yy, u * (0.25 + f * 0.7), 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = HALF; ctx.beginPath(); ctx.arc(x + wob + u * 0.12, yy + u * 0.1, u * (0.15 + f * 0.5), 0, Math.PI * 2); ctx.fill(); }
    else if (k === 'fire') { ctx.fillStyle = f < 0.45 ? c : col('red'); ctx.beginPath(); ctx.ellipse(x + wob, yy, u * (0.28 - f * 0.12), u * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (k === 'rings') { ctx.strokeStyle = c; ctx.lineWidth = Math.max(1.2, u * 0.16); ctx.beginPath(); ctx.ellipse(x, yy, u * (0.6 + f * 1.1), u * (0.18 + f * 0.25), 0, 0, Math.PI * 2); ctx.stroke(); }
    else if (k === 'dust') { ctx.fillStyle = i % 2 ? c : col('gold'); const r = u * 0.12 * (1 + Math.sin(t * 6 + i)); ctx.beginPath(); ctx.moveTo(x + wob * 2, yy - r * 2); ctx.lineTo(x + wob * 2 + r, yy); ctx.lineTo(x + wob * 2, yy + r * 2); ctx.lineTo(x + wob * 2 - r, yy); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}

// ---------- stamp ----------
export function drawStamp(ctx, x, y, text, sub, alpha = 1, scale = 1, style = 'seal', color = null) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.1); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
  const g = color || col('green');
  if (style === 'wax' || style === 'star') {
    ctx.fillStyle = style === 'wax' ? PAL.red : g; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.beginPath();
    if (style === 'wax') ctx.arc(0, 0, 19, 0, Math.PI * 2);
    else for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 11 : 22; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = style === 'wax' ? PAL.cream : PAL.ink; ctx.font = `700 12px ${SYS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 1);
    if (sub) { ctx.rotate(0.1); ctx.font = `700 11px ${SYS}`; ctx.fillStyle = PAL.cream; ctx.fillText(sub, 0, 34); }
    ctx.restore(); return;
  }
  ctx.font = `22px ${DISPLAY}`; const w = Math.max(54, ctx.measureText(text).width + 22), h = 30;
  ctx.fillStyle = 'rgba(20,22,26,0.82)'; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.strokeRect(-w / 2, -h / 2, w, h); ctx.lineWidth = 1; ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  ctx.fillStyle = g; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 1);
  if (sub) { ctx.rotate(0.1); ctx.font = `700 11px ${SYS}`; ctx.fillStyle = PAL.cream; ctx.fillText(sub, 0, h / 2 + 12); }
  ctx.restore();
}

// ---------- scenery ----------
let moonC = null;
export function moon(ctx, x, y, r) {
  if (!moonC || moonC.r !== r) {
    const c = document.createElement('canvas'); c.width = c.height = Math.ceil(r * 2.6); const g = c.getContext('2d');
    g.fillStyle = PAL.cream; g.beginPath(); g.arc(c.width / 2, c.height / 2, r, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(c.width / 2 + r * 0.5, c.height / 2 - r * 0.2, r * 0.88, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over'; g.strokeStyle = PAL.ink; g.lineWidth = 2; g.globalAlpha = 0.5;
    c.r = r; moonC = c;
  }
  ctx.drawImage(moonC, x - moonC.width / 2, y - moonC.height / 2);
}

let clouds = null;
export function cloudSprites() {
  if (clouds) return clouds;
  clouds = [];
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let n = 0; n < 4; n++) {
    const c = document.createElement('canvas'); c.width = 360; c.height = 130; const g = c.getContext('2d');
    g.shadowColor = 'rgba(70,74,86,0.9)'; g.shadowBlur = 16;
    for (let i = 0; i < 9; i++) {
      g.fillStyle = `rgba(${52 + (rnd() * 18) | 0},${56 + (rnd() * 18) | 0},${66 + (rnd() * 18) | 0},${0.35 + rnd() * 0.3})`;
      g.beginPath(); g.ellipse(70 + rnd() * 220, 62 + (rnd() - 0.5) * 34, 40 + rnd() * 60, 14 + rnd() * 20, (rnd() - 0.5) * 0.2, 0, Math.PI * 2); g.fill();
    }
    g.shadowBlur = 0; g.strokeStyle = 'rgba(13,14,17,0.35)'; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) { g.lineWidth = 2 + rnd() * 4; g.beginPath(); const y0 = 50 + rnd() * 40; g.moveTo(40 + rnd() * 60, y0); g.quadraticCurveTo(160 + rnd() * 40, y0 - 20 + rnd() * 40, 260 + rnd() * 60, y0 + rnd() * 10); g.stroke(); }
    clouds.push(c);
  }
  return clouds;
}

export function drawTree(ctx, x, gy, s, lw = 2) {
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.fillStyle = PAL.c0;
  ctx.fillRect(x - s * 0.06, gy - s * 0.4, s * 0.12, s * 0.4);
  ctx.beginPath(); ctx.moveTo(x - s * 0.4, gy - s * 0.3); ctx.lineTo(x, gy - s * 1.2); ctx.lineTo(x + s * 0.4, gy - s * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
export function drawHouse(ctx, x, gy, s, lw = 2) {
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.fillStyle = PAL.c0;
  ctx.beginPath(); ctx.rect(x - s * 0.5, gy - s * 0.55, s, s * 0.55); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - s * 0.62, gy - s * 0.55); ctx.lineTo(x, gy - s * 1.0); ctx.lineTo(x + s * 0.62, gy - s * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.orange; ctx.fillRect(x - s * 0.28, gy - s * 0.4, s * 0.2, s * 0.2); ctx.fillRect(x + s * 0.1, gy - s * 0.4, s * 0.2, s * 0.2);
  ctx.restore();
}

// ---------- preview used by Locker, the side panel and the shop ----------
// cfg: { face, suit, helmet, chute, trail, emote, plane } as catalog ids; mode picks what to show
export function drawPreview(ctx, w, h, cfg, t, mode = 'diver') {
  ctx.clearRect(0, 0, w, h);
  const look = (cat, id) => { const it = find(cat, id); return it ? it.look : null; };
  const u = Math.min(w, h) / (mode === 'diver' ? 9.4 : 6.6);
  const lw = Math.max(1.4, u * 0.16);
  if (mode === 'plane') { drawPlane(ctx, w / 2, h / 2, Math.min(w, h) / 6.2, look('plane', cfg.plane), t, lw); return; }
  const air = mode === 'chute' || mode === 'trail' || (mode === 'diver' && Math.floor(t / 3.4) % 2 === 1);
  if (air) {
    const cx = w / 2, ny = h * 0.52;
    drawTrail(ctx, look('trail', cfg.trail), cx, ny - u * 2.4, u, t, 1);
    const f = drawFigure(ctx, { x: cx, y: ny, u: u * 0.8, face: cfg.face, suit: look('suit', cfg.suit), helmet: look('helmet', cfg.helmet), pose: poseFor('chute', t) });
    const hem = ny - u * 2.2;
    const p = drawParasol(ctx, cx, hem, u * 5.2, look('chute', cfg.chute), 1, lw);
    drawStrings(ctx, p, f.handL, f.handR, lw);
  } else {
    const pose = mode === 'emote' || mode === 'diver' ? cfg.emote : 'stand';
    const gy = h * 0.88, ny = gy - STAND_H * u;
    ctx.strokeStyle = PAL.gold; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w * 0.15, gy + 1); ctx.lineTo(w * 0.85, gy + 1); ctx.stroke(); ctx.globalAlpha = 1;
    drawFigure(ctx, { x: w / 2, y: ny, u, face: cfg.face, suit: look('suit', cfg.suit), helmet: look('helmet', cfg.helmet), pose: poseFor(find('emote', cfg.emote) ? find('emote', cfg.emote).look.pose : pose, t) });
  }
}
