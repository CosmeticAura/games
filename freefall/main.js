// Freefall v5: page, round flow and drawing. Numbers live in config.js, maths in sim.js, saving in state.js.
import { CONFIG as C } from './config.js';
import * as S from './sim.js';
import { Store, nameOk, ACH } from './state.js';
import { CATALOG, CATEGORIES, find, POSES } from './catalog.js';
import { Sfx } from './audio.js';
import * as A from './art.js';
import * as TH from '../shared/themes.js';
import * as B from './bots.js';
import { ECON } from '../shared/wallet.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const params = new URLSearchParams(location.search);
const show = (el, on = true) => el.classList.toggle('hide', !on);

const store = new Store();
const sfx = new Sfx();
sfx.vol = store.g.volume; sfx.muted = store.g.muted;
// Reduce motion: the in-game switch wins, otherwise the system setting. Fades stay, shakes and big movement go.
const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
let RM = false;
function applyRM() { RM = store.g.reduce == null ? mq.matches : !!store.g.reduce; document.documentElement.classList.toggle('reduce', RM); }
applyRM();
// the look: every colour, the sky, weather, altimeter, number style and trim come from shared/themes.js
let LOOK = TH.resolve(store.shop.all()); TH.apply(LOOK); sfx.setPack(LOOK.sound);
function relook() { LOOK = TH.resolve(store.shop.all()); TH.apply(LOOK); sfx.setPack(LOOK.sound); skyGrad = null; dotPat = null; }

const G = {
  state: 'idle', round: null, t: 0, camAlt: 0, camX: 0, target: null, timeScale: 1,
  forceH: params.get('h') ? +params.get('h') : null,
  balShown: 0, coinAcc: 0, coinN: 0, dust: [], endT: 0, lbT: 0, pvT: 0, drift: 0, keys: 0,
  W: 390, H: 844, dpr: 1, news: [], phase: '', pT: 0, panFrom: 0, shake: null, shotY: 0.56,
};
window.__ff = { G, store, sfx, C, S, TH, relook };
window.__errs = [];
window.addEventListener('error', (e) => window.__errs.push(e.message));
window.addEventListener('unhandledrejection', (e) => window.__errs.push(String(e.reason)));

const cv = $('c'), ctx = cv.getContext('2d');
const ppm = () => G.H * C.viewPxPerM;
const pxX = () => ppm() * C.xStretch;
const sy = (alt) => G.H * 0.42 + (G.camAlt - alt) * ppm();
const sxOf = (x) => G.W / 2 + (x - G.camX) * pxX();
const unit = () => clamp(Math.min(G.W, G.H) * 0.045, 14, 26);

function resize() {
  const r = $('stage').getBoundingClientRect();
  G.W = Math.max(200, r.width); G.H = Math.max(300, r.height); G.dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(G.W * G.dpr); cv.height = Math.round(G.H * G.dpr);
}
new ResizeObserver(resize).observe($('stage'));

// ---------- small helpers ----------
function mk(w, h) {
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
  const g = c.getContext('2d'); g.scale(2, 2); return [c, g, w, h];
}
let toastTimer = 0;
function toast(msg, onclick) {
  const t = $('toast'); t.textContent = msg; show(t); t.style.pointerEvents = onclick ? 'auto' : 'none';
  t.onclick = onclick || null; clearTimeout(toastTimer); toastTimer = setTimeout(() => show(t, false), onclick ? 5000 : 2600);
}
const equippedCfg = () => {
  const e = store.s.equipped;
  return { face: store.s.avatar, suit: e.suit, helmet: e.helmet, chute: e.chute, trail: e.trail, emote: e.emote, plane: e.plane };
};
const lookOf = (cfg) => {
  const l = (cat, id) => (find(cat, id) || CATALOG[cat][0]).look;
  return { face: cfg.face, suit: l('suit', cfg.suit), helmet: l('helmet', cfg.helmet), chute: l('chute', cfg.chute), trail: l('trail', cfg.trail), pose: l('emote', cfg.emote).pose };
};

// ---------- sheets ----------
const SHEETS = ['betp', 'resp', 'claimp', 'startp', 'shop', 'recp', 'setp'];
function openSheet(id) { SHEETS.forEach((s) => show($(s), s === id)); }
function closeSheets() { SHEETS.forEach((s) => show($(s), false)); }

// ---------- carousels: momentum scroll, snap, centred item grows, arrows on laptop ----------
function carUpdate(el) {
  const c = el.getBoundingClientRect(); if (!c.width) return; const mid = c.left + c.width / 2;
  for (const k of el.children) { const r = k.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid) / (c.width * 0.5); k.style.setProperty('--s', (1 + 0.15 * Math.max(0, 1 - d * 1.7)).toFixed(3)); }
}
function carStep(el, dir) { const k = el.children[0]; if (!k) return; const w = k.getBoundingClientRect().width + 12; el.scrollBy({ left: dir * w, behavior: RM ? 'auto' : 'smooth' }); }
function carousel(el) {
  const wrap = document.createElement('div'); wrap.className = 'carwrap'; el.parentNode.insertBefore(wrap, el); wrap.appendChild(el);
  el.classList.add('car'); el.tabIndex = 0; let raf = 0;
  el.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; carUpdate(el); }); }, { passive: true });
  el.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); carStep(el, d); } });
  for (const [cls, d, lab] of [['l', -1, 'Scroll left'], ['r', 1, 'Scroll right']]) {
    const b = document.createElement('button'); b.className = 'cararrow ' + cls; b.setAttribute('aria-label', lab); b.tabIndex = -1;
    b.innerHTML = '<svg class="ic"><use href="#i-' + (d < 0 ? 'prev' : 'next') + '"/></svg>'; b.onclick = () => carStep(el, d); wrap.appendChild(b);
  }
}
function centerPick(id, i, instant) { const k = $(id).children[i]; if (k) k.scrollIntoView({ inline: 'center', block: 'nearest', behavior: instant || RM ? 'auto' : 'smooth' }); }

// ---------- start screen ----------
let pickFace = 0, pickSuit = C.starterSuits[0];
function buildStart(canCancel) {
  const faces = $('faces'), sl1 = faces.scrollLeft, sl2 = $('suits').scrollLeft; faces.textContent = '';
  for (let i = 0; i < C.avatarCount; i++) {
    const b = document.createElement('button'); b.className = 'pick' + (i === pickFace ? ' on' : ''); b.setAttribute('aria-label', 'Face ' + (i + 1));
    const [c, g] = mk(52, 52); A.drawFace(g, i, 26, 33, 13, 2); b.appendChild(c);
    b.onclick = () => { pickFace = i; buildStart(canCancel); centerPick('faces', i); }; faces.appendChild(b);
  }
  const suits = $('suits'); suits.textContent = '';
  for (const id of C.starterSuits) {
    const it = find('suit', id); const b = document.createElement('button'); b.className = 'pick' + (id === pickSuit ? ' on' : '');
    const [c, g, w, h] = mk(60, 80);
    A.drawPreview(g, w, h, { face: pickFace, suit: id, helmet: 'helmet_classic', chute: 'chute_classic', trail: 'none', emote: 'emote_wave', plane: 'plane_classic' }, 0, 'suit');
    b.appendChild(c); const s = document.createElement('span'); s.textContent = it.name; b.appendChild(s);
    b.onclick = () => { pickSuit = id; buildStart(canCancel); centerPick('suits', C.starterSuits.indexOf(id)); }; suits.appendChild(b);
  }
  faces.scrollLeft = sl1; suits.scrollLeft = sl2; carUpdate(faces); carUpdate(suits);
  show($('startcancel'), canCancel);
}
function openStart(canCancel) { $('uerr').textContent = ''; buildStart(canCancel); openSheet('startp'); show($('startp')); requestAnimationFrame(() => { centerPick('faces', pickFace, true); centerPick('suits', C.starterSuits.indexOf(pickSuit), true); carUpdate($('faces')); carUpdate($('suits')); }); }
$('playbtn').onclick = () => {
  const name = $('uname').value.trim();
  if (!nameOk(name)) { $('uerr').textContent = 'Use 3 to 16 letters, numbers or underscores.'; return; }
  const r = store.createProfile(name, pickFace, pickSuit);
  if (r === 'taken') { $('uerr').textContent = 'That name is already used on this device.'; return; }
  if (r !== 'ok') { $('uerr').textContent = 'That name will not work.'; return; }
  $('uname').value = ''; afterProfile(); toast('Welcome, ' + store.name + '. ' + fmt(store.welcome) + ' tokens to start.');
};
$('startcancel').onclick = () => { closeSheets(); toBet(); };

