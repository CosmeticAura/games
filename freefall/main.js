// Freefall v4: page, round flow and drawing. Numbers live in config.js, maths in sim.js, saving in state.js.
import { CONFIG as C } from './config.js';
import * as S from './sim.js';
import { Store, nameOk, ACH } from './state.js';
import { CATALOG, CATEGORIES, find, POSES } from './catalog.js';
import { Sfx } from './audio.js';
import * as A from './art.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const params = new URLSearchParams(location.search);
const show = (el, on = true) => el.classList.toggle('hide', !on);

const store = new Store();
const sfx = new Sfx();
sfx.vol = store.g.volume; sfx.muted = store.g.muted;

const G = {
  state: 'idle', round: null, t: 0, camAlt: 0, camX: 0, target: null, timeScale: 1,
  forceH: params.get('h') ? +params.get('h') : null,
  balShown: 0, coinAcc: 0, coinN: 0, dust: [], endT: 0, lbT: 0, pvT: 0, drift: 0, keys: 0,
  W: 390, H: 844, dpr: 1, news: [],
};
window.__ff = { G, store, sfx, C, S };
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

// ---------- start screen ----------
let pickFace = 0, pickSuit = C.starterSuits[0];
function buildStart(canCancel) {
  const faces = $('faces'); faces.textContent = '';
  for (let i = 0; i < C.avatarCount; i++) {
    const b = document.createElement('button'); b.className = 'pick' + (i === pickFace ? ' on' : ''); b.setAttribute('aria-label', 'Face ' + (i + 1));
    const [c, g] = mk(52, 52); A.drawFace(g, i, 26, 33, 13, 2); b.appendChild(c);
    b.onclick = () => { pickFace = i; buildStart(canCancel); }; faces.appendChild(b);
  }
  const suits = $('suits'); suits.textContent = '';
  for (const id of C.starterSuits) {
    const it = find('suit', id); const b = document.createElement('button'); b.className = 'pick' + (id === pickSuit ? ' on' : '');
    const [c, g, w, h] = mk(60, 80);
    A.drawPreview(g, w, h, { face: pickFace, suit: id, helmet: 'helmet_classic', chute: 'chute_classic', trail: 'none', emote: 'emote_wave', plane: 'plane_classic' }, 0, 'suit');
    b.appendChild(c); const s = document.createElement('span'); s.textContent = it.name; b.appendChild(s);
    b.onclick = () => { pickSuit = id; buildStart(canCancel); }; suits.appendChild(b);
  }
  show($('startcancel'), canCancel);
}
function openStart(canCancel) { $('uerr').textContent = ''; buildStart(canCancel); openSheet('startp'); show($('startp')); }
$('playbtn').onclick = () => {
  const name = $('uname').value.trim();
  if (!nameOk(name)) { $('uerr').textContent = 'Use 3 to 16 letters, numbers or underscores.'; return; }
  const r = store.createProfile(name, pickFace, pickSuit);
  if (r === 'taken') { $('uerr').textContent = 'That name is already used on this device.'; return; }
  if (r !== 'ok') { $('uerr').textContent = 'That name will not work.'; return; }
  $('uname').value = ''; afterProfile(); toast('Welcome, ' + store.name + '. ' + fmt(store.welcome) + ' tokens to start.');
};
$('startcancel').onclick = () => { closeSheets(); toBet(); };

function afterProfile() { G.balShown = store.balance; G.round = null; refreshAll(); G.state = 'idle'; if (store.claim) openClaim(); else toBet(); }

// ---------- claim ----------
function openClaim() {
  const c = store.claim; $('claimamt').textContent = '+' + fmt(c.bonus + c.extra);
  $('claimsub').textContent = c.extra ? `Daily claim plus ${fmt(c.extra)} for a ${c.streak} day streak.` : 'Your daily claim is ready.';
  openSheet('claimp');
}
$('claimbtn').onclick = () => { store.claimBonus(); toBet(); };

