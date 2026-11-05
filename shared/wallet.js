// Tokens for the whole casino. Play tokens only: they can't be bought with money or cashed out.
// Numbers come from ECONOMY.md. Change them here, not in a game.
import { nyDate, prevDay } from './profile.js';

export const ECON = {
  dailyBonus: 10000,
  streakStep: 1000, streakMax: 7000,        // extra per day in a row, and its ceiling
  windAmount: 2500, windBelow: 500, windEveryMs: 4 * 3600 * 1000,
  minBet: 100,
  tokensPerXp: 100,
  levelXp: (n) => Math.round(1000 * Math.pow(n, 1.5)),   // total XP to reach level n (n >= 2)
  levelReward: (n) => 2000 * n,
  maxBetByLevel: [[20, 250000], [10, 50000], [5, 10000], [1, 2500]],   // [from level, max bet]
};

export class Wallet {
  constructor(profiles, econ = ECON) { this.p = profiles; this.E = econ; this.claim = null; }
  get w() { return this.p.active.wallet; }
  get balance() { return this.p.has ? this.w.balance : 0; }
  get level() { return this.p.has ? this.w.level : 1; }
  get minBet() { return this.E.minBet; }
  get maxBet() { const l = this.level; return this.E.maxBetByLevel.find(([from]) => l >= from)[1]; }

  // New profile: starts at 0 and gets the day's claim right away.
  welcome() {
    const w = this.w; w.balance = this.E.dailyBonus; w.lastBonus = nyDate(this.p.now()); w.streak = 1; w.xp = 0; w.level = 1; w.lastWind = 0;
    this.claim = null; this.p.save(); return this.E.dailyBonus;
  }
  // Call after a profile is entered. Sets this.claim when a new day's claim is waiting.
  refresh() {
    this.claim = null; if (!this.p.has) return null;
    const w = this.w, today = nyDate(this.p.now());
    if (w.lastBonus !== today) {
      const streak = w.lastBonus === prevDay(today) ? w.streak + 1 : 1;
      const extra = Math.min(this.E.streakMax, Math.max(0, streak - 1) * this.E.streakStep);
      this.claim = { bonus: this.E.dailyBonus, extra, streak, today };
    }
    return this.claim;
  }
  claimBonus() {
    const c = this.claim; if (!c) return 0;
    const total = c.bonus + c.extra, w = this.w;
    w.balance += total; w.lastBonus = c.today; w.streak = c.streak; this.claim = null; this.p.save();
    return total;
  }
  add(n) { const w = this.w; w.balance = Math.max(0, Math.round(w.balance + n)); this.p.save(); }
  // Takes tokens. Returns false (and changes nothing) when there are not enough.
  spend(n) { const w = this.w; if (n > w.balance) return false; w.balance -= n; this.p.save(); return true; }

  // Second wind: when under windBelow, once every windEveryMs.
  windState() {
    const w = this.w, since = this.p.now().getTime() - (w.lastWind || 0);
    if (w.balance >= this.E.windBelow) return { ok: false, why: 'rich', waitMs: 0 };
    if (since < this.E.windEveryMs) return { ok: false, why: 'wait', waitMs: this.E.windEveryMs - since };
    return { ok: true, why: '', waitMs: 0 };
  }
  secondWind() {
    if (!this.windState().ok) return 0;
    const w = this.w; w.balance += this.E.windAmount; w.lastWind = this.p.now().getTime(); this.p.save(); return this.E.windAmount;
  }

  // XP: 1 per tokensPerXp wagered. Returns the levels reached, each paid its token reward.
  wager(bet) {
    const w = this.w; w.xp += bet / this.E.tokensPerXp; const ups = [];
    while (w.xp >= this.E.levelXp(w.level + 1)) { w.level++; const reward = this.E.levelReward(w.level); w.balance += reward; ups.push({ level: w.level, reward }); }
    this.p.save(); return ups;
  }
}