function afterProfile() { relook(); G.balShown = store.balance; G.round = null; refreshAll(); G.state = 'idle'; if (store.claim) openClaim(); else toBet(); }

// ---------- claim ----------
function openClaim() {
  const c = store.claim; $('claimamt').textContent = '+' + fmt(c.bonus + c.extra);
  $('claimsub').textContent = c.extra ? `Daily claim plus ${fmt(c.extra)} for a ${c.streak} day streak.` : 'Your daily claim is ready.';
  openSheet('claimp');
}
$('claimbtn').onclick = () => { store.claimBonus(); toBet(); };

// ---------- bet ticket ----------
function toBet() {
  G.state = 'idle'; G.phase = ''; show($('firsthint'), store.s.best.rounds === 0); G.target = null; hideRoundUi();
  $('tkno').textContent = 'No. ' + String(store.s.best.rounds + 1).padStart(4, '0');
  $('tkname').textContent = store.name + '  Level ' + store.level;
  const poor = store.balance < store.minBet;
  const ws = store.windState(); show($('rescue'), poor && ws.ok); show($('jump'), !poor);
  const ab = $('abandoned'); show(ab, store.abandoned > 0); if (store.abandoned > 0) { ab.textContent = `Last round was cut off. The ${fmt(store.abandoned)} bet is gone.`; }
  const bi = $('bet'); const v = parseInt(bi.value, 10);
  if (!(v >= store.minBet) || v > Math.min(store.balance, store.maxBet)) bi.value = String(Math.max(store.minBet, Math.min(100, store.balance)));
  $('beterr').textContent = poor && !ws.ok ? `Out of tokens. Second wind in ${Math.ceil(ws.waitMs / 60000)} min, or tomorrow's claim.` : '';
  const ch = $('chips'); ch.textContent = '';
  for (const n of [100, 500, 1000, 5000, 'All']) {
    const b = document.createElement('button'); b.textContent = n === 'All' ? 'All in' : fmt(n);
    b.onclick = () => { bi.value = String(n === 'All' ? Math.min(store.balance, store.maxBet) : Math.min(n, store.balance, store.maxBet)); $('beterr').textContent = ''; }; ch.appendChild(b);
  }
  openSheet('betp'); refreshAll();
}
$('betminus').onclick = () => { const b = $('bet'); b.value = String(Math.max(store.minBet, Math.floor((parseInt(b.value, 10) || store.minBet) / 2))); };
$('betplus').onclick = () => { const b = $('bet'); b.value = String(Math.min(store.balance, store.maxBet, (parseInt(b.value, 10) || store.minBet) * 2)); };
$('rescue').onclick = () => { const got = store.rescue(); if (got) toast('Second wind: ' + fmt(got) + ' tokens.'); toBet(); };
$('jump').onclick = () => {
  const raw = $('bet').value.replace(/[, ]/g, ''); const bet = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
  if (!(bet >= store.minBet) || bet > Math.min(store.balance, store.maxBet)) { $('beterr').textContent = `Bet between ${store.minBet} and ${fmt(Math.min(store.balance, store.maxBet))}.`; return; }
  startRound(bet);
};

// ---------- round ----------
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function randomLook(emote) {
  const pick = (cat) => CATALOG[cat][Math.floor(Math.random() * CATALOG[cat].length)].id;
  return lookOf({ face: Math.floor(Math.random() * C.avatarCount), suit: pick('suit'), helmet: pick('helmet'), chute: pick('chute'), trail: Math.random() < 0.35 ? pick('trail') : 'none', emote: emote || pick('emote') });
}
const BOTLOOK = {};
const botLook = (n) => BOTLOOK[n] || (BOTLOOK[n] = randomLook(B.emoteFor(n)));
function startRound(bet) {
  sfx.init();
  const h = G.forceH || S.randomHeight(Math.random, store.s.lastH);
  store.startRound(bet, h); if (store.ups.length) { const u = store.ups[store.ups.length - 1]; toast(`Level ${u.level}. ${fmt(u.reward)} tokens added.`); }
  const me = { name: store.name, me: true, bet, j: S.newJumper(h), look: lookOf(equippedCfg()), x: 0, lane: 0, amp: 0, f: 0, ph: 0, wasOpen: false, wasLanded: false, settled: false, out: null, kick: 0 };
  const nb = C.botsMin + Math.floor(Math.random() * (C.botsMax - C.botsMin + 1));
  const names = shuffle(C.botNames.slice()).filter((n) => n.toLowerCase() !== store.name.toLowerCase());
  const bots = [];
  for (let i = 0; i < nb; i++) {
    const b = B.makeBot(names[i], h); const side = i % 2 ? 1 : -1;
    Object.assign(b, { kick: 0, endLine: null, look: botLook(b.name), lane: side * (6 + Math.floor(i / 2) * 6), amp: 1.5 + Math.random() * 2, f: 0.5 + Math.random(), ph: Math.random() * 6, wasOpen: false, wasLanded: false, out: null });
    b.x = b.lane; bots.push(b);
  }
  G.round = { h, me, bots, players: [me, ...bots], t0: G.t };
  G.target = me; G.camAlt = h; G.camX = 0; G.dust = []; G.timeScale = 1; G.state = 'fall'; G.phase = '';
  closeSheets(); show($('chutecard'), false); show($('crashcard'), false);
  refreshAll(); lbRender(true);
}
function shake(a) { if (!RM) G.shake = { t0: performance.now(), a, dur: 0.45 }; }
// somebody near you opens or crashes: you flinch, and a bot may say one short line
function nearReact(src, ev) {
  for (const q of G.round.players) {
    if (q === src || q.j.landed) continue;
    const d = Math.abs(q.j.y - src.j.y); if (d > 260) continue;
    q.kick = (q.x >= src.x ? 1 : -1) * (1 - d / 260) * (ev === 'near_crash' ? 1 : 0.6);
    if (!q.me && d < 400) { const t = B.lineFor(q, ev, G.t); if (t) q.bubble = { text: t, t0: G.t }; }
  }
}
function falling(p) { return !p.j.opened && !p.j.landed; }
function highestFalling() { let best = null; for (const p of G.round.players) if (falling(p) && (!best || p.j.y > best.j.y)) best = p; return best; }
function retarget() { const b = highestFalling(); if (b) G.target = b; }
function cycle(dir) {
  const r = G.round; if (!r) return;
  const list = r.players.filter(falling).sort((a, b) => b.j.y - a.j.y); if (!list.length) return;
  const i = list.indexOf(G.target); G.target = list[(i + dir + list.length * 2) % list.length];
}
const meDone = () => G.round && (G.round.me.j.opened || G.round.me.j.landed);

function doOpen() {
  const r = G.round; if (!r || G.state !== 'fall') return false;
  const me = r.me; if (!S.open(me.j)) return false;
  onOpen(me); return true;
}
function onOpen(p) {
  const r = G.round; p.wasOpen = true; p.openT = G.t; sfx.snap(p.me ? 1 : 0.3); nearReact(p, 'near_open');
  const j = p.j; p.mult = S.multiplierAt(j.openFallen); p.spare = j.openAlt - S.minSafeAlt(j.openV);
  if (p.me) {
    const c = $('chutecard'); c.classList.toggle('bad', !j.openSafe); c.textContent = '';
    if (j.openSafe) { const b = document.createElement('b'); b.textContent = `Safe, ${fmt(p.spare)} m to spare.`; c.append(b, ` +${fmt(Math.round(p.bet * p.mult))} on landing`); }
    else { const b = document.createElement('b'); b.textContent = 'Too low.'; c.append(b, ' The chute will not hold you.'); }
    show(c);
  }
  if (G.target === p || p.me) retarget();
}
function onLand(p) {
  p.wasLanded = true; const j = p.j; p.crashed = !(j.opened && j.landSpeed < C.safeLanding);
  if (p.crashed) { G.flashT = performance.now(); sfx.crash(p.me ? 1 : 0.45); if (p.me) shake(9); nearReact(p, 'near_crash'); } else sfx.thud(p.me ? 1 : 0.4);
  if (p.me) { settleMe(); show($('chutecard'), false); }
  if (G.target === p) retarget();
}
function settleMe() {
  const me = G.round.me; if (me.settled) return; me.settled = true;
  const o = S.outcome(me.fin || me.j, me.bet); me.out = o; if (o.win && o.mult >= 10) shake(4);
  G.news = store.finishRound({ payout: o.payout, win: o.win, mult: o.mult, h: G.round.h, opened: me.j.opened, openAlt: me.j.openAlt, bet: me.bet });
  histRender(); lvlRender();
  if (!o.win) {
    $('crashsub').textContent = `Jump from ${fmt(G.round.h)} m. Bet lost: ${fmt(me.bet)}.`;
    show($('crashcard'));
  }
}