// ---------- bet ticket ----------
function toBet() {
  G.state = 'idle'; G.target = null; hideRoundUi();
  $('tkno').textContent = 'No. ' + String(store.s.best.rounds + 1).padStart(4, '0');
  $('tkname').textContent = store.name;
  const poor = store.balance < C.minBet;
  show($('rescue'), poor); show($('jump'), !poor);
  const ab = $('abandoned'); show(ab, store.abandoned > 0); if (store.abandoned > 0) { ab.textContent = `Last round was cut off. The ${fmt(store.abandoned)} bet is gone.`; }
  const bi = $('bet'); const v = parseInt(bi.value, 10);
  if (!(v >= C.minBet) || v > store.balance) bi.value = String(Math.max(C.minBet, Math.min(100, store.balance)));
  $('beterr').textContent = '';
  const ch = $('chips'); ch.textContent = '';
  for (const n of [10, 100, 500, 1000, 5000, 'All']) {
    const b = document.createElement('button'); b.textContent = n === 'All' ? 'All in' : fmt(n);
    b.onclick = () => { bi.value = String(n === 'All' ? store.balance : Math.min(n, store.balance)); $('beterr').textContent = ''; }; ch.appendChild(b);
  }
  openSheet('betp'); refreshAll();
}
$('betminus').onclick = () => { const b = $('bet'); b.value = String(Math.max(C.minBet, Math.floor((parseInt(b.value, 10) || C.minBet) / 2))); };
$('betplus').onclick = () => { const b = $('bet'); b.value = String(Math.min(store.balance, (parseInt(b.value, 10) || C.minBet) * 2)); };
$('rescue').onclick = () => { store.rescue(); toBet(); };
$('jump').onclick = () => {
  const raw = $('bet').value.replace(/[, ]/g, ''); const bet = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
  if (!(bet >= C.minBet) || bet > store.balance) { $('beterr').textContent = `Bet between ${C.minBet} and ${fmt(store.balance)}.`; return; }
  startRound(bet);
};

// ---------- round ----------
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function randomLook() {
  const pick = (cat) => CATALOG[cat][Math.floor(Math.random() * CATALOG[cat].length)].id;
  return lookOf({ face: Math.floor(Math.random() * C.avatarCount), suit: pick('suit'), helmet: pick('helmet'), chute: pick('chute'), trail: Math.random() < 0.35 ? pick('trail') : 'none', emote: pick('emote') });
}
function startRound(bet) {
  sfx.init();
  const h = G.forceH || S.randomHeight(Math.random, store.s.lastH);
  store.startRound(bet, h);
  const me = { name: store.name, me: true, bet, j: S.newJumper(h), look: lookOf(equippedCfg()), x: 0, lane: 0, amp: 0, f: 0, ph: 0, wasOpen: false, wasLanded: false, settled: false, out: null };
  const nb = C.botsMin + Math.floor(Math.random() * (C.botsMax - C.botsMin + 1));
  const names = shuffle(C.botNames.slice(0, 12)).filter((n) => n.toLowerCase() !== store.name.toLowerCase());
  const bots = [];
  for (let i = 0; i < nb; i++) {
    const b = S.makeBot(names[i], h); const side = i % 2 ? 1 : -1;
    Object.assign(b, { look: randomLook(), lane: side * (6 + Math.floor(i / 2) * 6), amp: 1.5 + Math.random() * 2, f: 0.5 + Math.random(), ph: Math.random() * 6, wasOpen: false, wasLanded: false, out: null });
    b.x = b.lane; bots.push(b);
  }
  G.round = { h, me, bots, players: [me, ...bots], t0: G.t };
  G.target = me; G.camAlt = h; G.camX = 0; G.dust = []; G.timeScale = 1; G.state = 'fall';
  closeSheets(); show($('chutecard'), false); show($('crashcard'), false);
  refreshAll(); lbRender(true);
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
  const r = G.round; p.wasOpen = true; p.openT = G.t; sfx.snap(p.me ? 1 : 0.3);
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
  if (p.crashed) sfx.crash(p.me ? 1 : 0.45); else sfx.thud(p.me ? 1 : 0.4);
  if (p.me) { settleMe(); show($('chutecard'), false); }
  if (G.target === p) retarget();
}
function settleMe() {
  const me = G.round.me; if (me.settled) return; me.settled = true;
  const o = S.outcome(me.j, me.bet); me.out = o;
  G.news = store.finishRound({ payout: o.payout, win: o.win, mult: o.mult, h: G.round.h, opened: me.j.opened, openAlt: me.j.openAlt, bet: me.bet });
  histRender();
  if (!o.win) {
    $('crashsub').textContent = `Jump from ${fmt(G.round.h)} m. Bet lost: ${fmt(me.bet)}.`;
    show($('crashcard'));
  }
}

