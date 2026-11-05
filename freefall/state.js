// Saved on the device (localStorage), one profile per player. Play tokens only, never real money.
// Every change is written to storage on the spot, not when the tab closes.
import { CONFIG as C } from './config.js';
import { CATALOG } from './catalog.js';

export const KEY = 'freefall.v4';          // new key: v1 and v2 balances, purchases and history are gone
const OLD_KEYS = ['freefall.v1', 'freefall.v2'];

export function nyDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function prevDay(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 86400000).toISOString().slice(0, 10);
}
const NAME_RE = new RegExp(`^[A-Za-z0-9_]{${C.nameMin},${C.nameMax}}$`);
export const nameOk = (n) => NAME_RE.test(n || '');

export const ACH = [
  { id: 'first_win', name: 'First landing', desc: 'Win a round', test: (r) => r && r.win },
  { id: 'x2', name: 'Doubled', desc: 'Land with a 2x multiplier', test: (r) => r && r.win && r.mult >= 2 },
  { id: 'x10', name: 'Ten times', desc: 'Land with a 10x multiplier', test: (r) => r && r.win && r.mult >= 10 },
  { id: 'x25', name: 'Twenty five', desc: 'Land with a 25x multiplier', test: (r) => r && r.win && r.mult >= 25 },
  { id: 'low50', name: 'Close shave', desc: 'Open under 50 m and land safely', test: (r) => r && r.win && r.opened && r.openAlt < 50 },
  { id: 'streak5', name: 'Hot streak', desc: 'Win 5 rounds in a row', test: (r, s) => s.curWin >= 5 },
  { id: 'high', name: 'High roller', desc: 'Win with a bet of 5,000 or more', test: (r) => r && r.win && r.bet >= 5000 },
  { id: 'big', name: 'Big payout', desc: 'Win 100,000 in one round', test: (r) => r && r.win && r.payout >= 100000 },
  { id: 'tall', name: 'Long way down', desc: 'Land safely from over 2,000 m', test: (r) => r && r.win && r.h > 2000 },
  { id: 'shopper', name: 'Wardrobe', desc: 'Buy 5 items', test: (r, s) => s.bought >= 5 },
  { id: 'days3', name: 'Regular', desc: 'Come back 3 days in a row', test: (r, s) => s.streak >= 3 },
  { id: 'rounds50', name: 'Frequent flyer', desc: 'Play 50 rounds', test: (r, s) => s.best.rounds >= 50 },
];

function freshProfile(id, name, avatar, suit) {
  const owned = []; const equipped = {};
  for (const cat of Object.keys(CATALOG)) { owned.push(CATALOG[cat][0].id); equipped[cat] = CATALOG[cat][0].id; }
  if (suit && !owned.includes(suit)) owned.push(suit);
  if (suit) equipped.suit = suit;
  return {
    id, name, avatar, balance: 0, lastBonus: '', streak: 0, owned, equipped, history: [], pending: 0, curWin: 0, bought: 0, ach: {}, lastH: null,
    best: { mult: 0, payout: 0, winStreak: 0, rounds: 0, wins: 0, crashes: 0, lowOpen: null, tallest: 0 },
  };
}

export class Store {
  constructor(storage = globalThis.localStorage, now = () => new Date()) {
    this.storage = storage; this.now = now;
    this.claim = null; this.welcome = 0; this.abandoned = 0; this.lastUndo = null; this.s = null;
    for (const k of OLD_KEYS) { try { storage.removeItem(k); } catch (e) { /* ignore */ } }
    let root = null;
    try { root = JSON.parse(storage.getItem(KEY)); } catch (e) { root = null; }
    if (!root || root.v !== 4 || typeof root.profiles !== 'object') root = { v: 4, active: null, profiles: {}, g: {} };
    root.g = { reduce: null, volume: C.defaultVolume, muted: false, ...(root.g || {}) };
    this.root = root;
    if (root.active && root.profiles[root.active]) this.enter(root.active);
    this.save();
  }
  get g() { return this.root.g; }
  get hasProfile() { return !!this.s; }
  get balance() { return this.s ? this.s.balance : 0; }
  get name() { return this.s ? this.s.name : ''; }

  save() { try { this.storage.setItem(KEY, JSON.stringify(this.root)); } catch (e) { /* private mode */ } }

  enter(id) {
    const s = this.root.profiles[id]; if (!s) return false;
    s.equipped = { ...s.equipped }; this.claim = null; this.abandoned = 0;
    if (s.pending > 0) { this.abandoned = s.pending; s.pending = 0; s.curWin = 0; }
    this.s = s; this.root.active = id;
    const today = nyDate(this.now());
    if (s.lastBonus && s.lastBonus !== today) {
      const streak = s.lastBonus === prevDay(today) ? s.streak + 1 : 1;
      const extra = Math.min(C.streakExtraMax, Math.max(0, streak - 1) * C.streakExtra);
      this.claim = { bonus: C.dailyBonus, extra, streak, today };
    }
    this.save();
    return true;
  }