function simStep(dt) {
  const r = G.round, me = r.me; G.t += dt;
  me.x = clamp(me.x + G.drift * C.driftFree * dt * (me.j.opened ? C.driftChute / C.driftFree : 1), -15, 15);
  if (!me.j.landed) S.step(me.j, dt);
  for (const b of r.bots) { B.stepBot(b, dt, { players: r.players }); b.x = b.lane + Math.sin(G.t * b.f + b.ph) * b.amp; }
  for (const p of r.players) {
    p.kick *= Math.exp(-dt * 4.5);
    if (p.j.opened && !p.wasOpen) onOpen(p);
    if (p.j.landed && !p.wasLanded) onLand(p);
  }
  if (G.state === 'fall' && !r.players.some(falling)) beginEnding();
}

// Round end, in order: a slow motion beat, the camera swoops down to the ground, a short cross fade to the
// wide ground shot, a hold, then the results slide in over the shot. Results are settled at the first step.
function beginEnding() {
  const r = G.round; G.state = 'ending'; G.phase = 'beat'; G.pT = 0; G.timeScale = RM ? 1 : 0.25;
  for (const p of r.players) {
    p.fin = S.finish({ ...p.j }); p.wasLanded = true; p.crashed = !(p.fin.opened && p.fin.landSpeed < C.safeLanding);
    p.out = S.outcome(p.fin, p.bet);
    if (!p.me) {
      p.mult = p.fin.opened ? S.multiplierAt(p.fin.openFallen) : 0; p.result = p.out; B.settleBot(p);
      p.lastSay = -99; p.endLine = B.lineFor(p, p.crashed ? 'crashed' : 'landed', G.t);
    }
  }
  settleMe(); r.me.mult = r.me.out.mult;
  sfx.wind(0); lbRender(true);
}
function finishNow() {
  const r = G.round; G.phase = 'fade'; G.pT = 0; G.dust = [];
  r.players.forEach((p, i) => {
    if (!p.j.landed) { S.finish(p.j); if (p.crashed) sfx.crash(p.me ? 1 : 0.45); else sfx.thud(p.me ? 1 : 0.4); }
    if (p.crashed) for (let k = 0; k < 16; k++) G.dust.push({ i, a: Math.random() * Math.PI, s: 0.4 + Math.random(), r: 3 + Math.random() * 6, t0: G.t });
  });
  if (r.players.some((p) => !p.crashed)) sfx.cheer();
  G.camAlt = 0; G.timeScale = 1; hideRoundUi(); show($('crashcard'), false); show($('chutecard'), false);
}
function endStep(dt) {
  const r = G.round; G.pT += dt;
  const slow = G.phase === 'beat' || G.phase === 'pan';
  if (slow) {
    let left = dt * G.timeScale; while (left > 1e-6) { const d = Math.min(left, 1 / 120); simStep(d); left -= d; }
    G.camX += ((G.target ? G.target.x : 0) - G.camX) * (1 - Math.exp(-dt * 6));
  } else G.t += dt;
  if (G.phase === 'beat') {
    const tj = (G.target || r.me).j; G.camAlt += (tj.y - G.camAlt) * (1 - Math.exp(-dt * 8));
    if (G.pT >= (RM ? 0.3 : 0.9)) { G.phase = 'pan'; G.pT = 0; G.panFrom = G.camAlt; hideRoundUi(); show($('crashcard'), false); show($('chutecard'), false); }
  } else if (G.phase === 'pan') {
    const k = Math.min(1, G.pT / (RM ? 0.01 : 1.1)), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    G.camAlt = G.panFrom * (1 - e); G.timeScale = 0.25 + 0.5 * e;
    if (k >= 1) finishNow();
  } else if (G.phase === 'fade') {
    if (G.pT >= (RM ? 0.01 : 0.4)) { G.phase = 'hold'; G.pT = 0; }
  } else if (G.phase === 'hold' && G.pT >= C.endHold) showResults();
}
let rollRaf = 0;
function rollTo(el, to, prefix = '', ms = 700, delay = 250) {
  cancelAnimationFrame(rollRaf);
  if (RM || !to) { el.textContent = prefix + fmt(to); return; }
  el.textContent = prefix + '0'; const t0 = performance.now() + delay;
  const f = (now) => { const k = clamp((now - t0) / ms, 0, 1), e = 1 - Math.pow(1 - k, 3); el.textContent = prefix + fmt(to * e); if (k < 1) rollRaf = requestAnimationFrame(f); };
  rollRaf = requestAnimationFrame(f);
}
function nextGoal() {
  let best = null;
  for (const [cat] of CATEGORIES) for (const it of store.shop.catalog[cat] || []) if (it.price > 0 && !store.owns(it.id) && (!best || it.price < best.price)) best = it;
  const lv = `Level ${store.level}.`;
  if (!best) return lv;
  const need = best.price - store.balance;
  return need <= 0 ? `${lv} You can afford ${best.name} (${fmt(best.price)} tokens).` : `${lv} Next goal: ${best.name}, ${fmt(best.price)} tokens, ${fmt(need)} to go.`;
}
function lvlRender() {
  if (!store.s) return; const L = store.level, w = store.wallet.w, lo = L > 1 ? ECON.levelXp(L) : 0, hi = ECON.levelXp(L + 1);
  $('lvl').textContent = 'Lv ' + L; $('lvlbar').firstElementChild.style.width = clamp((w.xp - lo) / (hi - lo), 0, 1) * 100 + '%';
}

function showResults() {
  const r = G.round, me = r.me, o = me.out; G.state = 'result';
  $('restitle').textContent = o.win ? 'Landed' : 'Crashed';
  $('ressub').textContent = o.win ? `Opened after ${fmt(me.j.openFallen)} m of ${fmt(r.h)}. Multiplier x${o.mult.toFixed(2)}.` : `Jump from ${fmt(r.h)} m. The bet is gone.`;
  const big = $('resbig'); big.className = 'mono ' + (o.win ? 'win' : 'lose'); rollTo(big, o.win ? o.payout : me.bet, o.win ? '+' : '-');
  const t = $('restbl'); t.textContent = '';
  const rows = r.players.slice().sort((a, b) => (b.out.net) - (a.out.net));
  for (const p of rows) {
    const d = document.createElement('div'); d.className = 'r ' + (p.out.win ? 'w' : 'l') + (p.me ? ' me' : ''); d.style.animationDelay = (240 + rows.indexOf(p) * 55) + 'ms';
    const n = document.createElement('span'); n.textContent = p.name; const bt = document.createElement('span'); bt.textContent = fmt(p.bet);
    const s = document.createElement('b'); s.textContent = p.out.win ? `x${p.out.mult.toFixed(2)}  +${fmt(p.out.payout)}` : 'Crashed'; d.append(n, bt, s); t.appendChild(d);
  }
  $('nextgoal').textContent = nextGoal(); G.phase = '';
  openSheet('resp');
  for (const a of G.news || []) toast('Unlocked: ' + a.name);
  G.news = [];
}
$('again').onclick = () => { if (store.shop.clearPreviews()) relook(); if (store.balance < store.minBet) store.rescue(); toBet(); };
$('crashx').onclick = () => show($('crashcard'), false);

