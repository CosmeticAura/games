// Freefall's own save layer. Accounts, tokens and the shop live in ../shared (one profile and one wallet
// for the whole casino, keys casino.v1.*). Here: this game's stats, history and achievements, plus a
// facade so the page can ask the store one thing and not three.
import { CONFIG as C } from './config.js';
import { CATALOG } from './catalog.js';
import { Profiles, nameOk, nyDate, prevDay, KEYS } from '../shared/profile.js';
import { Wallet } from '../shared/wallet.js';
import { Shop } from '../shared/shop.js';
export { nameOk, nyDate, prevDay };

export const KEY = KEYS.profiles;
const GAME = 'freefall';

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

const freshGame = () => ({
  pending: 0, curWin: 0, bought: 0, ach: {}, history: [], lastH: null,
  best: { mult: 0, payout: 0, winStreak: 0, rounds: 0, wins: 0, crashes: 0, lowOpen: null, tallest: 0 },
});

export class Store {
  constructor(storage = globalThis.localStorage, now = () => new Date()) {
    this.profiles = new Profiles(storage, { avatarCount: C.avatarCount, now });
    this.wallet = new Wallet(this.profiles);
    this.shop = new Shop(this.profiles, this.wallet);
    this.shop.register(CATALOG);
    this.welcome = 0; this.abandoned = 0; this.ups = []; this.lastUndo = null;
    if (this.profiles.has) this.enter();
  }
  // site-wide items (themes and pieces) come from shared/catalog.json
  addSite(json) { this.shop.register(json.categories); this.siteLabels = json.labels; }

  get g() { return this.profiles.settings; }
  setGlobal(k, v) { this.profiles.set(k, v); }
  get hasProfile() { return this.profiles.has; }
  get balance() { return this.wallet.balance; }
  get name() { return this.profiles.has ? this.profiles.active.name : ''; }
  get claim() { return this.wallet.claim; }
  get level() { return this.wallet.level; }
  get minBet() { return this.wallet.minBet; }
  get maxBet() { return this.wallet.maxBet; }
  get root() { return this.profiles.root; }
  gd() {
    const g = this.profiles.game(GAME), f = freshGame();
    for (const k of Object.keys(f)) if (g[k] === undefined) g[k] = f[k];
    return g;
  }
  saveAll() { this.profiles.save(); this.profiles.saveGame(GAME); }
  // a view of the active player for the page: reads stay current, nested objects are the real ones
  get s() {
    const p = this.profiles.active; if (!p) return null; const g = this.gd();
    return { id: p.id, name: p.name, avatar: p.avatar, balance: p.wallet.balance, streak: p.wallet.streak, equipped: this.shop.all(),
      best: g.best, history: g.history, ach: g.ach, lastH: g.lastH, bought: g.bought, curWin: g.curWin };
  }

  enter() {
    this.abandoned = 0; this.ups = [];
    const g = this.gd();
    if (g.pending > 0) { this.abandoned = g.pending; g.pending = 0; g.curWin = 0; }
    this.shop.sync(); this.wallet.refresh(); this.saveAll();
    return true;
  }
  // ---- profiles ----
  list() { return this.profiles.list(); }
  createProfile(name, avatar, suit) {
    const r = this.profiles.create(name, avatar); if (r !== 'ok') return r;
    this.shop.sync(); if (suit) this.shop.give('suit', suit);
    this.welcome = this.wallet.welcome(); this.abandoned = 0; this.ups = []; this.gd(); this.saveAll();
    return 'ok';
  }
  switchTo(id) { if (!this.profiles.switchTo(id)) return false; this.welcome = 0; this.shop.clearPreviews(); return this.enter(); }
  rename(name) { return this.profiles.rename(name); }
  setAvatar(i) { this.profiles.setAvatar(i); }

  // ---- tokens ----
  claimBonus() { return this.wallet.claimBonus(); }
  add(n) { this.wallet.add(n); }
  rescue() { return this.wallet.secondWind(); }
  windState() { return this.wallet.windState(); }

  // ---- gear and interface ----
  owns(id) { return this.shop.owns(id); }
  equipped(cat) { return this.shop.worn(cat); }
  buy(cat, id) { const r = this.shop.buy(cat, id); if (r === 'ok') { this.gd().bought++; this.saveAll(); } return r; }
  undoBuy() { const ok = this.shop.undoBuy(); if (ok) { this.gd().bought--; this.saveAll(); } return ok; }
  equip(cat, id) { return this.shop.equip(cat, id); }

  // ---- rounds ----
  // the bet leaves the balance when you jump and is saved on the spot
  startRound(bet, h) {
    const g = this.gd(); this.wallet.spend(bet); g.pending = bet; g.lastH = h;
    this.ups = this.wallet.wager(bet); this.saveAll();
  }
  finishRound(r) {
    const g = this.gd(), b = g.best;
    this.wallet.add(r.payout); g.pending = 0; b.rounds++;
    if (r.win) {
      b.wins++; g.curWin++; b.winStreak = Math.max(b.winStreak, g.curWin);
      b.mult = Math.max(b.mult, r.mult); b.payout = Math.max(b.payout, r.payout); b.tallest = Math.max(b.tallest, r.h);
      if (r.opened && (b.lowOpen === null || r.openAlt < b.lowOpen)) b.lowOpen = r.openAlt;
    } else { b.crashes++; g.curWin = 0; }
    g.history.unshift({ h: r.h, win: !!r.win, mult: r.mult });
    g.history.length = Math.min(g.history.length, C.historyLen);
    this.saveAll();
    return this.checkAch(r);
  }
  checkAch(r = null) {
    const out = [], g = this.gd();
    for (const a of ACH) {
      if (g.ach[a.id]) continue;
      if (a.test(r, this.s)) { g.ach[a.id] = this.profiles.now().getTime(); out.push(a); }
    }
    if (out.length) this.saveAll();
    return out;
  }
}