  // ---- profiles ----
  profiles() { return Object.values(this.root.profiles).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, balance: p.balance })); }
  nameTaken(name, exceptId = null) {
    return Object.values(this.root.profiles).some((p) => p.id !== exceptId && p.name.toLowerCase() === name.toLowerCase());
  }
  createProfile(name, avatar, suit) {
    name = (name || '').trim();
    if (!nameOk(name)) return 'bad';
    if (this.nameTaken(name)) return 'taken';
    const id = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    const p = freshProfile(id, name, ((avatar | 0) % C.avatarCount + C.avatarCount) % C.avatarCount, suit);
    const today = nyDate(this.now());
    p.balance = C.dailyBonus; p.lastBonus = today; p.streak = 1;     // the day's claim, right away
    this.root.profiles[id] = p; this.root.active = id; this.s = p;
    this.claim = null; this.abandoned = 0; this.welcome = C.dailyBonus;
    this.save();
    return 'ok';
  }
  switchTo(id) { if (!this.root.profiles[id]) return false; this.welcome = 0; return this.enter(id); }
  rename(name) {
    name = (name || '').trim();
    if (!this.s || !nameOk(name)) return 'bad';
    if (this.nameTaken(name, this.s.id)) return 'taken';
    this.s.name = name; this.save(); return 'ok';
  }
  setAvatar(i) { if (this.s) { this.s.avatar = ((i | 0) % C.avatarCount + C.avatarCount) % C.avatarCount; this.save(); } }
  setGlobal(k, v) { this.root.g[k] = v; this.save(); }

  // ---- tokens ----
  claimBonus() {
    if (!this.claim) return 0;
    const c = this.claim; const total = c.bonus + c.extra;
    this.s.balance += total; this.s.lastBonus = c.today; this.s.streak = c.streak; this.claim = null; this.save();
    return total;
  }
  add(n) { this.s.balance = Math.max(0, Math.round(this.s.balance + n)); this.save(); }
  rescue() { if (this.s.balance < C.minBet) { this.s.balance += C.rescueTokens; this.save(); return C.rescueTokens; } return 0; }

  // ---- gear ----
  owns(id) { return this.s.owned.includes(id); }
  equipped(cat) { return this.s.equipped[cat]; }
  buy(cat, id) {
    const it = CATALOG[cat].find((i) => i.id === id);
    if (!it || this.owns(id)) return 'owned';
    if (this.s.balance < it.price) return 'poor';
    this.lastUndo = { cat, id, price: it.price, prev: this.s.equipped[cat] };
    this.s.balance -= it.price; this.s.owned.push(id); this.s.equipped[cat] = id; this.s.bought++; this.save(); return 'ok';
  }
  undoBuy() {
    const u = this.lastUndo; if (!u || !this.owns(u.id)) return false;
    this.s.balance += u.price; this.s.owned = this.s.owned.filter((x) => x !== u.id); this.s.equipped[u.cat] = u.prev; this.s.bought--; this.lastUndo = null; this.save(); return true;
  }
  equip(cat, id) { if (!this.owns(id)) return false; this.s.equipped[cat] = id; this.save(); return true; }

  // ---- rounds ----
  // the bet leaves the balance when you jump and is saved on the spot
  startRound(bet, h) { this.s.balance -= bet; this.s.pending = bet; this.s.lastH = h; this.save(); }
  finishRound(r) {
    const s = this.s, b = s.best;
    s.balance += r.payout; s.pending = 0;
    b.rounds++;
    if (r.win) {
      b.wins++; s.curWin++; b.winStreak = Math.max(b.winStreak, s.curWin);
      b.mult = Math.max(b.mult, r.mult); b.payout = Math.max(b.payout, r.payout); b.tallest = Math.max(b.tallest, r.h);
      if (r.opened && (b.lowOpen === null || r.openAlt < b.lowOpen)) b.lowOpen = r.openAlt;
    } else { b.crashes++; s.curWin = 0; }
    s.history.unshift({ h: r.h, win: !!r.win, mult: r.mult });
    s.history.length = Math.min(s.history.length, C.historyLen);
    this.save();
    return this.checkAch(r);
  }
  checkAch(r = null) {
    const out = [];
    for (const a of ACH) {
      if (this.s.ach[a.id]) continue;
      if (a.test(r, this.s)) { this.s.ach[a.id] = this.now().getTime(); out.push(a); }
    }
    if (out.length) this.save();
    return out;
  }
}