// ---------- input ----------
let down = null;
$('stage').addEventListener('pointerdown', (e) => {
  sfx.init(); if (e.target.closest('button')) return;
  down = { x: e.clientX, y: e.clientY, moved: false };
});
window.addEventListener('pointermove', (e) => {
  if (!down) return; const dx = e.clientX - down.x;
  if (Math.abs(dx) > 12) down.moved = true;
  if (down.moved && G.state === 'fall' && !meDone()) G.drift = clamp(dx / 70, -1, 1);
});
window.addEventListener('pointerup', () => {
  if (!down) return; const d = down; down = null; G.drift = G.keys;
  if (!d.moved && G.state === 'fall') { if (!meDone()) doOpen(); else cycle(1); }
});
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Enter' && e.target.id === 'bet') $('jump').click(); if (e.key === 'Enter' && e.target.id === 'uname') $('playbtn').click(); return; }
  if (G.state === 'fall') {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!meDone()) doOpen(); }
    const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (d) { e.preventDefault(); if (meDone()) cycle(d); else { G.keys = d; G.drift = d; } }
  } else if (G.state === 'idle' && e.key === 'Enter' && !$('betp').classList.contains('hide')) $('jump').click();
});
window.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { G.keys = 0; G.drift = 0; } });
$('openbtn').onclick = () => doOpen();
$('specprev').onclick = () => cycle(-1);
$('specnext').onclick = () => cycle(1);
$('skipbtn').onclick = () => { G.timeScale = C.skipSpeed; };
document.addEventListener('click', (e) => { if (e.target.closest('button')) sfx.click(); }, true);

function hideRoundUi() { ['bigwrap', 'watch', 'openbtn', 'driftpad', 'specprev', 'specnext', 'skipbtn'].forEach((i) => show($(i), false)); }
function roundUi() {
  const r = G.round; if (!r || G.state !== 'fall') return;
  const done = meDone();
  show($('bigwrap')); show($('openbtn'), !done); show($('driftpad'), !done);
  show($('specprev'), done); show($('specnext'), done); show($('skipbtn'), done && G.timeScale === 1);
  const w = $('watch'); show(w, done && !!G.target);
  if (G.target && !G.target.me) w.textContent = 'Watching ' + G.target.name; else if (G.target) w.textContent = '';
}

// ---------- shop and locker ----------
let shopCat = 'suit', lockerMode = false, shopTimer = 0;
const GROUPS = [['gear', 'Diver gear'], ['look', 'Interface']];
let shopGroup = 'gear';
const tabsFor = (grp) => (grp === 'gear' ? CATEGORIES : TH.CATS.map((c) => [c, (store.siteLabels || {})[c] || c]).filter(([c]) => store.shop.catalog[c]));
function openShop(locker) {
  lockerMode = !!locker; $('shoptitle').textContent = locker ? 'Locker' : 'Shop';
  if (!tabsFor(shopGroup).some((c) => c[0] === shopCat)) shopCat = tabsFor(shopGroup)[0][0];
  shopRender(); openSheet('shop'); show($('panel'), true); requestAnimationFrame(() => carUpdate($('grid'))); clearInterval(shopTimer); shopTimer = setInterval(shopAnimate, 90);
}
function closeShop() { clearInterval(shopTimer); closeSheets(); refreshAll(); if (G.state === 'idle') toBet(); }
let shopCanvases = [];
function shopRender() {
  $('shopbal').textContent = fmt(store.balance) + ' tokens';
  const gr = $('groups'); gr.textContent = '';
  for (const [id, label] of GROUPS) { const b = document.createElement('button'); b.textContent = label; if (id === shopGroup) b.className = 'on'; b.onclick = () => { shopGroup = id; shopCat = tabsFor(id)[0][0]; shopRender(); }; gr.appendChild(b); }
  const tabs = $('tabs'); tabs.textContent = '';
  for (const [id, label] of tabsFor(shopGroup)) { const b = document.createElement('button'); b.textContent = label; if (id === shopCat) b.className = 'on'; b.onclick = () => { shopCat = id; shopRender(); }; tabs.appendChild(b); }
  const grid = $('grid'), gkey = shopGroup + shopCat + lockerMode, gsl = grid.dataset.key === gkey ? grid.scrollLeft : 0; grid.textContent = ''; shopCanvases = [];
  const items = (store.shop.catalog[shopCat] || []).filter((it) => !lockerMode || store.owns(it.id));
  if (!items.length) { const d = document.createElement('div'); d.className = 'empty'; d.textContent = 'Nothing owned here yet.'; grid.appendChild(d); }
  for (const it of items) {
    const owned = store.owns(it.id), eq = store.equipped(shopCat) === it.id;
    const d = document.createElement('div'); d.className = 'item' + (eq ? ' eq' : '');
    const [c, g, w, h] = mk(150, 150); d.appendChild(c); shopCanvases.push({ g, w, h, it });
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = it.name;
    const pr = document.createElement('div'); pr.className = 'pr'; pr.textContent = owned ? (eq ? 'Equipped' : 'Owned') : it.price ? fmt(it.price) + ' tokens' : 'Free';
    const b = document.createElement('button');
    if (eq) { b.textContent = 'Equipped'; b.disabled = true; }
    else if (owned) { b.textContent = 'Equip'; b.onclick = () => { store.equip(shopCat, it.id); relook(); shopRender(); pvDraw(true); }; }
    else {
      const need = store.shop.need(it);
      b.textContent = need ? `${fmt(need)} more needed` : 'Buy'; b.className = 'buy'; b.disabled = need > 0; b.onclick = () => buyItem(it);
    }
    d.append(nm, pr, b);
    if (!owned) {
      const pv = document.createElement('button'); pv.className = 'prev'; pv.textContent = 'Preview for one round';
      pv.onclick = () => { store.shop.preview(shopCat, it.id); relook(); closeShop(); toast(`Previewing ${it.name} for one round.`); };
      d.appendChild(pv);
    }
    grid.appendChild(d);
  }
  grid.dataset.key = gkey; grid.scrollLeft = gsl; carUpdate(grid);
  shopAnimate(true);
}
function buyItem(it) {
  const r = store.buy(shopCat, it.id); if (r !== 'ok') { toast(r === 'poor' ? 'Not enough tokens.' : 'Already owned.'); return; }
  relook(); G.balShown = store.balance; refreshAll(); shopRender();
  toast(`Bought ${it.name}. Tap to undo.`, () => { if (store.undoBuy()) { relook(); G.balShown = store.balance; shopRender(); refreshAll(); show($('toast'), false); } });
}
function shopAnimate(first) {
  if (first !== true && shopCat !== 'emote') return;
  if (shopGroup === 'look') { for (const s of shopCanvases) { s.g.clearRect(0, 0, s.w, s.h); TH.swatch(s.g, s.w, s.h, TH.resolve({ ...store.shop.all(), [shopCat]: s.it.id })); } return; }
  const t = performance.now() / 1000, base = equippedCfg();
  const mode = { suit: 'suit', helmet: 'helmet', chute: 'chute', trail: 'trail', emote: 'emote', plane: 'plane' }[shopCat];
  for (const s of shopCanvases) A.drawPreview(s.g, s.w, s.h, { ...base, [shopCat]: s.it.id }, shopCat === 'emote' ? t : 0.6, mode);
}
$('btnshop').onclick = () => openShop(false);
$('btnlocker').onclick = () => { if (G.state === 'fall') return; panelOpen(false); openShop(true); };
$('shopx').onclick = closeShop;