function simStep(dt) {
  const r = G.round, me = r.me; G.t += dt;
  me.x = clamp(me.x + G.drift * C.driftFree * dt * (me.j.opened ? C.driftChute / C.driftFree : 1), -15, 15);
  if (!me.j.landed) S.step(me.j, dt);
  for (const b of r.bots) { S.stepBot(b, dt); b.x = b.lane + Math.sin(G.t * b.f + b.ph) * b.amp; }
  for (const p of r.players) {
    if (p.j.opened && !p.wasOpen) onOpen(p);
    if (p.j.landed && !p.wasLanded) onLand(p);
  }
  if (G.state === 'fall' && !r.players.some(falling)) beginEnding();
}

function beginEnding() {
  const r = G.round; G.state = 'ending'; G.endT = C.endHold; G.timeScale = 1;
  for (const p of r.players) {
    if (!p.j.landed) S.finish(p.j);
    p.wasLanded = true; p.crashed = !(p.j.opened && p.j.landSpeed < C.safeLanding);
    p.out = S.outcome(p.j, p.bet);
    if (!p.me) p.mult = p.j.opened ? S.multiplierAt(p.j.openFallen) : 0;
  }
  settleMe(); r.me.mult = r.me.out.mult;
  G.dust = [];
  r.players.forEach((p, i) => { if (p.crashed) for (let k = 0; k < 16; k++) G.dust.push({ i, a: Math.random() * Math.PI, s: 0.4 + Math.random(), r: 3 + Math.random() * 6, t0: G.t }); });
  if (r.players.some((p) => !p.crashed)) sfx.cheer();
  sfx.wind(0);
  show($('crashcard'), false); show($('chutecard'), false); hideRoundUi();
  lbRender(true);
}

