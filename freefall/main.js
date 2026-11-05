// Freefall v2: 2D side view. World metres: x sideways, alt above ground. Screen follows one diver.
import { CONFIG as C } from './config.js';
import * as S from './sim.js';
import { CATALOG, CATEGORIES, find } from './catalog.js';
import { Store, ACH } from './state.js';
import { Sfx } from './audio.js';
import { Art } from './art.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const h2 = (a, b) => hash(a * 7.13 + b * 3.77 + 1.9);
const easeOutBack = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const short = (n) => (n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));

// ---------------------------------------------------------------- setup
const params = new URLSearchParams(location.search);
const nowFn = params.get('now') ? () => new Date(params.get('now')) : () => new Date();
const store = new Store(localStorage, nowFn);
const sfx = new Sfx(); const art = new Art();
const cv = $('c'), ctx = cv.getContext('2d');
let W = 0, H = 0, anchorY = 0, pxm = 1, pxx = 1, cell = 140, mpp = 44, endMode = false;

let reduce = store.s.settings.reduce;
if (reduce === null) reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function applySettings() {
  document.documentElement.classList.toggle('reduce', !!reduce);
  const th = store.s.settings.theme; if (th === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', th);
  $('setreduce').setAttribute('aria-checked', String(!!reduce)); $('setsound').setAttribute('aria-checked', String(store.s.settings.sound));
  document.querySelectorAll('#settheme button').forEach((b) => b.classList.toggle('on', b.dataset.v === store.s.settings.theme));
  sfx.on = store.s.settings.sound; if (sfx.ctx) sfx.setOn(sfx.on);
}

function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  anchorY = endMode ? H * 0.68 : H * 0.38; pxm = (H - H * 0.38) / C.groundVisibleM; pxx = pxm * C.xStretch; cell = clamp(H * 0.17, 110, 170); mpp = cell / 3.2;
}
addEventListener('resize', layout); layout();

// ---------------------------------------------------------------- game state
const G = {
  state: 'idle', t: 0, round: null, watch: -1, camAlt: 900, camX: 0, offA: 0, ease: 0, timeScale: 1, slow: 0, shake: 0,
  balShown: store.balance, parts: [], trail: [], lines: [], acc: 0, forceH: params.get('h') ? +params.get('h') : null, histDirty: true, hudT: 0,
  input: { key: 0, touch: 0 }, lastMultInt: 1,
};
window.__ff = { G, store, art, sfx, C };

function equippedLook() { return { suit: store.equipped('suit'), helmet: store.equipped('helmet'), chute: store.equipped('chute') }; }
const rndLook = () => ({ suit: CATALOG.suit[Math.floor(Math.random() * CATALOG.suit.length)].id, helmet: CATALOG.helmet[Math.floor(Math.random() * CATALOG.helmet.length)].id, chute: CATALOG.chute[Math.floor(Math.random() * CATALOG.chute.length)].id });

function startRound(bet) {
  const h = G.forceH || S.randomHeight();
  const n = C.botsMin + Math.floor(Math.random() * (C.botsMax - C.botsMin + 1));
  const names = shuffle(C.botNames).slice(0, n);
  const offs = shuffle(names.map((_, i) => (i - (n - 1) / 2) * (2 * C.botDriftSpread / Math.max(1, n - 1))));
  const bots = names.map((nm, i) => {
    const b = S.makeBot(nm, store.balance, h);
    Object.assign(b, { emo: CATALOG.emote[Math.floor(Math.random() * CATALOG.emote.length)].id, x: offs[i], vx: 0, ox: offs[i], nt: 0, face: 1, openT: -1, announced: false, reported: false, phase: Math.random() * 6, look: rndLook() });
    return b;
  });
  const me = { j: S.newJumper(h), x: 0, vx: 0, face: 1, openT: -1, phase: 0, look: equippedLook(), emo: store.equipped('emote'), bet, landed: false, rec: null };
  G.round = { h, bet, me, bots, t: 0, planeX: -2, plane: store.equipped('plane'), finishAt: null, results: false, endList: null, endT: 0 };
  store.startRound(bet);
  G.state = 'fall'; G.watch = -1; G.camAlt = h; G.camX = 0; G.offA = 0; G.timeScale = 1; G.slow = 0; G.parts = []; G.trail = []; G.lines = []; G.acc = 0;
  G.lastMultInt = 1; G.trailT = 0; G.camX = 0;
  setUI();
}

function doOpen() {
  const r = G.round; if (!r || G.state !== 'fall') return;
  if (!S.open(r.me.j)) return;
  r.me.openT = r.t; G.state = 'chute';
  sfx.whump();
  if (!reduce) { G.slow = C.slowmoSecs; G.ease = 1; G.shake = Math.max(G.shake, 5); }
  $('mult').classList.add('locked');
  const hb = highestBot(); if (hb >= 0) switchWatch(hb, false);
  setUI();
}

// ---------------------------------------------------------------- simulation step
function entityStep(e, dt, isMe, r) {
  const j = e.j; const opened = j.opened;
  if (!j.landed) {
    let dir;
    if (isMe) dir = clamp(G.input.key + G.input.touch, -1, 1);
    else {
      e.nt -= dt; if (e.nt <= 0) { e.nt = 0.8 + Math.random() * 2; e.ox = (Math.random() * 2 - 1) * C.botDriftSpread; }
      const target = r.me.x + e.ox; dir = clamp((target - e.x) / 6, -1, 1) * 0.85;
    }
    const sp = opened ? C.driftChute : C.driftFree;
    e.vx += (dir * sp - e.vx) * Math.min(1, dt * 5);
    e.x += e.vx * dt;
    if (Math.abs(dir) > 0.15) e.face = dir > 0 ? 1 : -1;
  } else e.vx = 0;
}

function simStep(dt) {
  const r = G.round; r.t += dt; const me = r.me;
  if (!me.j.landed) { S.step(me.j, dt); entityStep(me, dt, true, r); if (me.j.landed) onMeLanded(); }
  for (const b of r.bots) {
    if (!b.done) { S.stepBot(b, dt); entityStep(b, dt, false, r); }
    if (b.j.opened && !b.announced) {
      b.announced = true; b.openT = r.t;
      const m = S.multiplierAt(b.j.openFallen);
      popup(`${b.name} opened at ${m.toFixed(2)}x`); sfx.botOpen();
    }
    if (b.done && !b.reported) {
      b.reported = true; const win = b.result.win;
      if (!win) { popup(`${b.name} crashed`, true); dust(b.x, 0, 14); } else dust(b.x, 0, 5);
    }
  }
  // trail for the player
  if (G.state === 'fall' && store.equipped('trail') !== 'none') {
    G.trailT = (G.trailT || 0) - dt;
    if (G.trailT <= 0) { G.trailT = 0.035; G.trail.push({ x: me.x, alt: me.j.y, t: 0, life: 0.9, id: store.equipped('trail') }); }
  }
  // end of round
  if (me.j.landed && r.bots.every((b) => b.done) && !r.endList && !r.results) startEnding();
}

