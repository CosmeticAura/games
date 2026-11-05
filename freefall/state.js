// Saved on the device (localStorage). Play tokens only, never real money.
import { CONFIG as C } from './config.js';
import { CATALOG, find } from './catalog.js';

const KEY = 'freefall.v2';
const OLD = 'freefall.v1';

export function nyDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function prevDay(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 86400000).toISOString().slice(0, 10);
}

export const ACH = [
  { id: 'first_win', name: 'First landing', desc: 'Win a round', test: (r) => r && r.win },
  { id: 'x10', name: 'Ten times', desc: 'Land with a 10x multiplier', test: (r) => r && r.win && r.mult >= 10 },
  { id: 'x25', name: 'Twenty five', desc: 'Land with a 25x multiplier', test: (r) => r && r.win && r.mult >= 25 },
  { id: 'low50', name: 'Close shave', desc: 'Open under 50 m and land safely', test: (r) => r && r.win && r.opened && r.openAlt < 50 },
  { id: 'streak5', name: 'Hot streak', desc: 'Win 5 rounds in a row', test: (r, s) => s.curWin >= 5 },
  { id: 'high', name: 'High roller', desc: 'Win with a bet of 5,000 or more', test: (r) => r && r.win && r.bet >= 5000 },
  { id: 'big', name: 'Big payout', desc: 'Win 100,000 in one round', test: (r) => r && r.win && r.payout >= 100000 },
  { id: 'tall', name: 'Long way down', desc: 'Land safely from over 2,000 m', test: (r) => r && r.win && r.h > 2000 },
  { id: 'shopper', name: 'Wardrobe', desc: 'Own 5 items you bought', test: (r, s) => s.owned.length - Object.keys(CATALOG).length >= 5 },
  { id: 'days3', name: 'Regular', desc: 'Come back 3 days in a row', test: (r, s) => s.streak >= 3 },
  { id: 'rounds50', name: 'Frequent flyer', desc: 'Play 50 rounds', test: (r, s) => s.best.rounds >= 50 },
];

function fresh(today) {
  const owned = []; const equipped = {};
  for (const cat of Object.keys(CATALOG)) { owned.push(CATALOG[cat][0].id); equipped[cat] = CATALOG[cat][0].id; }
  return {
    v: 2, balance: C.startTokens, lastBonus: today, streak: 1, owned, equipped, history: [], pending: 0, curWin: 0, ach: {},
    best: { mult: 0, payout: 0, winStreak: 0, rounds: 0, wins: 0, crashes: 0, lowOpen: null, tallest: 0 },
    settings: { reduce: null, sound: true, theme: 'system' },
  };
}

export class Store {
  constructor(storage = globalThis.localStorage, now = () => new Date()) {
    this.storage = storage; this.now = now; this.claim = null; this.abandoned = 0; this.lastUndo = null;
    const today = nyDate(now());
    let s = null;
    try { s = JSON.parse(storage.getItem(KEY)); } catch (e) { s = null; }
    if (!s || s.v !== 2) {
      let old = null;
      try { old = JSON.parse(storage.getItem(OLD)); } catch (e) { old = null; }
      s = fresh(today);
      if (old && typeof old.balance === 'number') {
        s.balance = old.balance; s.owned = old.owned || s.owned; s.equipped = { ...s.equipped, ...(old.equipped || {}) };
        s.lastBonus = old.lastBonus || today; s.streak = old.lastBonus === today ? 1 : 0;
        s.best.rounds = old.rounds || 0;
      }
    }
    if (!s.owned.includes('emote_wave')) s.owned.push('emote_wave');
    s.equipped = { emote: 'emote_wave', ...s.equipped };
    s.settings = { reduce: null, sound: true, theme: 'system', ...(s.settings || {}) };
    if (s.pending > 0) { this.abandoned = s.pending; s.pending = 0; s.curWin = 0; }
    this.s = s;
    if (s.lastBonus !== today) {
      const streak = s.lastBonus === prevDay(today) ? s.streak + 1 : 1;
      const extra = Math.min(C.streakExtraMax, Math.max(0, streak - 1) * C.streakExtra);
      this.claim = { bonus: C.dailyBonus, extra, streak, today };
    }
    this.save();
  }
  save() { try { this.storage.setItem(KEY, JSON.stringify(this.s)); } catch (e) { /* private mode */ } }
  get balance() { return this.s.balance; }
  claimBonus() {
    if (!this.claim) return 0;
    const c = this.claim; const total = c.bonus + c.extra;
    this.s.balance += total; this.s.lastBonus = c.today; this.s.streak = c.streak; this.claim = null; this.save();
    return total;
  }
  add(n) { this.s.balance = Math.max(0, Math.round(this.s.balance + n)); this.save(); }
  owns(id) { return this.s.owned.includes(id); }
  equipped(cat) { return this.s.equipped[cat]; }
  buy(cat, id) {
    const it = find(cat, id);
    if (!it || this.owns(id)) return 'owned';
    if (this.s.balance < it.price) return 'poor';
    this.lastUndo = { cat, id, price: it.price, prev: this.s.equipped[cat] };
    this.s.balance -= it.price; this.s.owned.push(id); this.s.equipped[cat] = id; this.save(); return 'ok';
  }
  undoBuy() {
    const u = this.lastUndo; if (!u || !this.owns(u.id)) return false;
    this.s.balance += u.price; this.s.owned = this.s.owned.filter((x) => x !== u.id); this.s.equipped[u.cat] = u.prev; this.lastUndo = null; this.save(); return true;
  }
  equip(cat, id) { if (!this.owns(id)) return false; this.s.equipped[cat] = id; this.save(); return true; }
  setting(k, v) { this.s.settings[k] = v; this.save(); }
  // bet leaves the balance when you jump; the result pays out when the round ends
  startRound(bet) { this.s.balance -= bet; this.s.pending = bet; this.save(); }
  finishRound(r) {
    // r: { h, bet, win, mult, payout, opened, openAlt, landSpeed }
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