function showResults() {
  const r = G.round, me = r.me, o = me.out; G.state = 'result';
  $('restitle').textContent = o.win ? 'Landed' : 'Crashed';
  $('ressub').textContent = o.win ? `Opened after ${fmt(me.j.openFallen)} m of ${fmt(r.h)}. Multiplier x${o.mult.toFixed(2)}.` : `Jump from ${fmt(r.h)} m. The bet is gone.`;
  const big = $('resbig'); big.textContent = o.win ? '+' + fmt(o.payout) : '-' + fmt(me.bet); big.className = 'mono ' + (o.win ? 'win' : 'lose');
  const t = $('restbl'); t.textContent = '';
  const rows = r.players.slice().sort((a, b) => (b.out.net) - (a.out.net));
  for (const p of rows) {
    const d = document.createElement('div'); d.className = 'r ' + (p.out.win ? 'w' : 'l') + (p.me ? ' me' : '');
    const n = document.createElement('span'); n.textContent = p.name; const bt = document.createElement('span'); bt.textContent = fmt(p.bet);
    const s = document.createElement('b'); s.textContent = p.out.win ? `x${p.out.mult.toFixed(2)}  +${fmt(p.out.payout)}` : 'Crashed'; d.append(n, bt, s); t.appendChild(d);
  }
  openSheet('resp');
  for (const a of G.news || []) toast('Unlocked: ' + a.name);
  G.news = [];
}
$('again').onclick = () => { if (store.balance < C.minBet) store.rescue(); toBet(); };
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
function openShop(locker) { lockerMode = !!locker; $('shoptitle').textContent = locker ? 'Locker' : 'Shop'; if (!locker && !CATEGORIES.some((c) => c[0] === shopCat)) shopCat = 'suit'; shopRender(); openSheet('shop'); show($('panel'), true); clearInterval(shopTimer); shopTimer = setInterval(shopAnimate, 90); }
function closeShop() { clearInterval(shopTimer); closeSheets(); refreshAll(); if (G.state === 'idle') toBet(); }
let shopCanvases = [];
function shopRender() {
  $('shopbal').textContent = fmt(store.balance) + ' tokens';
  const tabs = $('tabs'); tabs.textContent = '';
  for (const [id, label] of CATEGORIES) { const b = document.createElement('button'); b.textContent = label; if (id === shopCat) b.className = 'on'; b.onclick = () => { shopCat = id; shopRender(); }; tabs.appendChild(b); }
  const grid = $('grid'); grid.textContent = ''; shopCanvases = [];
  const items = CATALOG[shopCat].filter((it) => !lockerMode || store.owns(it.id));
  if (!items.length) { const d = document.createElement('div'); d.className = 'empty'; d.textContent = 'Nothing owned here yet.'; grid.appendChild(d); }
  for (const it of items) {
    const owned = store.owns(it.id), eq = store.equipped(shopCat) === it.id;
    const d = document.createElement('div'); d.className = 'item' + (eq ? ' eq' : '');
    const [c, g, w, h] = mk(150, 150); d.appendChild(c); shopCanvases.push({ g, w, h, it });
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = it.name;
    const pr = document.createElement('div'); pr.className = 'pr'; pr.textContent = owned ? (eq ? 'Equipped' : 'Owned') : it.price ? fmt(it.price) + ' tokens' : 'Free';
    const b = document.createElement('button');
    if (eq) { b.textContent = 'Equipped'; b.disabled = true; }
    else if (owned) { b.textContent = 'Equip'; b.onclick = () => { store.equip(shopCat, it.id); shopRender(); pvDraw(true); }; }
    else { b.textContent = 'Buy'; b.className = 'buy'; b.disabled = store.balance < it.price; b.onclick = () => buyItem(it); }
    d.append(nm, pr, b); grid.appendChild(d);
  }
  shopAnimate(true);
}
function buyItem(it) {
  const r = store.buy(shopCat, it.id); if (r !== 'ok') { toast(r === 'poor' ? 'Not enough tokens.' : 'Already owned.'); return; }
  G.balShown = store.balance; refreshAll(); shopRender();
  toast(`Bought ${it.name}. Tap to undo.`, () => { if (store.undoBuy()) { G.balShown = store.balance; shopRender(); refreshAll(); show($('toast'), false); } });
}
function shopAnimate(first) {
  if (first !== true && shopCat !== 'emote') return;
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
  for (const p of store.profiles()) {
    const d = document.createElement('div'); d.className = 'prow' + (p.id === store.s.id ? ' on' : '');
    const n = document.createElement('span'); n.textContent = `${p.name}  ${fmt(p.balance)}`;
    d.appendChild(n);
    if (p.id !== store.s.id) { const b = document.createElement('button'); b.className = 'pill small'; b.textContent = 'Play as'; b.onclick = () => { store.switchTo(p.id); afterProfile(); }; d.appendChild(b); }
    else { const s = document.createElement('span'); s.className = 'lbl'; s.textContent = 'Current'; d.appendChild(s); }
    pl.appendChild(d);
  }
  openSheet('setp');
}
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
  $('balv').textContent = fmt(G.balShown);
}

