// What a profile owns and wears, for every game. Catalogs are plain lists:
// { category: [{ id, name, price, ... }] }. The first item of a category is free and equipped by default.
// A game registers its own gear (register); the site items come from catalog.json.
export class Shop {
  constructor(profiles, wallet) {
    this.p = profiles; this.wallet = wallet; this.catalog = {}; this.previews = {}; this.lastUndo = null;
  }
  register(cats) { Object.assign(this.catalog, cats); this.sync(); }
  find(cat, id) { return (this.catalog[cat] || []).find((i) => i.id === id); }
  // Give the active profile every free item and a default for each category it is missing.
  sync() {
    const p = this.p.active; if (!p) return;
    for (const [cat, items] of Object.entries(this.catalog)) {
      for (const it of items) if (!it.price && !it.reward && !p.owned.includes(it.id)) p.owned.push(it.id);
      if (!p.equipped[cat] || !p.owned.includes(p.equipped[cat])) p.equipped[cat] = items[0].id;
    }
    this.p.save();
  }
  give(cat, id) { const p = this.p.active; if (!p.owned.includes(id)) p.owned.push(id); p.equipped[cat] = id; this.p.save(); }
  owns(id) { return this.p.has && this.p.active.owned.includes(id); }
  // What is worn now. A preview shows instead, for one round, without owning it.
  get(cat) { return this.previews[cat] || (this.p.has ? this.p.active.equipped[cat] : null); }
  worn(cat) { return this.p.has ? this.p.active.equipped[cat] : null; }
  all() { const o = {}; for (const c of Object.keys(this.catalog)) o[c] = this.get(c); return o; }
  need(it) { return Math.max(0, it.price - this.wallet.balance); }

  buy(cat, id) {
    const it = this.find(cat, id);
    if (!it || it.reward || this.owns(id)) return 'owned';
    if (this.wallet.balance < it.price) return 'poor';
    const prev = this.p.active.equipped[cat];
    this.wallet.spend(it.price);
    this.p.active.owned.push(id); this.p.active.equipped[cat] = id; this.p.save();
    this.lastUndo = { cat, id, price: it.price, prev };
    return 'ok';
  }
  undoBuy() {
    const u = this.lastUndo; if (!u || !this.owns(u.id)) return false;
    const p = this.p.active; p.owned = p.owned.filter((x) => x !== u.id); p.equipped[u.cat] = u.prev;
    this.wallet.add(u.price); this.lastUndo = null; this.p.save(); return true;
  }
  equip(cat, id) { if (!this.owns(id)) return false; this.p.active.equipped[cat] = id; delete this.previews[cat]; this.p.save(); return true; }
  preview(cat, id) { if (this.find(cat, id)) this.previews[cat] = id; }
  clearPreviews() { const had = Object.keys(this.previews).length > 0; this.previews = {}; return had; }
}