function onMeLanded() {
  const r = G.round, me = r.me, j = me.j;
  const out = S.outcome(j, r.bet);
  me.rec = { h: r.h, bet: r.bet, win: out.win, mult: out.mult, payout: out.payout, opened: j.opened, openAlt: j.openAlt, landSpeed: j.landSpeed };
  me.landed = true; me.crashed = !out.win; r.meLandT = r.t;
  G.state = 'landed';
  const sx = W / 2, sy = anchorY + 0;
  if (out.win) {
    sfx.land(); coins(40);
    G.balStart = store.balance; // balance before payout
    store.finishRound(me.rec); r.ach = store.checkAch(null);
    setTimeout(() => sfx.win(), 120);
    r.finishAt = r.t + 1.4;
  } else {
    sfx.crash(); dust(me.x, 0, 26);
    if (!reduce) { G.shake = 16; flash(0.5); } else flash(0.18);
    store.finishRound(me.rec);
    r.finishAt = r.t + 1.3;
  }
  r.ach = store.checkAch(null);
  setUI();
}

function showResults() {
  const r = G.round; r.results = true; G.state = 'result'; G.watch = -1; G.timeScale = 1;
  sfx.stopAll();
  const me = r.me, rec = me.rec;
  const rows = [{ name: 'You', me: true, bet: r.bet, win: rec.win, net: rec.win ? rec.payout - r.bet : -r.bet, mult: rec.mult, openAlt: rec.opened ? rec.openAlt : null, speed: rec.landSpeed }];
  for (const b of r.bots) {
    const o = b.result;
    rows.push({ name: b.name, bet: b.bet, win: o.win, net: o.net, mult: o.mult, openAlt: b.j.opened ? b.j.openAlt : null, speed: o.landSpeed });
  }
  rows.sort((a, b) => b.net - a.net);
  $('restitle').textContent = rec.win ? 'Landed safely' : (rec.opened ? 'Too fast' : 'You never opened it');
  $('ressub').innerHTML = `Real height <b>${fmt(r.h)} m</b>. ` + (rec.opened ? `You opened at ${fmt(rec.openAlt)} m for ${rec.mult.toFixed(2)}x.` : `You were at ${rec.mult.toFixed(2)}x.`);
  const big = $('resbig'); big.className = rec.win ? 'win' : 'lose'; big.textContent = (rec.win ? '+' : '-') + fmt(Math.abs(rec.win ? rec.payout - r.bet : r.bet));
  const head = '<div class="rrow head"><span>#</span><span>Jumper</span><span style="text-align:right">Bet</span><span style="text-align:right">Result</span></div>';
  $('restbl').innerHTML = head + rows.map((x, i) => {
    const detail = x.openAlt !== null ? `opened at ${fmt(x.openAlt)} m, ${x.mult.toFixed(2)}x` : 'never opened';
    const tail = x.win ? '' : `, hit at ${Math.round(x.speed)} m/s`;
    return `<div class="rrow${x.me ? ' me' : ''}"><span>${i + 1}</span><span>${x.name}<small>${detail}${tail}</small></span><span style="text-align:right">${fmt(x.bet)}</span><span class="${x.win ? 'g' : 'r'}">${x.win ? '+' : '-'}${fmt(Math.abs(x.net))}</span></div>`;
  }).join('');
  G.histDirty = true;
  openPanel($('resp'));
  setTimeout(() => { const m = document.querySelector('#restbl .me'); if (m) m.scrollIntoView({ block: 'nearest' }); }, 60);
  if (r.ach && r.ach.length) r.ach.forEach((a, i) => setTimeout(() => toast(`Achievement: ${a.name}`), 500 + i * 1800));
  setUI();
}

// ---------------------------------------------------------------- effects
function coins(n) {
  const r = G.round; const x = W / 2, y = anchorY + cell * 0.3;
  for (let i = 0; i < (reduce ? 8 : n); i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 160 + Math.random() * 380;
    G.parts.push({ k: 'coin', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 900, life: 0, max: 1.1 + Math.random() * 0.5, r: 5 + Math.random() * 3, spin: Math.random() * 6 });
    if (i < 8) setTimeout(() => sfx.coin(i), i * 55);
  }
}
function dust(wx, alt, n) {
  const r = G.round; if (!r) return;
  const x = W / 2 + (wx - G.camX) * pxx; const y = anchorY + (G.camAlt - alt) * pxm;
  dustAt(x, y, n);
}
function dustAt(x, y, n) {
  for (let i = 0; i < (reduce ? Math.ceil(n / 3) : n); i++) {
    const a = Math.PI + Math.random() * Math.PI, sp = 40 + Math.random() * 160;
    G.parts.push({ k: 'dust', x, y: y - 4, vx: Math.cos(a) * sp * (Math.random() < .5 ? -1 : 1), vy: Math.sin(a) * sp * 0.7, g: 120, life: 0, max: 0.7 + Math.random() * 0.5, r: 6 + Math.random() * 10 });
  }
}
function flash(a) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = a; void f.offsetWidth; f.style.transition = `opacity ${reduce ? 0.2 : 0.45}s ease-out`; f.style.opacity = 0; }
function popup(text, bad) {
  const d = document.createElement('div'); d.className = 'pop' + (bad ? ' bad' : ''); d.textContent = text; const p = $('pops'); p.appendChild(d);
  setTimeout(() => d.remove(), 2300); while (p.children.length > 3) p.firstChild.remove();
}
let toastT = null;
function toast(msg, action, fn) {
  const t = $('toast'); t.innerHTML = ''; const s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
  if (action) { const b = document.createElement('button'); b.textContent = action; b.onclick = () => { fn(); t.classList.add('hide'); }; t.appendChild(b); }
  t.classList.remove('hide'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hide'), action ? 5000 : 2600);
}

// ---------------------------------------------------------------- rendering
const SKY = () => find('bg', store.equipped('bg'));
function drawSky(bg) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, bg.sky[0]); g.addColorStop(1, bg.sky[1]); ctx.fillStyle = g; ctx.fillRect(-40, -40, W + 80, H + 80);
  if (['bg_night', 'bg_space', 'bg_aurora'].includes(bg.id)) {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 70; i++) { const x = hash(i) * W, y = hash(i + 99) * H * 0.85, s = 0.6 + hash(i + 7) * 1.4; ctx.fillRect(x, y, s, s); }
  }
  const im = art.get(bg.id);
  if (im) {
    if (bg.id === 'bg_aurora') { const w = Math.max(W, 520); ctx.globalAlpha = 0.8; ctx.drawImage(im, (W - w) / 2, 0, w, w / 2); ctx.globalAlpha = 1; }
    else { const s = Math.min(W, H) * 0.24; ctx.drawImage(im, W * 0.88 - s / 2, H * 0.1 - s / 2, s, s); }
  }
}