// ---------- drawing ----------
let skyGrad = null, skyH = 0;
function drawSky(T) {
  const W = G.W, H = G.H;
  if (!skyGrad || skyH !== H) { skyGrad = ctx.createLinearGradient(0, 0, 0, H); skyGrad.addColorStop(0, A.PAL.ink); skyGrad.addColorStop(0.6, A.PAL.c0); skyGrad.addColorStop(1, A.PAL.c1); skyH = H; }
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
  A.moon(ctx, W * 0.78, H * 0.17, Math.min(W, H) * 0.06);
  const cl = A.cloudSprites(); const p = ppm();
  ctx.save(); ctx.globalAlpha = 0.75;
  for (let k = 0; k < 10; k++) {
    const y = H * 0.42 + (G.camAlt - (150 + k * 330)) * p * 0.6;
    if (y < -140 || y > H + 20) continue;
    const x = ((k * 197 + T * (3 + (k % 3) * 2)) % (W + 360)) - 180;
    const s = 0.8 + (k % 3) * 0.25; ctx.drawImage(cl[k % cl.length], x, y, 360 * s, 130 * s);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(232,220,195,0.2)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i < 55; i++) {
    const x0 = (i * 131.7) % W; const y = ((i * 97.3 + G.camAlt * p * 1.6 + T * 380 * (0.7 + (i % 5) * 0.1)) % (H + 40) + H + 40) % (H + 40) - 20;
    ctx.moveTo(x0, y); ctx.lineTo(x0 - 3, y + 15);
  }
  ctx.stroke();
}
function drawGlow(c) {
  const H = G.H, a = 0.18 + 0.72 * c; const g = ctx.createLinearGradient(0, H, 0, H * 0.4);
  g.addColorStop(0, `rgba(163,40,31,${a})`); g.addColorStop(0.45, `rgba(110,22,18,${a * 0.5})`); g.addColorStop(1, 'rgba(110,22,18,0)');
  ctx.fillStyle = g; ctx.fillRect(0, H * 0.4, G.W, H * 0.6);
}
function drawGround(gy) {
  const W = G.W, H = G.H;
  ctx.fillStyle = A.PAL.c1; ctx.fillRect(0, gy, W, H - gy + 2);
  ctx.strokeStyle = A.PAL.gold; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); ctx.stroke();
  const off = -G.camX * pxX() * 0.4;
  for (let k = 0; k < 9; k++) {
    const x = (((k * 173 + 40 + off) % (W + 240)) + W + 240) % (W + 240) - 120; const s = 34 + (k % 3) * 12;
    if (k % 3 === 0) A.drawHouse(ctx, x, gy, s, 2); else A.drawTree(ctx, x, gy, s, 2);
  }
}
function drawPlayer(p, x, y, T, labelCol) {
  const u = unit(), j = p.j, lw = Math.max(1.4, u * 0.16);
  let pose;
  if (j.landed) pose = p.crashed ? 'crash' : p.look.pose; else pose = j.opened ? 'chute' : 'fall';
  if (!j.opened && !j.landed) A.drawTrail(ctx, p.look.trail, x, y - u * 2.4, u, T, 1);
  const fig = A.drawFigure(ctx, { x, y, u, face: p.look.face, suit: p.look.suit, helmet: p.look.helmet, pose: A.poseFor(pose, T + (p.ph || 0)) });
  let top = y - u * 2.2;
  if (j.opened && !j.landed) {
    const o = clamp((G.t - p.openT) / 0.25, 0.05, 1.15), hem = y - u * 2.7;
    const pr = A.drawParasol(ctx, x, hem, u * 5.4, p.look.chute, o, lw); A.drawStrings(ctx, pr, fig.handL, fig.handR, lw);
    top = hem - u * 2.3;
  }
  ctx.font = `700 11px ${A.SYS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 3; ctx.strokeStyle = A.PAL.ink; ctx.lineJoin = 'round';
  ctx.strokeText(p.name, x, top - 4); ctx.fillStyle = labelCol; ctx.fillText(p.name, x, top - 4);
  if (p.wasOpen && j.openSafe && G.t - p.openT < 2.6) {
    const k = G.t - p.openT; const sc = k < 0.18 ? 0.4 + k / 0.18 * 0.7 : k < 0.3 ? 1.1 - (k - 0.18) * 0.8 : 1; A.drawStamp(ctx, x, top - 34, 'Safe', fmt(j.openFallen) + ' m', clamp(2.6 - k, 0, 1), sc);
  }
}
function drawRuler(T) {
  const r = G.round, H = G.H; const x = 22, y0 = 76, y1 = H - 78; if (!r) return;
  ctx.save(); ctx.strokeStyle = A.PAL.gold; ctx.fillStyle = A.PAL.cream; ctx.lineWidth = 1.5; ctx.font = `10px ${A.SYS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  const step = r.h > 1200 ? 500 : r.h > 400 ? 100 : 50;
  for (let m = 0; m <= r.h; m += step) { const yy = y0 + (m / r.h) * (y1 - y0); ctx.beginPath(); ctx.moveTo(x - 4, yy); ctx.lineTo(x + 4, yy); ctx.stroke(); }
  for (let m = 0; m <= r.h; m += step * 2) { const yy = y0 + (m / r.h) * (y1 - y0); ctx.globalAlpha = 0.6; ctx.fillText(String(m), x + 7, yy); }
  ctx.globalAlpha = 1;
  const sl = y1 - (S.minSafeAlt(C.terminalSpeed) / r.h) * (y1 - y0);
  ctx.strokeStyle = A.PAL.green; ctx.beginPath(); ctx.moveTo(x - 9, sl); ctx.lineTo(x + 9, sl); ctx.stroke(); ctx.fillStyle = A.PAL.green; ctx.fillText('safe line', x + 11, sl - 7);
  for (const p of r.players) {
    const yy = y0 + clamp(p.j.fallen / r.h, 0, 1) * (y1 - y0);
    ctx.fillStyle = p.me ? A.PAL.orange : A.PAL.cream; ctx.strokeStyle = A.PAL.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + (p.me ? 13 : 10), yy - (p.me ? 5 : 3.5)); ctx.lineTo(x + (p.me ? 13 : 10), yy + (p.me ? 5 : 3.5)); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (p.me) { ctx.font = `700 10px ${A.SYS}`; ctx.fillStyle = A.PAL.orange; ctx.fillText(p.name, x + 17, yy); ctx.font = `10px ${A.SYS}`; }
  }
  ctx.restore();
}
function drawArrow(p) {
  const W = G.W, H = G.H; const x = sxOf(p.x), y = sy(p.j.y) - unit() * 2;
  if (y > -20 && y < H + 20 && x > 36 && x < W - 6) return;
  const ax = clamp(x, 56, W - 40), top = y < H / 2, ay = top ? 118 : H - 112;
  ctx.save(); ctx.translate(ax, ay); ctx.fillStyle = p.me ? A.PAL.orange : A.PAL.cream; ctx.strokeStyle = A.PAL.ink; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  const dx = x < 36 ? -1 : x > W - 6 ? 1 : 0, dy = y <= -20 ? -1 : y >= H + 20 ? 1 : 0; const ang = Math.atan2(dy, dx); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, -7); ctx.lineTo(-5, 7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.rotate(-ang);
  const label = `${p.name} ${fmt(Math.max(0, p.j.y))} m`; ctx.font = `700 10px ${A.SYS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3;
  const ty = top ? 16 : -16; ctx.strokeText(label, 0, ty); ctx.fillText(label, 0, ty); ctx.restore();
}

function drawEnding(T) {
  const r = G.round, W = G.W, H = G.H, n = r.players.length; const gy = H * 0.66;
  const sp = Math.min(W / (n + 0.6), 96), u = clamp(sp * 0.3, 9, 22);
  ctx.fillStyle = A.PAL.c1; drawGroundBack(gy, W, H);
  const xs = r.players.map((_, i) => W / 2 + (i - (n - 1) / 2) * sp);
  r.players.forEach((p, i) => {
    const x = xs[i];
    if (p.crashed) { A.drawFigure(ctx, { x, y: gy - u * 0.5, u, face: p.look.face, suit: p.look.suit, helmet: p.look.helmet, pose: A.poseFor('crash', 0), rot: Math.PI }); }
    else A.drawFigure(ctx, { x, y: gy - A.STAND_H * u, u, face: p.look.face, suit: p.look.suit, helmet: p.look.helmet, pose: A.poseFor(p.look.pose, T + i) });
  });
  ctx.fillStyle = A.PAL.c1; ctx.fillRect(0, gy, W, H - gy);
  ctx.strokeStyle = A.PAL.gold; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); ctx.stroke();
  const k = G.t;
  for (const d of G.dust) {
    const age = k - d.t0; if (age > 1.8) continue; const x = xs[d.i], a = clamp(1 - age / 1.8, 0, 1);
    const dir = Math.cos(d.a) * (d.i % 2 ? 1 : -1) * 0 + Math.cos(d.a * 2);
    ctx.globalAlpha = a * 0.7; ctx.fillStyle = A.PAL.cream; ctx.beginPath(); ctx.arc(x + dir * age * 40 * d.s, gy - Math.abs(Math.sin(d.a)) * age * 26 * d.s, d.r * (1 + age), 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  r.players.forEach((p, i) => {
    ctx.font = `700 11px ${A.SYS}`; ctx.lineWidth = 3; ctx.strokeStyle = A.PAL.ink; ctx.lineJoin = 'round';
    const y = gy + 20; ctx.strokeText(p.name, xs[i], y); ctx.fillStyle = p.me ? A.PAL.orange : A.PAL.cream; ctx.fillText(p.name, xs[i], y);
    ctx.font = `11px ${A.SYS}`; ctx.fillStyle = p.crashed ? '#d9604f' : A.PAL.green; ctx.fillText(p.crashed ? 'Crashed' : 'x' + p.out.mult.toFixed(2), xs[i], y + 15);
  });
}
function drawGroundBack(gy, W, H) { const off = 0; for (let k = 0; k < 7; k++) { const x = ((k * 173 + 40 + off) % (W + 160)) - 60; const s = 40 + (k % 3) * 14; if (k % 3 === 0) A.drawHouse(ctx, x, gy, s, 2); else A.drawTree(ctx, x, gy, s, 2); } }

function draw(T) {
  const W = G.W, H = G.H; ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  const r = G.round, ending = G.state === 'ending' || G.state === 'result';
  let close = 0.2;
  if (r && !ending) { let mn = 1e9; for (const p of r.players) if (!p.j.landed) mn = Math.min(mn, p.j.y); close = clamp(1 - mn / 800, 0, 1); } else if (ending) close = 1;
  drawSky(T); drawGlow(close);
  if (ending && r) { drawEnding(T); return; }
  if (!r) { // waiting scene: a diver on the ground
    const gy = H * 0.7; drawGround(gy);
    if (store.s) { const u = unit() * 1.4; const look = lookOf(equippedCfg()); A.drawFigure(ctx, { x: W / 2, y: gy - A.STAND_H * u, u, face: look.face, suit: look.suit, helmet: look.helmet, pose: A.poseFor(look.pose, T) }); }
    return;
  }
  const gy = sy(0);
  if (G.camAlt <= C.groundVisibleM) drawGround(gy);
  const pl = r.players.slice().sort((a, b) => (a.me ? 1 : 0) - (b.me ? 1 : 0));
  const top = sy(r.h);
  if (G.camAlt > r.h - 400) A.drawPlane(ctx, sxOf(0) - 60 + (G.t - r.t0) * 0, top - 20, unit() * 1.6, find('plane', store.s.equipped.plane).look, T, 2);
  for (const p of pl) {
    const y = sy(p.j.y) ; if (y < -140 || y > H + 140) continue;
    if (p.j.landed && G.camAlt > C.groundVisibleM) continue;
    drawPlayer(p, sxOf(p.x), y, T, p.me ? A.PAL.orange : A.PAL.cream);
  }
  drawRuler(T);
  for (const p of r.players) if (!p.j.landed) drawArrow(p);
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
    G.t += dt; G.endT -= dt; if (G.endT <= 0) showResults();
  } else if (G.state === 'result') G.t += dt;
  else { // idle
    G.t += dt;
  }
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
  step(55, 'Drawing the sky'); resize(); A.cloudSprites(); A.moon(ctx, 0, 0, 20);
  step(85, 'Loading your profile');
  G.balShown = store.balance;
  requestAnimationFrame(frame);
  step(100, 'Ready');
  setTimeout(() => show($('loading'), false), 150);
  if (!store.hasProfile) openStart(false);
  else { refreshAll(); if (store.claim) openClaim(); else toBet(); }
}
Object.assign(window.__ff, { doOpen, startRound, showResults, openSettings, openShop });
boot();