// ---------- records ----------
function openRecords() {
  const b = store.s.best, body = $('recbody'); body.textContent = '';
  if (!b.rounds) { const d = document.createElement('div'); d.className = 'empty'; d.textContent = 'No rounds yet.'; body.appendChild(d); }
  else {
    const g = document.createElement('div'); g.className = 'stats';
    const rows = [['Rounds', fmt(b.rounds)], ['Landings', fmt(b.wins)], ['Crashes', fmt(b.crashes)], ['Best multiplier', 'x' + b.mult.toFixed(2)], ['Best payout', fmt(b.payout)], ['Longest streak', fmt(b.winStreak)], ['Tallest jump landed', fmt(b.tallest) + ' m'], ['Lowest open', b.lowOpen == null ? 'None' : fmt(b.lowOpen) + ' m']];
    for (const [k, v] of rows) { const s = document.createElement('div'); s.className = 'stat'; const l = document.createElement('span'); l.className = 'lbl'; l.textContent = k; const bb = document.createElement('b'); bb.textContent = v; s.append(l, bb); g.appendChild(s); }
    body.appendChild(g);
  }
  const h = document.createElement('h3'); h.className = 'lbl'; h.textContent = 'Badges'; body.appendChild(h);
  for (const a of ACH) { const d = document.createElement('div'); d.className = 'ach' + (store.s.ach[a.id] ? ' got' : ''); const n = document.createElement('span'); n.textContent = a.name + ': ' + a.desc; const st = document.createElement('b'); st.textContent = store.s.ach[a.id] ? 'Earned' : 'Locked'; d.append(n, st); body.appendChild(d); }
  openSheet('recp');
}
$('btnrec').onclick = openRecords;
$('recx').onclick = () => { closeSheets(); if (G.state === 'idle') toBet(); };

// ---------- settings ----------
function openSettings() {
  $('rname').value = store.name; $('rerr').textContent = ''; $('vol').value = Math.round(store.g.volume * 100); $('mutebtn').textContent = store.g.muted ? 'Unmute' : 'Mute';
  const pl = $('plist'); pl.textContent = '';
  for (const p of store.list()) {
    const d = document.createElement('div'); d.className = 'prow' + (p.id === store.s.id ? ' on' : '');
    const n = document.createElement('span'); n.textContent = `${p.name}  ${fmt(p.balance)}`;
    d.appendChild(n);
    if (p.id !== store.s.id) { const b = document.createElement('button'); b.className = 'pill small'; b.textContent = 'Play as'; b.onclick = () => { store.switchTo(p.id); afterProfile(); }; d.appendChild(b); }
    else { const s = document.createElement('span'); s.className = 'lbl'; s.textContent = 'Current'; d.appendChild(s); }
    pl.appendChild(d);
  }
  const sel = $('themesel'); sel.textContent = '';
  for (const it of store.shop.catalog.theme || []) if (store.owns(it.id)) { const o = document.createElement('option'); o.value = it.id; o.textContent = it.name; o.selected = store.equipped('theme') === it.id; sel.appendChild(o); }
  $('rmbtn').textContent = RM ? 'Reduce motion: on' : 'Reduce motion: off';
  openSheet('setp');
}
$('rmbtn').onclick = () => { store.setGlobal('reduce', !RM); applyRM(); $('rmbtn').textContent = RM ? 'Reduce motion: on' : 'Reduce motion: off'; };
$('themesel').onchange = (e) => { store.equip('theme', e.target.value); relook(); };
$('btnset').onclick = () => { if (G.state === 'fall') return; openSettings(); };
$('setx').onclick = () => { closeSheets(); if (G.state === 'idle') toBet(); };
$('rnamebtn').onclick = () => {
  const r = store.rename($('rname').value);
  $('rerr').textContent = r === 'ok' ? 'Saved.' : r === 'taken' ? 'That name is already used on this device.' : 'Use 3 to 16 letters, numbers or underscores.';
  if (r === 'ok') refreshAll();
};
$('vol').oninput = (e) => { const v = +e.target.value / 100; sfx.setVolume(v); store.setGlobal('volume', v); };
$('mutebtn').onclick = () => { const m = !store.g.muted; sfx.setMuted(m); store.setGlobal('muted', m); $('mutebtn').textContent = m ? 'Unmute' : 'Mute'; };
$('newplayer').onclick = () => { openStart(true); };

// ---------- side panel ----------
function panelOpen(on) { $('panel').classList.toggle('open', on); }
$('paneltab').onclick = () => panelOpen(!$('panel').classList.contains('open'));
let lbSig = '';
function lbRender(force) {
  const r = G.round, box = $('lb');
  if (!r) { if (lbSig !== 'none') { lbSig = 'none'; box.textContent = ''; const d = document.createElement('div'); d.className = 'empty'; d.textContent = 'No round yet.'; box.appendChild(d); } return; }
  const rows = r.players.map((p) => {
    const j = p.j; let status, cls, key;
    if (G.state === 'fall' || G.state === 'ending' || G.state === 'result') {
      if (p.wasLanded && p.crashed) { status = 'Crashed'; cls = 'l'; key = -1; }
      else if (j.opened) { status = 'x' + S.multiplierAt(j.openFallen).toFixed(2); cls = 'w'; key = S.multiplierAt(j.openFallen); }
      else { const m = S.multiplierAt(j.fallen); status = 'x' + m.toFixed(2); cls = ''; key = m; }
    }
    return { p, status, cls, key };
  }).sort((a, b) => b.key - a.key);
  const sig = rows.map((x) => x.p.name + x.status).join('|');
  if (!force && sig === lbSig) return; lbSig = sig;
  box.textContent = '';
  for (const x of rows) {
    const d = document.createElement('div'); d.className = 'r ' + x.cls + (x.p.me ? ' me' : '');
    const n = document.createElement('span'); n.textContent = x.p.name; const b = document.createElement('span'); b.textContent = fmt(x.p.bet);
    const s = document.createElement('b'); s.textContent = x.status; d.append(n, b, s); box.appendChild(d);
  }
}
const [pvC, pvG] = [$('pv'), $('pv').getContext('2d')];
pvC.width = 480; pvC.height = 500;
function pvDraw(force) {
  if (!store.s) return; const t = performance.now() / 1000;
  if (!force && t - G.pvT < 0.05) return; G.pvT = t;
  pvG.setTransform(2, 0, 0, 2, 0, 0); A.drawPreview(pvG, 240, 250, equippedCfg(), t, 'diver');
  $('pvname').textContent = store.name;
}

// ---------- hud text ----------
function histRender() {
  const h = $('hist'); h.textContent = '';
  const hist = store.s.history;
  if (!hist.length) { const e = document.createElement('em'); e.textContent = 'No rounds yet.'; h.appendChild(e); return; }
  for (const x of hist.slice(0, 8)) { const s = document.createElement('span'); s.className = x.win ? 'w' : 'l'; s.textContent = x.win ? `${fmt(x.h)} m x${x.mult.toFixed(2)}` : `${fmt(x.h)} m`; h.appendChild(s); }
}
function refreshAll() {
  if (!store.s) return;
  $('streakchip').textContent = store.s.streak > 1 ? `Day ${store.s.streak}` : '';
  histRender(); pvDraw(true); lbSig = ''; lbRender(true);
  $('balv').textContent = fmt(G.balShown); lvlRender();
}