function cloudsAndBirds(near) {
  const camAlt = G.camAlt, camX = G.camX, tt = G.round ? G.round.t : G.t;
  const list = [];
  const span = (anchorY + 120) / (pxm * 0.5) + 30;
  const k0 = Math.floor((camAlt - span) / 30), k1 = Math.floor((camAlt + span) / 30);
  const TW = W + 520, sc = H / 844 + 0.25;
  for (let k = k0; k <= k1; k++) {
    for (let n = 0; n < 2; n++) {
      if (h2(k, n * 9 + 1) > (n ? 0.3 : 0.55)) continue;
      const alt = k * 30 + h2(k, n * 9 + 2) * 30, par = 0.5 + h2(k, n * 9 + 3) * 0.95;
      if ((par > 1.05) !== near) continue;
      const y = anchorY + (camAlt - alt) * pxm * par; if (y < -120 || y > H + 120) continue;
      const w = (140 + 190 * h2(k, n * 9 + 5)) * (0.55 + par * 0.55) * sc;
      const x = mod(h2(k, n * 9 + 4) * TW - camX * pxm * par * 0.9 - (tt * 1.5), TW) - 260;
      list.push({ y, x, w, par, v: Math.floor(h2(k, n * 9 + 6) * 3) });
    }
  }
  list.sort((a, b) => a.par - b.par);
  for (const c of list) { const im = art.get('sc_cloud_' + c.v); if (!im) continue; ctx.globalAlpha = near ? 0.85 : 0.95; ctx.drawImage(im, c.x - c.w / 2, c.y - c.w / 4, c.w, c.w / 2); }
  ctx.globalAlpha = 1;
  if (near) return;
  // birds
  const b0 = Math.floor((camAlt - span) / 90), b1 = Math.floor((camAlt + span) / 90);
  for (let k = b0; k <= b1; k++) {
    if (k * 90 > 2300 || h2(k, 70) > 0.4) continue;
    const alt = k * 90 + h2(k, 71) * 90, par = 0.9 + h2(k, 72) * 0.2;
    const y = anchorY + (camAlt - alt) * pxm * par; if (y < -60 || y > H + 60) continue;
    const dir = h2(k, 73) < 0.5 ? -1 : 1, vb = dir * (3 + h2(k, 74) * 4);
    const x = mod(h2(k, 75) * TW - camX * pxm * par + (tt * vb * pxm), TW) - 260;
    const w = 54 * sc, im = art.get('sc_bird_' + (Math.floor(tt * 7 + k) % 2));
    if (!im) continue;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.drawImage(im, -w / 2, -w / 2, w, w); ctx.restore();
  }
}

function drawGround(bg) {
  const gy = anchorY + G.camAlt * pxm; if (gy > H + 200) return;
  const dark = 1 - bg.light;
  const camX = G.camX;
  // distant hills
  const hill = (col, base, amp, f, par, off) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-10, H + 10);
    for (let x = -10; x <= W + 10; x += 12) { const wx = camX * pxm * par + x; ctx.lineTo(x, gy - base - amp * (Math.sin(wx * f + off) * 0.6 + Math.sin(wx * f * 2.3 + off * 2) * 0.4)); }
    ctx.lineTo(W + 10, H + 10); ctx.closePath(); ctx.fill();
  };
  hill('#86bfa0', 70, 34, 0.0048, 0.25, 1); hill('#6fb08a', 38, 24, 0.0075, 0.45, 4);
  // ground
  ctx.fillStyle = '#62ad4c'; ctx.fillRect(-10, gy, W + 20, H - gy + 10);
  ctx.fillStyle = '#79c25d'; ctx.fillRect(-10, gy, W + 20, 10);
  ctx.fillStyle = '#58a044';
  for (let i = 0; i < 5; i++) ctx.fillRect(-10, gy + 24 + i * (22 + i * 8), W + 20, 4 + i);
  // scenery in 14 m cells, deterministic
  const half = W / 2 / pxm + 10, i0 = Math.floor((camX - half) / 14), i1 = Math.ceil((camX + half) / 14);
  for (let i = i0; i <= i1; i++) {
    const r = h2(i, 1); if (r > 0.62) continue;
    const wx = i * 14 + h2(i, 3) * 8, sx = W / 2 + (wx - camX) * pxm, row = h2(i, 4) < 0.35;
    const base = gy + (row ? 12 : 2), k = pxm * (row ? 1.6 : 2.0);
    if (r < 0.5) {
      const im = art.get(r < 0.28 ? 'sc_tree_pine' : 'sc_tree_round'); if (!im) continue;
      const s = k / 32; ctx.drawImage(im, sx - 128 * s, base - 262 * s, 256 * s, 320 * s);
    } else {
      const im = art.get('sc_house_' + (h2(i, 2) < 0.5 ? 0 : 1)); if (!im) continue;
      const s = k / 42.67; ctx.drawImage(im, sx - 128 * s, base - 209 * s, 256 * s, 256 * s);
    }
  }
  if (dark > 0.02) {
    const g = ctx.createLinearGradient(0, gy - 160, 0, gy - 30); g.addColorStop(0, 'rgba(5,10,36,0)'); g.addColorStop(1, `rgba(5,10,36,${dark * 0.8})`);
    ctx.fillStyle = g; ctx.fillRect(0, gy - 160, W, 130); ctx.fillStyle = `rgba(5,10,36,${dark * 0.8})`; ctx.fillRect(0, gy - 30, W, H - gy + 40);
  }
}

