// Accounts for the whole casino. Saved on this device only, no email, no password.
// Every game on the site shares these keys (same origin), so a profile made in one game exists in all of them.
export const KEYS = { profiles: 'casino.v1.profiles', settings: 'casino.v1.settings', game: 'casino.v1.game.' };
const OLD_KEYS = ['freefall.v1', 'freefall.v2', 'freefall.v4'];
export const NAME_MIN = 3, NAME_MAX = 16;
const NAME_RE = new RegExp(`^[A-Za-z0-9_]{${NAME_MIN},${NAME_MAX}}$`);
export const nameOk = (n) => NAME_RE.test(n || '');

export function nyDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function prevDay(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 86400000).toISOString().slice(0, 10);
}

export class Profiles {
  constructor(storage = globalThis.localStorage, { avatarCount = 12, now = () => new Date() } = {}) {
    this.storage = storage; this.avatarCount = avatarCount; this.now = now;
    for (const k of OLD_KEYS) { try { storage.removeItem(k); } catch (e) { /* ignore */ } }
    let root = null;
    try { root = JSON.parse(storage.getItem(KEYS.profiles)); } catch (e) { root = null; }
    if (!root || root.v !== 1 || typeof root.profiles !== 'object') root = { v: 1, active: null, profiles: {} };
    this.root = root;
    let st = null;
    try { st = JSON.parse(storage.getItem(KEYS.settings)); } catch (e) { st = null; }
    this.settings = { volume: 0.7, muted: false, ...(st || {}) };
    if (!root.profiles[root.active]) root.active = null;
    this.games = {};
    this.save();
  }
  save() {
    try {
      this.storage.setItem(KEYS.profiles, JSON.stringify(this.root));
      this.storage.setItem(KEYS.settings, JSON.stringify(this.settings));
    } catch (e) { /* private mode: play on, nothing saved */ }
  }
  get active() { return this.root.active ? this.root.profiles[this.root.active] : null; }
  get has() { return !!this.active; }
  list() { return Object.values(this.root.profiles).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, balance: p.wallet.balance })); }
  nameTaken(name, exceptId = null) {
    return Object.values(this.root.profiles).some((p) => p.id !== exceptId && p.name.toLowerCase() === name.toLowerCase());
  }
  // returns 'ok', 'bad' or 'taken'. The wallet and shop fill in their own parts afterwards.
  create(name, avatar) {
    name = (name || '').trim();
    if (!nameOk(name)) return 'bad';
    if (this.nameTaken(name)) return 'taken';
    const id = 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    this.root.profiles[id] = {
      id, name, avatar: ((avatar | 0) % this.avatarCount + this.avatarCount) % this.avatarCount,
      created: this.now().getTime(),
      wallet: { balance: 0, lastBonus: '', streak: 0, xp: 0, level: 1, lastWind: 0 },
      owned: [], equipped: {},
    };
    this.root.active = id; this.save();
    return 'ok';
  }
  switchTo(id) { if (!this.root.profiles[id]) return false; this.root.active = id; this.save(); return true; }
  rename(name) {
    name = (name || '').trim(); const p = this.active;
    if (!p || !nameOk(name)) return 'bad';
    if (this.nameTaken(name, p.id)) return 'taken';
    p.name = name; this.save(); return 'ok';
  }
  setAvatar(i) { const p = this.active; if (p) { p.avatar = ((i | 0) % this.avatarCount + this.avatarCount) % this.avatarCount; this.save(); } }
  set(key, value) { this.settings[key] = value; this.save(); }
  // Per-game data for the active profile (stats, history). Saved by saveGame().
  game(name) {
    const p = this.active; if (!p) return null;
    const k = KEYS.game + name + '.' + p.id;
    if (!this.games[k]) {
      let d = null; try { d = JSON.parse(this.storage.getItem(k)); } catch (e) { d = null; }
      this.games[k] = d || {};
    }
    return this.games[k];
  }
  saveGame(name) {
    const p = this.active; if (!p) return;
    const k = KEYS.game + name + '.' + p.id;
    try { this.storage.setItem(k, JSON.stringify(this.games[k] || {})); } catch (e) { /* ignore */ }
  }
}