// ---------- drawing ----------
let skyGrad = null, skyH = 0;
let dotPat = null;
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function drawSky(T) {
  const W = G.W, H = G.H;
  if (!skyGrad || skyH !== H) { skyGrad = ctx.createLinearGradient(0, 0, 0, H); skyGrad.addColorStop(0, LOOK.sky[0]); skyGrad.addColorStop(0.6, LOOK.sky[1]); skyGrad.addColorStop(1, LOOK.sky[2]); skyH = H; }
  ctx.fillStyle = skyGrad; ctx.fillRect(-14, -14, W + 28, H + 28);
  if (LOOK.dots) {
    if (!dotPat) { const [c, g] = mk(8, 8); g.fillStyle = 'rgba(244,208,63,0.18)'; g.beginPath(); g.arc(4, 4, 1.4, 0, 7); g.fill(); dotPat = ctx.createPattern(c, 'repeat'); }
    ctx.fillStyle = dotPat; ctx.fillRect(0, H * 0.3, W, H * 0.7);
  }
  const br = Math.min(W, H) * 0.06;
  if (LOOK.body === 'moon') A.moon(ctx, W * 0.78, H * 0.17, br);
  else if (LOOK.body === 'sun') { ctx.fillStyle = '#ffe9a8'; ctx.strokeStyle = A.PAL.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W * 0.78, H * 0.17, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  const cl = A.cloudSprites(); const p = ppm();
  ctx.save(); ctx.globalAlpha = 0.75;
  for (let k = 0; k < 10; k++) {
    const y = H * 0.42 + (G.camAlt - (150 + k * 330)) * p * 0.6;
    if (y < -140 || y > H + 20) continue;
    const x = ((k * 197 + T * (3 + (k % 3) * 2)) % (W + 360)) - 180;
    const s = 0.8 + (k % 3) * 0.25; ctx.drawImage(cl[k % cl.length], x, y, 360 * s, 130 * s);
  }
  ctx.restore();
  const kind = LOOK.weather;
  if (kind === 'rain') {
    ctx.strokeStyle = hexA(LOOK.c.cream, 0.2); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 55; i++) {
      const x0 = (i * 131.7) % W; const y = ((i * 97.3 + G.camAlt * p * 1.6 + T * 380 * (0.7 + (i % 5) * 0.1)) % (H + 40) + H + 40) % (H + 40) - 20;
      ctx.moveTo(x0, y); ctx.lineTo(x0 - 3, y + 15);
    }
    ctx.stroke();
  } else if (kind === 'snow' || kind === 'ash' || kind === 'fireflies') {
    const n = 45, sp = kind === 'snow' ? 40 : kind === 'ash' ? 25 : 0;
    for (let i = 0; i < n; i++) {
      const wob = Math.sin(T * 0.8 + i) * (kind === 'fireflies' ? 14 : 8), x = (i * 131.7) % W + wob;
      const y = ((((i * 97.3 + G.camAlt * p * 0.4 + T * sp * (0.6 + (i % 5) * 0.15)) % (H + 20)) + H + 20) % (H + 20)) - 10;
      if (kind === 'fireflies') {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(T * 1.3 + i)), yy = y + Math.sin(T * 0.6 + i) * 10;
        ctx.fillStyle = `rgba(242,226,122,${a})`; ctx.beginPath(); ctx.arc(x, yy, 2.6, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = kind === 'snow' ? 'rgba(255,255,255,0.8)' : 'rgba(176,160,144,0.6)';
        ctx.beginPath(); ctx.arc(x, y, (kind === 'snow' ? 1.6 : 1.4) + (i % 3) * 0.5, 0, 7); ctx.fill();
      }
    }
  }
  if (LOOK.flash && G.flashT) {
    const k = (performance.now() - G.flashT) / 1000;
    const a = k < 0.08 ? 0.5 : k < 0.16 ? 0.05 : k < 0.5 ? 0.35 * (1 - (k - 0.16) / 0.34) : 0;
    if (a > 0) { ctx.fillStyle = `rgba(220,235,255,${a})`; ctx.fillRect(0, 0, W, H); }
  }
}
function drawStreaks(T) {
  const tj = (G.target || G.round.me).j; if (tj.landed) return;
  const s = clamp((tj.v - 40) / (C.terminalSpeed - 40), 0, 1); if (s < 0.02) return;
  const W = G.W, H = G.H, n = RM ? 6 : 16 + Math.round(s * 16), spd = 500 + 1900 * s, len = 22 + 150 * s;
  ctx.save(); ctx.strokeStyle = LOOK.c.cream; ctx.lineCap = 'round'; ctx.globalAlpha = 0.1 + 0.28 * s;
  for (let i = 0; i < n; i++) {
    const vv = 0.7 + (i % 5) * 0.12, x = Math.abs((Math.sin(i * 91.7) * 43758.5453) % 1) * W;
    const yy = H + len - ((i * 211.3 + T * spd * vv) % (H + len * 2));
    ctx.lineWidth = 0.8 + 3.4 * s * vv; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy + len * vv); ctx.stroke();
  }
  ctx.restore();
}
function drawFront(T) {
  const cl = A.cloudSprites(), H = G.H, p = ppm(); ctx.save(); ctx.globalAlpha = RM ? 0.1 : 0.2;
  for (let k = 0; k < 7; k++) {
    const y = H * 0.42 + (G.camAlt - (260 + k * 410)) * p * 1.9; if (y < -260 || y > H + 20) continue;
    const x = ((k * 233 + T * (10 + (k % 3) * 6)) % (G.W + 600)) - 300, s = 1.7 + (k % 2) * 0.5;
    ctx.drawImage(cl[k % cl.length], x, y, 360 * s, 130 * s);
  }
  ctx.restore();
}
function drawBubble(x, y, text, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.font = `600 11px ${A.SYS}`; const w = ctx.measureText(text).width + 14, h = 18;
  ctx.fillStyle = hexA(LOOK.c.c1, 0.95); ctx.strokeStyle = LOOK.trim; ctx.lineWidth = 1; ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h, w, h, 3); else ctx.rect(x - w / 2, y - h, w, h);
  ctx.fill(); ctx.stroke(); ctx.fillStyle = LOOK.c.cream; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - h / 2 + 0.5); ctx.restore();
}
function drawGlow(c) {
  const H = G.H, a = 0.18 + 0.72 * c; const g = ctx.createLinearGradient(0, H, 0, H * 0.4);
  g.addColorStop(0, hexA(LOOK.glow.hi, a)); g.addColorStop(0.45, hexA(LOOK.glow.lo, a * 0.5)); g.addColorStop(1, hexA(LOOK.glow.lo, 0));
  ctx.fillStyle = g; ctx.fillRect(0, H * 0.4, G.W, H * 0.6);
}
function drawGround(gy) {
  const W = G.W, H = G.H;
  ctx.fillStyle = LOOK.ground; ctx.fillRect(0, gy, W, H - gy + 2);
  ctx.strokeStyle = LOOK.trim; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); ctx.stroke();
  const off = -G.camX * pxX() * 0.4;
  for (let k = 0; k < 9; k++) {
    const x = (((k * 173 + 40 + off) % (W + 240)) + W + 240) % (W + 240) - 120; const s = 34 + (k % 3) * 12;
    if (k % 3 === 0) A.drawHouse(ctx, x, gy, s, 2); else A.drawTree(ctx, x, gy, s, 2);
  }
}
function drawPlayer(p, x, y, T, labelCol) {
  const u = unit(), j = p.j, lw = Math.max(1.4, u * 0.16);
  // small life: a tumble in freefall, a sway under the chute, a jolt when it snaps open, a flinch when someone near you opens or crashes
  const kk = p.kick || 0, since = j.opened && p.openT != null ? G.t - p.openT : 9;
  if (!RM) { x += kk * 9; if (since < 0.45) y += Math.sin(since * 32) * Math.exp(-since * 8) * u * 0.45; }
  const rot = RM || j.landed ? 0 : (j.opened ? Math.sin(T * 1.1 + p.ph) * 0.05 : Math.sin(T * 1.7 + p.ph) * 0.15 + Math.sin(T * 0.6 + p.ph * 2) * 0.08) + kk * 0.3;
  let pose;
  if (j.landed) pose = p.crashed ? 'crash' : p.look.pose; else pose = j.opened ? 'chute' : 'fall';
  if (!j.opened && !j.landed) A.drawTrail(ctx, p.look.trail, x, y - u * 2.4, u, T, 1);
  const fig = A.drawFigure(ctx, { x, y, u, rot, face: p.look.face, suit: p.look.suit, helmet: p.look.helmet, pose: A.poseFor(pose, T + (p.ph || 0)) });
  // names of divers who bunch up stack instead of printing over each other
  const all = G.round.players, bump = all.filter((q) => all.indexOf(q) < all.indexOf(p) && Math.abs(sxOf(q.x) - x) < 62 && Math.abs(sy(q.j.y) - y) < 26).length;
  let top = y - u * 2.2 - bump * 13;
  if (j.opened && !j.landed) {
    const kb = G.t - p.openT, o = RM ? 1 : clamp(1 - Math.exp(-9 * kb) * Math.cos(14 * kb), 0.05, 1.3), hem = y - u * 2.7;
    const pr = A.drawParasol(ctx, x, hem, u * 5.4, p.look.chute, o, lw); A.drawStrings(ctx, pr, fig.handL, fig.handR, lw);
    top = hem - u * 2.3 - bump * 13;
  }
  ctx.font = `700 11px ${A.SYS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 3; ctx.strokeStyle = A.PAL.ink; ctx.lineJoin = 'round';
  ctx.strokeText(p.name, x, top - 4); ctx.fillStyle = labelCol; ctx.fillText(p.name, x, top - 4);
  const stampOn = p.wasOpen && j.openSafe && G.t - p.openT < 2.6;
  if (p.bubble && G.t - p.bubble.t0 < 1.7) drawBubble(x, top - (stampOn ? 66 : 20), p.bubble.text, clamp(1.7 - (G.t - p.bubble.t0), 0, 1));
  if (stampOn) {
    const k = G.t - p.openT; const sc = k < 0.18 ? 0.4 + k / 0.18 * 0.7 : k < 0.3 ? 1.1 - (k - 0.18) * 0.8 : 1; A.drawStamp(ctx, x, top - 34, 'Safe', fmt(j.openFallen) + ' m', clamp(2.6 - k, 0, 1), sc, LOOK.stamp, LOOK.c.green);
  }
}
function drawRuler(T) {
  const r = G.round; if (!r) return;
  if (LOOK.altimeter === 'tape') drawTape(r); else if (LOOK.altimeter === 'dial') drawDial(r); else drawRulerLine(T);
}
function drawTape(r) {
  const H = G.H, f = (G.target || r.me).j.fallen, pxm = H * 0.0012, cy = H * 0.45, x1 = 40;
  ctx.save(); ctx.fillStyle = hexA(LOOK.c.c1, 0.88); ctx.fillRect(0, 70, x1, H - 140); ctx.strokeStyle = LOOK.trim; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x1, 70); ctx.lineTo(x1, H - 70); ctx.stroke(); ctx.beginPath(); ctx.rect(0, 70, x1, H - 140); ctx.clip();
  ctx.font = `10px ${A.SYS}`; ctx.textBaseline = 'middle'; ctx.fillStyle = LOOK.c.cream;
  const span = (H / 2) / pxm, lo = Math.max(0, Math.floor((f - span) / 50) * 50), hi = f + span;
  for (let mm = lo; mm <= hi; mm += 50) {
    const y = cy + (mm - f) * pxm, major = mm % 100 === 0;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 - (major ? 12 : 6), y); ctx.stroke();
    if (major) { ctx.globalAlpha = 0.7; ctx.fillText(String(mm), 3, y); ctx.globalAlpha = 1; }
  }
  for (const p of r.players) { const y = cy + (p.j.fallen - f) * pxm; if (y < 70 || y > H - 70) continue; ctx.fillStyle = p.me ? LOOK.accent : LOOK.c.cream; ctx.beginPath(); ctx.arc(x1 - 3, y, p.me ? 4 : 2.5, 0, 7); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = LOOK.c.c0; ctx.strokeStyle = LOOK.accent; ctx.lineWidth = 1.5; ctx.fillRect(0, cy - 9, x1 + 8, 18); ctx.strokeRect(0, cy - 9, x1 + 8, 18);
  ctx.fillStyle = LOOK.accent; ctx.font = `700 11px ${A.SYS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(fmt(f), 4, cy + 1);
}
function drawDial(r) {
  const cx = 46, cy = 128, R = 30, a0 = Math.PI * 0.75, span = Math.PI * 1.5;
  const at = (fr) => a0 + clamp(fr, 0, 1) * span, me = r.me.j.fallen / C.maxHeight;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = LOOK.c.c2; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + span); ctx.stroke();
  ctx.strokeStyle = LOOK.accent; ctx.beginPath(); ctx.arc(cx, cy, R, a0, at(me)); ctx.stroke();
  for (const p of r.players) if (!p.me) { const an = at(p.j.fallen / C.maxHeight); ctx.fillStyle = LOOK.c.cream; ctx.beginPath(); ctx.arc(cx + Math.cos(an) * (R + 6), cy + Math.sin(an) * (R + 6), 2.2, 0, 7); ctx.fill(); }
  ctx.fillStyle = LOOK.accent; ctx.font = `700 11px ${A.SYS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fmt(r.me.j.fallen), cx, cy);
  ctx.fillStyle = LOOK.c.cream; ctx.font = `9px ${A.SYS}`; ctx.fillText('m fallen', cx, cy + R + 16);
  ctx.restore();
}
function drawRulerLine() {
  const r = G.round, H = G.H; if (!r) return;
  // a scrolling ruler of metres fallen. It never shows the jump height or a safe line, so nobody can read the ground off it.
  const f = (G.target || r.me).j.fallen, x = 22, y0 = 76, y1 = H - 78, cy = H * 0.45, pxm = H * 0.0012;
  ctx.save(); ctx.beginPath(); ctx.rect(0, y0, 130, y1 - y0); ctx.clip();
  ctx.strokeStyle = LOOK.trim; ctx.fillStyle = LOOK.c.cream; ctx.lineWidth = 1.5; ctx.font = `10px ${A.SYS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  const span = (y1 - y0) / 2 / pxm;
  for (let mm = Math.max(0, Math.floor((f - span) / 50) * 50); mm <= f + span; mm += 50) {
    const yy = cy + (mm - f) * pxm, major = mm % 100 === 0;
    ctx.beginPath(); ctx.moveTo(x - (major ? 6 : 3), yy); ctx.lineTo(x + (major ? 6 : 3), yy); ctx.stroke();
    if (major) { ctx.globalAlpha = 0.7; ctx.fillText(String(mm), x + 9, yy); ctx.globalAlpha = 1; }
  }
  for (const p of r.players) {
    const yy = clamp(cy + (p.j.fallen - f) * pxm, y0 + 4, y1 - 4);
    ctx.fillStyle = p.me ? LOOK.accent : LOOK.c.cream; ctx.strokeStyle = A.PAL.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + (p.me ? 13 : 10), yy - (p.me ? 5 : 3.5)); ctx.lineTo(x + (p.me ? 13 : 10), yy + (p.me ? 5 : 3.5)); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
function drawArrow(p) {
  const W = G.W, H = G.H; const x = sxOf(p.x), y = sy(p.j.y) - unit() * 2;
  if (y > -20 && y < H + 20 && x > 36 && x < W - 6) return;
  const ax = clamp(x, 56, W - 40), top = y < H / 2, ay = top ? 118 : H - 112;
  ctx.save(); ctx.translate(ax, ay); ctx.fillStyle = p.me ? LOOK.accent : LOOK.c.cream; ctx.strokeStyle = A.PAL.ink; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  const dx = x < 36 ? -1 : x > W - 6 ? 1 : 0, dy = y <= -20 ? -1 : y >= H + 20 ? 1 : 0; const ang = Math.atan2(dy, dx); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, -7); ctx.lineTo(-5, 7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.rotate(-ang);
  const label = `${p.name} ${fmt(p.j.fallen)} m`; ctx.font = `700 10px ${A.SYS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3;
  const ty = top ? 16 : -16; ctx.strokeText(label, 0, ty); ctx.fillText(label, 0, ty); ctx.restore();
}

function drawEnding(T) {
  const r = G.round, W = G.W, H = G.H, n = r.players.length; const gy = H * G.shotY;
  const sp = Math.min(W / (n + 0.6), 96), u = clamp(sp * 0.3, 9, 22);
  ctx.fillStyle = LOOK.ground; drawGroundBack(gy, W, H);
  const xs = r.players.map((_, i) => W / 2 + (i - (n - 1) / 2) * sp);
  r.players.forEach((p, i) => {
    const x = xs[i];
    if (p.crashed) { A.drawFigure(ctx, { x, y: gy - u * 0.5, u, face: p.look.face, suit: p.look.suit, helmet: p.look.helmet, pose: A.poseFor('crash', 0), rot: Math.PI }); }
    else A.drawFigure(ctx, { x, y: gy - A.STAND_H * u, u, face: p.look.face, suit: p.look.suit, helmet: p.look.helmet, pose: A.poseFor(p.look.pose, T + i) });
  });
  ctx.fillStyle = LOOK.ground; ctx.fillRect(0, gy, W, H - gy);
  ctx.strokeStyle = LOOK.trim; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); ctx.stroke();
  const k = G.t;
  for (const d of G.dust) {
    const age = k - d.t0; if (age > 1.8) continue; const x = xs[d.i], a = clamp(1 - age / 1.8, 0, 1);
    const dir = Math.cos(d.a) * (d.i % 2 ? 1 : -1) * 0 + Math.cos(d.a * 2);
    ctx.globalAlpha = a * 0.7; ctx.fillStyle = LOOK.c.cream; ctx.beginPath(); ctx.arc(x + dir * age * 40 * d.s, gy - Math.abs(Math.sin(d.a)) * age * 26 * d.s, d.r * (1 + age), 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  r.players.forEach((p, i) => {
    ctx.font = `700 11px ${A.SYS}`; ctx.lineWidth = 3; ctx.strokeStyle = A.PAL.ink; ctx.lineJoin = 'round';
    const y = gy + 20; ctx.strokeText(p.name, xs[i], y); ctx.fillStyle = p.me ? LOOK.accent : LOOK.c.cream; ctx.fillText(p.name, xs[i], y);
    ctx.font = `11px ${A.SYS}`; ctx.fillStyle = p.crashed ? LOOK.c.lose : LOOK.c.green; ctx.fillText(p.crashed ? 'Crashed' : 'x' + p.out.mult.toFixed(2), xs[i], y + 15);
    if (p.endLine) drawBubble(xs[i], p.crashed ? gy - u * 3.2 : gy - A.STAND_H * u - u * 2.6, p.endLine, 1);
  });
}
function drawGroundBack(gy, W, H) { const off = 0; for (let k = 0; k < 7; k++) { const x = ((k * 173 + 40 + off) % (W + 160)) - 60; const s = 40 + (k % 3) * 14; if (k % 3 === 0) A.drawHouse(ctx, x, gy, s, 2); else A.drawTree(ctx, x, gy, s, 2); } }

function draw(T) {
  const W = G.W, H = G.H; ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  const r = G.round, shot = r && (G.state === 'result' || (G.state === 'ending' && G.phase === 'hold')), fading = r && G.state === 'ending' && G.phase === 'fade';
  let close = 0.2;
  // the red glow follows how far you have fallen, never how near the ground is
  if (r && !shot) close = clamp((G.target || r.me).j.fallen / C.maxHeight, 0, 1); else if (shot) close = 1;
  if (G.shake) {
    const k = (performance.now() - G.shake.t0) / 1000 / G.shake.dur;
    if (k >= 1) G.shake = null; else { const a = G.shake.a * (1 - k) * (1 - k), n = performance.now(); ctx.translate(Math.sin(n * 0.09) * a, Math.cos(n * 0.113) * a); }
  }
  drawSky(T); drawGlow(close);
  if (shot) { drawEnding(T); return; }
  if (!r) { // waiting scene: a diver on the ground
    const gy = H * 0.7; drawGround(gy);
    if (store.s) { const u = unit() * 1.4; const look = lookOf(equippedCfg()); A.drawFigure(ctx, { x: W / 2, y: gy - A.STAND_H * u + (RM ? 0 : Math.sin(T * 1.8) * u * 0.06), u, face: look.face, suit: look.suit, helmet: look.helmet, pose: A.poseFor(look.pose, T) }); }
    return;
  }
  if (G.state === 'fall' || (G.state === 'ending' && (G.phase === 'beat' || G.phase === 'pan'))) drawStreaks(T);
  const gy = sy(0);
  if (G.camAlt <= C.groundVisibleM) drawGround(gy);
  const pl = r.players.slice().sort((a, b) => (a.me ? 1 : 0) - (b.me ? 1 : 0));
  const top = sy(r.h);
  if (G.camAlt > r.h - 400) A.drawPlane(ctx, sxOf(0) - 60, top - 20, unit() * 1.6, find('plane', store.s.equipped.plane).look, T, 2);
  for (const p of pl) {
    const y = sy(p.j.y); if (y < -140 || y > H + 140) continue;
    if (p.j.landed && G.camAlt > C.groundVisibleM) continue;
    drawPlayer(p, sxOf(p.x), y, T, p.me ? LOOK.accent : LOOK.c.cream);
  }
  if (!fading) drawFront(T);
  if (!fading && G.phase !== 'pan') { drawRuler(T); for (const p of r.players) if (!p.j.landed) drawArrow(p); }
  if (fading) { ctx.save(); ctx.globalAlpha = RM ? 1 : clamp(G.pT / 0.4, 0, 1); drawSky(T); drawGlow(1); drawEnding(T); ctx.restore(); }
}

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const T = now / 1000;
  if (!store.s) { draw(T); return; }
  const r = G.round;
  if (r && G.state === 'fall') {
    let left = dt * G.timeScale; while (left > 1e-6 && G.state === 'fall') { const d = Math.min(left, 1 / 120); simStep(d); left -= d; }
    if (!G.target || !falling(G.target)) { if (!meDone()) G.target = r.me; else retarget(); }
    roundUi();
    const tj = G.target ? G.target.j : r.me.j;
    G.camAlt += (tj.y - G.camAlt) * (1 - Math.exp(-dt * (G.target && G.target.me ? 16 : 7)));
    G.camX += ((G.target ? G.target.x : 0) - G.camX) * (1 - Math.exp(-dt * 6));
    const fallen = G.target ? G.target.j.fallen : 0;
    $('big').textContent = fmt(fallen);
    const nl = $('nowline');
    if (G.target && (G.target.j.opened)) nl.textContent = 'Opened at x' + S.multiplierAt(G.target.j.openFallen).toFixed(2);
    else nl.textContent = ''; if (G.target && !G.target.j.opened) { nl.textContent = ''; const b = document.createElement('b'); b.textContent = 'x' + S.multiplierAt(G.target.j.fallen).toFixed(2); nl.append(G.target.me ? 'Open now ' : 'They open now at ', b); }
    sfx.wind(G.target && !G.target.j.opened ? G.target.j.v / C.terminalSpeed : G.target ? 0.15 : 0);
    if (G.t - G.lbT > 0.2) { G.lbT = G.t; lbRender(false); }
  } else if (G.state === 'ending') {
    endStep(dt);
  } else if (G.state === 'result') G.t += dt;
  else { // idle
    G.t += dt;
  }
  G.shotY += ((G.state === 'result' ? 0.36 : 0.56) - G.shotY) * (1 - Math.exp(-dt * 5));
  // tokens roll up with coin ticks
  const diff = store.balance - G.balShown;
  if (Math.abs(diff) >= 1) {
    G.balShown += Math.abs(diff) < 2 ? diff : diff * Math.min(1, dt * 5) + Math.sign(diff);
    G.coinAcc += dt; if (G.coinAcc > 0.045 && diff > 0) { G.coinAcc = 0; sfx.coin(G.coinN++); }
    $('balv').textContent = fmt(G.balShown);
  } else if (diff !== 0 || $('balv').textContent !== fmt(store.balance)) { G.balShown = store.balance; $('balv').textContent = fmt(G.balShown); G.coinN = 0; }
  pvDraw(false);
  draw(T);
}

// ---------- start up ----------
async function boot() {
  const bar = $('loadbar'), txt = $('loadtxt'); const step = (p, t) => { bar.style.width = p + '%'; txt.textContent = t; };
  step(20, 'Loading fonts');
  try { await Promise.race([document.fonts.load('40px "Kaushan Script"'), new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* font falls back */ }
  try { store.addSite(await (await fetch(new URL('../shared/catalog.json', import.meta.url))).json()); relook(); } catch (e) { window.__errs.push('site catalog: ' + e.message); }
  step(55, 'Drawing the sky'); resize(); A.cloudSprites(); A.moon(ctx, 0, 0, 20);
  step(85, 'Loading your profile'); carousel($('faces')); carousel($('suits')); carousel($('grid'));
  let mins = 0; setInterval(() => { mins += 30; if (store.s) toast(`You have been playing for ${mins} minutes. Tokens are play money. Take a break whenever you like.`); }, 30 * 60 * 1000);
  G.balShown = store.balance;
  requestAnimationFrame(frame);
  step(100, 'Ready');
  setTimeout(() => show($('loading'), false), 150);
  if (!store.hasProfile) openStart(false);
  else { refreshAll(); if (store.claim) openClaim(); else toBet(); }
}
Object.assign(window.__ff, { doOpen, startRound, showResults, openSettings, openShop, B, rm: () => RM });
boot();