function altSy(alt) { return anchorY + (G.camAlt - alt) * pxm; }
function poseOf(e, r) {
  const j = e.j;
  if (j.landed) return e.crashed || (e.result && !e.result.win) ? 'crash' : 'land';
  if (j.opened) { const since = r.t - e.openT; return since < 0.4 ? 'open' : (j.y < 4 ? 'land' : 'hang'); }
  return Math.floor(r.t * (3 + 7 * j.v / C.terminalSpeed) + e.phase) % 2 ? 'fall_a' : 'fall_b';
}
function drawEntity(e, isMe, r) {
  const j = e.j, x = W / 2 + (e.x - G.camX) * pxx; const pose = poseOf(e, r);
  let y = altSy(j.y);
  const landedBad = j.landed && (isMe ? e.crashed : (e.result && !e.result.win));
  const foot = (pose === 'crash' ? 0.95 : pose === 'fall_a' || pose === 'fall_b' ? 0.45 : 0.98) * mpp;
  y -= foot * clamp(1 - j.y / 6, 0, 1);
  if (y < -cell * 2.5 || y > H + cell * 2) return;
  const sc = 1 - 0.1 * G.ease;
  const c = cell * sc, m = mpp * sc;
  const tilt = (pose === 'fall_a' || pose === 'fall_b') ? clamp(e.vx / C.driftFree, -1, 1) * 0.12 * e.face : 0;
  if (j.opened) {
    if (landedBad) { art.chute(ctx, x, y, m, e.look.chute + '_down', e.face, 0, 1); }
    else {
      const p = clamp((r.t - e.openT) / 0.45, 0, 1), inf = p < 1 ? 0.12 + 0.88 * easeOutBack(p) : 1;
      const swing = (-e.vx / C.driftFree) * 0.12 * (reduce ? 0 : 1);
      art.chute(ctx, x, y, m, e.look.chute, e.face, swing, inf);
    }
  }
  art.diver(ctx, x, y, c, e.look.suit, e.look.helmet, pose, e.face, tilt);
  const idx = isMe ? -1 : r.bots.indexOf(e);
  const label = isMe ? 'YOU' : e.name + ' ' + S.multiplierAt(j.opened ? j.openFallen : j.fallen).toFixed(1) + 'x';
  ctx.font = '700 11px -apple-system, sans-serif'; const tw = ctx.measureText(label).width + 12;
  const lx = clamp(x, tw / 2 + 4, W - tw / 2 - 4);
  const ly = y - cell * (j.opened ? 1.3 : 0.55) - (isMe ? 0 : (idx % 3) * 17);
  ctx.fillStyle = isMe ? '#E8461A' : 'rgba(0,0,0,.42)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx - tw / 2, ly - 9, tw, 17, 8) : ctx.rect(lx - tw / 2, ly - 9, tw, 17); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(label, lx, ly + 3);
}


// ---------------------------------------------------------------- off-screen arrows
function drawArrows(r) {
  const list = [r.me, ...r.bots].filter((e) => !e.j.landed);
  const padX = 24, padT = 118, padB = 118; const cx = W / 2, cy = H / 2; const used = [];
  ctx.font = '700 11px -apple-system, sans-serif'; ctx.textAlign = 'center';
  for (const e of list) {
    const sx = W / 2 + (e.x - G.camX) * pxx, sy = altSy(e.j.y);
    if (sx > -8 && sx < W + 8 && sy > -24 && sy < H + 24) continue;
    const isMe = e === r.me; let dx = sx - cx, dy = sy - cy; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const t = Math.min(dx ? (cx - padX) / Math.abs(dx) : 1e9, dy ? (dy < 0 ? cy - padT : H - padB - cy) / Math.abs(dy) : 1e9);
    const ax = cx + dx * t, ay = cy + dy * t, ang = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
    ctx.fillStyle = isMe ? '#E8461A' : '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-7, -8); ctx.lineTo(-3, 0); ctx.lineTo(-7, 8); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
    const label = (isMe ? 'YOU' : e.name) + '  ' + fmt(e.j.y) + ' m'; const tw = ctx.measureText(label).width + 12;
    let lx = clamp(ax - dx * (tw / 2 + 16), tw / 2 + 4, W - tw / 2 - 4), ly = clamp(ay - dy * 22, 100, H - 100);
    for (let k = 0; k < 8 && used.some((u) => Math.abs(u.x - lx) < (u.w + tw) / 2 && Math.abs(u.y - ly) < 19); k++) ly += (dy < 0 ? 1 : -1) * 20;
    used.push({ x: lx, y: ly, w: tw });
    ctx.fillStyle = isMe ? '#E8461A' : 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx - tw / 2, ly - 9, tw, 18, 9) : ctx.rect(lx - tw / 2, ly - 9, tw, 18); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(label, lx, ly + 4);
  }
}

// ---------------------------------------------------------------- ending: everyone on the ground in one wide shot
function startEnding() {
  const r = G.round; endMode = true; layout();
  G.state = 'ending'; G.timeScale = 1; G.slow = 0; G.watch = -1; G.parts = []; G.lines = []; G.trail = []; G.camAlt = 0; G.camX = 0; G.offA = 0;
  sfx.stopAll();
  const all = [r.me, ...r.bots]; all.sort((a, b) => a.x - b.x);
  r.endList = all.map((e) => ({ e, crashed: e === r.me ? !!e.crashed : !e.result.win, puffs: 0 }));
  r.endT = 0; if (r.endList.some((i) => i.crashed) && !reduce) G.shake = Math.max(G.shake, 10);
  setUI();
}
const EMO_FPS = { wave: 5, dance: 5, flex: 3, salute: 2, pump: 4, dab: 3, flip: 6, sit: 2 };
function emoXform(k, T, m) {
  if (k === 'dance') return { dy: -Math.abs(Math.sin(T * 7)) * 0.14 * m, rot: Math.sin(T * 7) * 0.07 };
  if (k === 'pump') return { dy: -Math.abs(Math.sin(T * 6)) * 0.18 * m, rot: 0 };
  if (k === 'flip') { const p = (T % 1.5) / 1.5; if (p < 0.5) { const q = p / 0.5; return { dy: -Math.sin(Math.PI * q) * 1.5 * m, rot: -q * Math.PI * 2, air: true }; } return { dy: 0, rot: 0 }; }
  return { dy: 0, rot: 0 };
}
function drawEnding(r) {
  const list = r.endList, n = list.length, T = r.endT, gy = anchorY;
  const sc0 = clamp((W / (n + 0.6)) / cell * 2.6, 0.75, 1.9), rowGap = Math.min(70, H * 0.075);
  for (const row of [0, 1]) list.forEach((it, i) => {
    if (i % 2 !== row) return;
    const e = it.e, x = W * (i + 1) / (n + 1), sc = sc0 * (row ? 1 : 0.94), m = mpp * sc, c = cell * sc, y0 = gy + 6 + row * rowGap;
    if (it.crashed) {
      ctx.fillStyle = 'rgba(40,26,16,.5)'; ctx.beginPath(); ctx.ellipse(x, y0 + 1, 1.0 * m, 0.24 * m, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#5a3d26'; ctx.beginPath(); ctx.ellipse(x, y0 + 2, 0.75 * m, 0.2 * m, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(x - 2 * m, y0 - 4 * m, 4 * m, 4 * m + 1); ctx.clip();
      art.diver(ctx, x, y0 - 0.95 * m + 0.75 * m, c, e.look.suit, e.look.helmet, 'crash', e.face || 1, 0); ctx.restore();
      ctx.fillStyle = '#5a3d26'; ctx.beginPath(); ctx.ellipse(x - 0.5 * m, y0 + 1, 0.3 * m, 0.1 * m, 0, 0, 7); ctx.ellipse(x + 0.55 * m, y0 + 1, 0.25 * m, 0.09 * m, 0, 0, 7); ctx.fill();
      // dust: a burst on impact, then a few drifting puffs
      const want = Math.min(5, Math.floor(T / 0.45) + 1); while (it.puffs < want) { dustAt(x, y0, it.puffs === 0 ? 30 : 12); it.puffs++; }
    } else {
      const k = (e.emo || 'emote_wave').slice(6), fps = EMO_FPS[k] || 4; let ph = Math.floor(T * fps + i) % 2 ? 'b' : 'a';
      const xf = emoXform(k, T + i * 0.37, m); if (k === 'flip' && xf.air) ph = 'b';
      let pose = `emo_${k}_${ph}`; if (!art.get(`diver_${e.look.suit}_${pose}`)) pose = 'land';
      art.diver(ctx, x, y0 - 0.98 * m + xf.dy, c, e.look.suit, e.look.helmet, pose, e.face || 1, xf.rot);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y0 + 1, 0.6 * m, 0.12 * m, 0, 0, 7); ctx.fill();
    }
    const label = e === r.me ? 'YOU' : e.name; ctx.font = '700 10.5px -apple-system, sans-serif'; ctx.textAlign = 'center';
    const tw = ctx.measureText(label).width + 10, ly = y0 - 2.3 * m - 8;
    ctx.fillStyle = e === r.me ? '#E8461A' : 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - tw / 2, ly - 8, tw, 16, 8) : ctx.rect(x - tw / 2, ly - 8, tw, 16); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(label, x, ly + 3.5);
  });
}

function drawPlane(r) {
  const im = art.get('plane_' + r.plane.replace('plane_', '')); if (!im) return;
  const px = W / 2 + (r.planeX + r.t * 24 - G.camX) * pxx, py = altSy(r.h + 0.5);
  const w = cell * 1.9; ctx.drawImage(im, px - w / 2, py - w / 4 - cell * 0.1, w, w / 2);
}

function speedLines(dt, v) {
  const s = clamp(v / C.terminalSpeed, 0, 1), L = G.lines;
  const want = reduce ? Math.round(s * s * 6) : Math.round(s * s * 30 + (s > 0.2 ? 6 : 0));
  while (L.length < want) L.push({ x: Math.random() * W, y: Math.random() * H, len: 0.5 + Math.random(), sp: 0.7 + Math.random() * 0.6, a: 0.15 + Math.random() * 0.25, dot: Math.random() < 0.45 });
  if (L.length > want) L.length = want;
  ctx.lineCap = 'round';
  for (const l of L) {
    l.y -= v * pxm * l.sp * dt * 1.15; if (l.y < -120) { l.y = H + Math.random() * 60; l.x = Math.random() * W; }
    ctx.strokeStyle = `rgba(255,255,255,${l.a * (0.4 + s)})`; ctx.lineWidth = l.dot ? 2 : 1.4;
    ctx.beginPath(); const len = l.dot ? 10 + s * 24 : 30 + s * s * 170 * l.len; ctx.moveTo(l.x, l.y); ctx.lineTo(l.x, l.y + len); ctx.stroke();
  }
}

function drawParts(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i]; p.life += dt; if (p.life >= p.max) { G.parts.splice(i, 1); continue; }
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    const a = 1 - p.life / p.max;
    if (p.k === 'coin') {
      const sx = Math.abs(Math.cos(p.life * 9 + p.spin));
      ctx.fillStyle = `rgba(255,205,60,${a})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * sx + 1, p.r, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(190,130,10,${a})`; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      ctx.fillStyle = `rgba(150,120,85,${a * 0.55})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + p.life * 1.8), 0, 7); ctx.fill();
    }
  }
  for (let i = G.trail.length - 1; i >= 0; i--) {
    const tp = G.trail[i]; tp.t += dt; if (tp.t >= tp.life) { G.trail.splice(i, 1); continue; }
    const im = art.get(tp.id); if (!im) continue;
    const a = 1 - tp.t / tp.life, s = (30 + tp.t * 40) * (cell / 140);
    ctx.globalAlpha = a * 0.9; ctx.drawImage(im, W / 2 + (tp.x - G.camX) * pxm - s / 2 - 6 * (G.round.me.face), altSy(tp.alt) - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

function followed() {
  const r = G.round; if (!r) return null;
  return G.watch >= 0 && r.bots[G.watch] ? r.bots[G.watch] : r.me;
}

function render(dt) {
  const r = G.round, bg = SKY();
  ctx.save();
  if (G.shake > 0.3 && !reduce) { ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake); }
  drawSky(bg);
  cloudsAndBirds(false);
  if (G.state === 'idle' || !r) {
    const im = art.get(store.equipped('plane')); const w = cell * 2.2; const px = W / 2 + Math.sin(G.t * 0.25) * W * 0.12, py = H * 0.3 + Math.sin(G.t * 0.8) * 6;
    if (im) ctx.drawImage(im, px - w / 2, py - w / 4, w, w / 2);
    cloudsAndBirds(true);
  } else if (r.endList) {
    drawGround(bg); drawEnding(r); drawParts(dt);
  } else {
    drawGround(bg);
    drawPlane(r);
    for (const b of r.bots) drawEntity(b, false, r);
    drawEntity(r.me, true, r);
    const f = followed(); const v = f.j.landed ? 0 : f.j.v;
    cloudsAndBirds(true);
    speedLines(dt, G.state === 'result' ? 0 : (f.j.opened ? f.j.v * 0.4 : v));
    drawParts(dt);
    drawArrows(r);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- per-frame update
function heat(m) {
  const stops = [[1, [255, 255, 255]], [3, [255, 226, 140]], [6, [255, 170, 80]], [12, [255, 106, 43]], [25, [232, 70, 26]]];
  for (let i = 1; i < stops.length; i++) if (m <= stops[i][0]) { const a = stops[i - 1], b = stops[i], t = (m - a[0]) / (b[0] - a[0]); return `rgb(${a[1].map((c, k) => Math.round(lerp(c, b[1][k], t))).join(',')})`; }
  return 'rgb(232,70,26)';
}

function frame(now) {
  const real = Math.min(0.1, (now - (G.last || now)) / 1000); G.last = now; G.t += real;
  const r = G.round;
  if (r && r.endList) { r.endT += real; if (G.state === 'ending' && r.endT >= C.endHold) showResults(); }
  if (r && G.state !== 'idle' && G.state !== 'result' && G.state !== 'ending') {
    // time scale: slow motion beat, fast forward after you land
    let ts = 1;
    if (G.slow > 0) { G.slow -= real; ts = G.slow > 0.15 ? C.slowmoScale : lerp(1, C.slowmoScale, clamp(G.slow / 0.15, 0, 1)); }
    else {
      const live = [r.me, ...r.bots.map((b) => b)].filter((e) => !e.j.landed);
      if (live.length && live.every((e) => e.j.opened && e.j.y > C.groundVisibleM + 22)) ts = C.chuteWarp;
    }
    if (ts === 1 && G.state === 'landed' && r.me.landed && r.bots.some((b) => !b.done) && r.t > (r.fastFrom ?? (r.fastFrom = r.t + 1.0))) ts = C.fastForward;
    G.timeScale = G.timeScale + (ts - G.timeScale) * Math.min(1, real * 8);
    ts = G.timeScale;
    G.acc += real * ts; let n = 0;
    while (G.acc >= 1 / 60 && n < 14) { simStep(1 / 60); G.acc -= 1 / 60; n++; if (G.state === 'result') break; }
    if (G.acc > 0.25) G.acc = 0;
  }
  // camera
  const f = followed();
  if (f) {
    const k = 1 - Math.exp(-real * 3.2);
    if (G.state === 'idle') { /* fixed */ }
    G.camX += (f.x - G.camX) * k;
    G.offA *= Math.exp(-real * 7);
    G.camAlt = f.j.y + G.offA;
    if (r && r.endList) { G.camAlt = 0; G.camX = 0; G.offA = 0; }
  } else { G.camAlt = 900; G.camX += real * 2; }
  G.ease = Math.max(0, G.ease - real / 0.7);
  G.shake *= Math.exp(-real * 6);
  // spectate auto-switch
  if (r && !r.endList) {
    if (G.watch >= 0 && r.bots[G.watch].done) switchWatch(highestBot(), false);
    else if (G.watch < 0 && r.me.j.landed && !r.autoGo && r.t > r.meLandT + 1.0) { r.autoGo = true; const hb = highestBot(); if (hb >= 0) switchWatch(hb, false); }
  }
  render(real);
  hud(real);
  requestAnimationFrame(frame);
}

let lastShownMult = '', lastBots = 0;
function hud(dt) {
  const r = G.round;
  // balance roll-up
  const target = store.balance;
  if (G.balShown !== target) {
    if (reduce) G.balShown = target;
    else { const d = target - G.balShown; G.balShown += Math.sign(d) * Math.max(1, Math.abs(d) * Math.min(1, dt * 3.2)); if (Math.abs(target - G.balShown) < 1) G.balShown = target; }
    $('balv').textContent = fmt(G.balShown);
  }
  if (!r || G.state === 'idle') return;
  const j = r.me.j;
  const m = S.multiplierAt(j.opened ? j.openFallen : j.fallen);
  const txt = m.toFixed(2) + 'x';
  if (txt !== lastShownMult) {
    lastShownMult = txt; const el = $('mult'); el.textContent = txt;
    el.style.color = heat(m); el.style.fontSize = Math.round((innerWidth >= 700 ? 80 : 64) * (1 + Math.min(0.5, (m - 1) * 0.03))) + 'px';
    const mi = Math.floor(m);
    if (!j.opened && mi > G.lastMultInt) { G.lastMultInt = mi; if (!reduce) el.animate([{ transform: 'scale(1.16)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }); }
  }
  // audio follows whoever you watch
  const f = followed(); const sp = f.j.landed ? 0 : f.j.v;
  sfx.setWind(G.state === 'result' ? 0 : sp / C.terminalSpeed);
  sfx.heart(dt, m, G.state === 'fall');
  // bot list ~5x a second
  G.hudT += dt;
  if (G.hudT > 0.18) {
    G.hudT = 0;
    $('botlist').innerHTML = r.bots.map((b) => {
      const mm = S.multiplierAt(b.j.opened ? b.j.openFallen : b.j.fallen).toFixed(2) + 'x';
      const cls = b.done ? (b.result.win ? 'd' : 'x') : (b.j.opened ? 'd' : '');
      const st = b.done ? (b.result.win ? mm : 'crash') : mm;
      return `<div class="${cls}"><span>${b.name}</span><span>${short(b.bet)}</span><span>${st}</span></div>`;
    }).join('');
    if (G.state === 'chute' || G.state === 'landed') {
      const wt = $('watch'); const wb = G.watch >= 0 ? r.bots[G.watch] : null;
      if (wb) wt.textContent = `Watching ${wb.name}`;
      else if (G.state === 'chute') wt.textContent = j.v > C.safeLanding + 0.2 ? `Braking, ${Math.round(j.v)} m/s` : 'Safe speed';
      else wt.textContent = '';
      wt.classList.toggle('hide', !wt.textContent);
    }
    updateButtons();
  }
}

// ---------------------------------------------------------------- spectate
function airList() { const r = G.round; if (!r) return []; const l = []; if (!r.me.j.landed) l.push(-1); r.bots.forEach((b, i) => { if (!b.done) l.push(i); }); return l; }
function highestBot() { const r = G.round; let best = -1, y = -1; if (!r) return -1; r.bots.forEach((b, i) => { if (!b.done && b.j.y > y) { y = b.j.y; best = i; } }); return best; }
function cycle(dir) { const l = airList(); if (l.length < 2) return; let k = l.indexOf(G.watch); if (k < 0) k = 0; switchWatch(l[(k + dir + l.length) % l.length]); sfx.click(); }
function inflight() { const r = G.round; return r ? r.bots.map((b, i) => (b.done ? -1 : i)).filter((i) => i >= 0) : []; }
function nextWatch(cur) { const l = inflight(); const nx = l.find((i) => i > cur); return nx === undefined ? -1 : nx; }
function switchWatch(idx, userAction = true) {
  const r = G.round; const old = followed(); G.watch = idx; const nw = followed();
  if (old && nw) G.offA = (old.j.y + G.offA) - nw.j.y;
  updateButtons();
}

// ---------------------------------------------------------------- UI
function openPanel(el) { el.classList.remove('hide'); el.classList.add('enter'); void el.offsetWidth; requestAnimationFrame(() => el.classList.remove('enter')); }
function closePanel(el, cb) { el.classList.add('enter'); const done = () => { el.classList.add('hide'); el.classList.remove('enter'); cb && cb(); }; reduce ? done() : setTimeout(done, 260); }

function setUI() {
  const st = G.state, r = G.round;
  const idle = st === 'idle', fall = st === 'fall', chute = st === 'chute', landed = st === 'landed', res = st === 'result';
  const endg = st === 'ending';
  $('mult').classList.toggle('hide', idle || endg);
  $('openbtn').classList.toggle('hide', !fall);
  $('driftpad').classList.toggle('hide', !(fall || chute));
  $('botlist').classList.toggle('hide', idle || endg);
  if (endg) $('watch').classList.add('hide');
  document.querySelector('.btns').classList.toggle('hide', !(idle || res));
  if (idle) { $('mult').classList.remove('locked'); $('watch').classList.add('hide'); $('botlist').innerHTML = ''; }
  if (fall) { $('watch').classList.add('hide'); }
  updateButtons();
  renderHistory(); renderTop();
}
function updateButtons() {
  const st = G.state, l = inflight();
  const al = airList(); const canWatch = (st === 'chute' || st === 'landed') && al.length >= 2;
  $('specbtn').classList.toggle('hide', !canWatch);
  if (canWatch) $('specbtn').textContent = 'Next player';
  $('skipbtn').classList.toggle('hide', !(st === 'landed' && l.length > 0));
  const dp = $('driftpad'); dp.classList.toggle('hide', !(st === 'fall' || ((st === 'chute' || st === 'landed') && al.length >= 2)));
  dp.firstElementChild.textContent = st === 'fall' ? 'Swipe or use arrow keys to drift' : 'Tap or arrow keys to switch player';
}
function renderTop() {
  const s = store.s.streak; $('streakchip').textContent = s >= 2 ? `Day ${s} streak` : '';
  $('balv').textContent = fmt(G.balShown);
}
function renderHistory() {
  const h = store.s.history; const el = $('hist');
  el.innerHTML = h.length ? h.map((x) => `<span class="chip ${x.win ? 'win' : 'crash'}" style="color:${heat(1 + x.h / 100 / 1.5)}">${fmt(x.h)}</span>`).join('') : '<span class="lbl">Your jumps will show here</span>';
}

// bet panel
function betVal() { return parseInt(($('bet').value || '').replace(/[^0-9]/g, ''), 10) || 0; }
function setBet(v) { $('bet').value = fmt(clamp(v, 0, 1e9)); checkBet(); }
function checkBet() {
  const v = betVal(), b = store.balance; const e = $('beterr'); let msg = '';
  if (b < C.minBet) msg = 'You are out of tokens.';
  else if (v < C.minBet) msg = `Minimum bet is ${C.minBet}.`; else if (v > b) msg = `You only have ${fmt(b)} tokens.`;
  e.textContent = msg; $('jump').style.opacity = msg ? 0.5 : 1; return !msg;
}
function buildChips() {
  const el = $('chips'); el.innerHTML = '';
  if (store.balance < C.minBet) {
    const b = document.createElement('button'); b.textContent = `Take ${fmt(C.rescueTokens)} tokens`; b.onclick = () => { store.add(C.rescueTokens); G.balShown = store.balance; setBet(Math.min(500, store.balance)); buildChips(); renderTop(); }; el.appendChild(b); return;
  }
  [['100', () => 100], ['500', () => 500], ['1,000', () => 1000], ['Half', () => Math.floor(store.balance / 2 / 10) * 10], ['Max', () => store.balance]].forEach(([l, f]) => {
    const b = document.createElement('button'); b.textContent = l; b.onclick = () => { sfx.click(); setBet(f()); }; el.appendChild(b);
  });
}
function stepBet(dir) { const v = betVal(); const st = Math.max(10, Math.round(v * 0.1 / 10) * 10); setBet(clamp(v + dir * st, 0, store.balance)); }
function showBet() {
  const s = store.s.settings.lastBet; setBet(Math.min(s || 500, Math.max(C.minBet, store.balance)));
  buildChips(); checkBet(); openPanel($('betp'));
}
function jump() {
  if (G.state !== 'idle' || !checkBet()) return;
  sfx.init(); if (sfx.ctx && sfx.ctx.state === 'suspended') sfx.ctx.resume();
  const bet = betVal(); store.setting('lastBet', bet);
  closePanel($('betp'));
  G.balShown = store.balance; lastShownMult = '';
  startRound(bet);
  $('mult').classList.remove('locked'); $('mult').style.color = '#fff';
  $('watch').classList.add('hide');
}
function nextRound() {
  endMode = false; layout();
  sfx.click();
  closePanel($('resp'), () => {
    G.state = 'idle'; G.round = null; G.watch = -1; G.parts = []; G.lines = []; G.trail = []; $('mult').classList.remove('locked');
    setUI(); showBet();
  });
}

// shop
let shopTab = 'chute';
function renderShop() {
  $('shopbal').textContent = fmt(store.balance) + ' tokens';
  const tabs = $('tabs'); tabs.innerHTML = '';
  for (const [cat, name] of CATEGORIES) { const b = document.createElement('button'); b.textContent = name; b.className = cat === shopTab ? 'on' : ''; b.onclick = () => { shopTab = cat; renderShop(); }; tabs.appendChild(b); }
  const grid = $('grid'); grid.innerHTML = '';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  for (const it of CATALOG[shopTab]) {
    const owned = store.owns(it.id), eq = store.equipped(shopTab) === it.id;
    const card = document.createElement('div'); card.className = 'card' + (eq ? ' eq' : '');
    const c = document.createElement('canvas'); c.className = 'im'; c.width = 300 * dpr; c.height = 240 * dpr; card.appendChild(c);
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = it.name; card.appendChild(nm);
    const b = document.createElement('button');
    if (eq) { b.textContent = 'Equipped'; b.className = 'eqb'; }
    else if (owned) { b.textContent = 'Equip'; b.onclick = () => { store.equip(shopTab, it.id); sfx.click(); renderShop(); }; }
    else {
      b.textContent = fmt(it.price) + ' tokens'; const can = store.balance >= it.price; b.className = can ? 'buy' : 'poor';
      b.onclick = () => {
        if (!can) { toast('Not enough tokens yet'); return; }
        const res = store.buy(shopTab, it.id);
        if (res === 'ok') { sfx.coin(2); toast(`Bought ${it.name}`, 'Undo', () => { store.undoBuy(); renderShop(); renderTop(); }); const a = store.checkAch(null); a.forEach((x) => toast(`Achievement: ${x.name}`)); G.balShown = store.balance; renderShop(); renderTop(); }
      };
    }
    card.appendChild(b); grid.appendChild(card);
    const sk = SKY(); const bgc = shopTab === 'bg' ? it.sky : null;
    art.preview(c, shopTab, it.id, bgc, { suit: store.equipped('suit'), helmet: store.equipped('helmet'), frame: 'a' });
    if (shopTab !== 'bg') c.style.background = shopTab === 'trail' ? '#26334f' : `linear-gradient(${sk.sky[0]},${sk.sky[1]})`;
  }
  $('grid').scrollTop = 0;
  if (shopTab === 'emote' && !art.get('diver_suit_classic_emo_wave_a') && (G.emoTry = (G.emoTry || 0) + 1) < 8) setTimeout(() => { if (shopTab === 'emote' && !$('shop').classList.contains('hide')) renderShop(); }, 500);
}
function openShop() { renderShop(); openPanel($('shop')); }

// records
function renderRecords() {
  const b = store.s.best, s = store.s;
  const kv = (a, v) => `<div class="kv"><span>${a}</span><b>${v}</b></div>`;
  const bests = kv('Best multiplier', b.mult ? b.mult.toFixed(2) + 'x' : 'none yet') + kv('Biggest payout', b.payout ? fmt(b.payout) : 'none yet') + kv('Longest win streak', b.winStreak) +
    kv('Lowest safe open', b.lowOpen === null ? 'none yet' : fmt(b.lowOpen) + ' m') + kv('Tallest jump landed', b.tallest ? fmt(b.tallest) + ' m' : 'none yet') +
    kv('Rounds played', fmt(b.rounds)) + kv('Wins / crashes', `${b.wins} / ${b.crashes}`) + kv('Days in a row', s.streak);
  const ach = ACH.map((a) => { const got = s.ach[a.id]; return `<div class="ach${got ? '' : ' lock'}"><div><b>${a.name}</b><span>${a.desc}</span></div>${got ? '<i>Done</i>' : ''}</div>`; }).join('');
  $('recbody').innerHTML = `<div class="sec">Personal bests</div><div class="panel">${bests}</div><div class="sec">Achievements, ${Object.keys(s.ach).length} of ${ACH.length}</div>${ach}`;
}

// daily claim
function showClaim() {
  const c = store.claim; if (!c) return;
  $('claimamt').textContent = '+' + fmt(c.bonus + c.extra);
  $('claimsub').textContent = c.streak >= 2 ? `Day ${c.streak} in a row. That is ${fmt(c.bonus)} plus ${fmt(c.extra)} for the streak.` : 'Welcome back. Come again tomorrow for a streak bonus.';
  openPanel($('claim'));
}

// ---------------------------------------------------------------- wiring
function wire() {
  $('betminus').onclick = () => { sfx.click(); stepBet(-1); }; $('betplus').onclick = () => { sfx.click(); stepBet(1); };
  $('bet').addEventListener('input', () => { const v = betVal(); $('bet').value = v ? fmt(v) : ''; checkBet(); });
  $('bet').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('bet').blur(); jump(); } e.stopPropagation(); });
  $('jump').onclick = jump; $('again').onclick = nextRound;
  $('openbtn').onclick = (e) => { e.stopPropagation(); doOpen(); };
  $('specbtn').onclick = () => cycle(1);
  $('skipbtn').onclick = () => { const r = G.round; if (!r) return; let n = 0; while (!r.bots.every((b) => b.done) && n++ < 6000) { for (const b of r.bots) if (!b.done) S.stepBot(b, 1 / 30); } r.bots.forEach((b) => { b.reported = true; }); };
  $('btnshop').onclick = () => { if (G.state === 'idle' || G.state === 'result') openShop(); };
  $('shopx').onclick = () => { closePanel($('shop')); renderTop(); const b = $('bet'); if (G.state === 'idle') { buildChips(); checkBet(); } };
  $('btnrec').onclick = () => { if (G.state === 'idle' || G.state === 'result') { renderRecords(); openPanel($('rec')); } }; $('recx').onclick = () => closePanel($('rec'));
  $('btnset').onclick = () => { applySettings(); openPanel($('set')); }; $('setx').onclick = () => closePanel($('set'));
  $('setreduce').onclick = () => { reduce = !reduce; store.setting('reduce', reduce); applySettings(); };
  $('setsound').onclick = () => { store.setting('sound', !store.s.settings.sound); applySettings(); sfx.init(); };
  document.querySelectorAll('#settheme button').forEach((b) => { b.onclick = () => { store.setting('theme', b.dataset.v); applySettings(); }; });
  $('claimbtn').onclick = () => {
    sfx.init(); const before = store.balance; const total = store.claimBonus(); G.balShown = before; sfx.coin(1); sfx.coin(3);
    closePanel($('claim')); renderTop(); store.checkAch(null).forEach((a) => toast(`Achievement: ${a.name}`));
  };
  // keyboard
  const keys = {};
  addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if ((G.state === 'chute' || G.state === 'landed') && ['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) { if (!e.repeat) cycle(e.key === 'ArrowLeft' || e.key === 'a' ? -1 : 1); return; }
    if (e.key === 'ArrowLeft' || e.key === 'a') { keys.l = 1; } else if (e.key === 'ArrowRight' || e.key === 'd') { keys.r = 1; }
    else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (G.state === 'fall') doOpen(); else if (G.state === 'idle' && document.activeElement === document.body && !$('betp').classList.contains('hide')) jump(); }
    else if (e.key === 'Enter' && G.state === 'result') nextRound();
    G.input.key = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
  });
  addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.l = 0; if (e.key === 'ArrowRight' || e.key === 'd') keys.r = 0;
    G.input.key = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
  });
  // touch / mouse on the canvas: tap opens, swipe drifts
  let down = null;
  cv.addEventListener('pointerdown', (e) => { down = { id: e.pointerId, x: e.clientX, t: performance.now(), moved: false }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!down || e.pointerId !== down.id) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 12) down.moved = true; if (down.moved && G.state === 'fall') G.input.touch = clamp(dx / 45, -1, 1); });
  const up = (e) => { if (!down || e.pointerId !== down.id) return; const dx = e.clientX - down.x; if (!down.moved && performance.now() - down.t < 450 && G.state === 'fall') doOpen(); else if (G.state === 'chute' || G.state === 'landed') cycle(down.moved && dx > 0 ? -1 : 1); G.input.touch = 0; down = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { G.input.key = 0; G.input.touch = 0; } });
  addEventListener('beforeunload', () => store.save());
}

// ---------------------------------------------------------------- boot
async function boot() {
  applySettings(); wire();
  const bar = document.querySelector('#loadbar i');
  try { await art.load((p) => { bar.style.width = Math.round(p * 100) + '%'; }); }
  catch (e) { G.error = String(e); console.error(e); }
  art.loadEmotes();
  G.ready = true; $('loading').classList.add('done'); setTimeout(() => $('loading').remove(), 400);
  renderTop(); renderHistory(); setUI();
  if (store.abandoned) toast(`Last round was left unfinished. You lost the ${fmt(store.abandoned)} bet.`);
  if (store.claim) { showClaim(); } 
  showBet();
  requestAnimationFrame(frame);
}
window.addEventListener('error', (e) => { window.__errs = (window.__errs || []).concat(e.message); });
window.addEventListener('unhandledrejection', (e) => { window.__errs = (window.__errs || []).concat(String(e.reason)); });
boot();
window.__ff.doOpen = doOpen; window.__ff.startRound = startRound; window.__ff.showResults = showResults;
