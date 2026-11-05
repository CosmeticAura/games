// Everything for sale. First item in each category is free and owned from the start.
// Colours come from ART.md (six hues only). `look` tells art.js how to draw the item.
export const CATALOG = {
  suit: [
    { id: 'suit_classic', name: 'Charcoal', price: 0, look: { c1: 'char', c2: 'cream' } },
    { id: 'suit_flame', name: 'Ember', price: 2500, look: { c1: 'orange', c2: 'red' } },
    { id: 'suit_camo', name: 'Moss', price: 4000, look: { c1: 'green', c2: 'char' } },
    { id: 'suit_racing', name: 'Racer', price: 7000, look: { c1: 'red', c2: 'cream' } },
    { id: 'suit_neon', name: 'Signal', price: 15000, look: { c1: 'gold', c2: 'ink' } },
    { id: 'suit_astro', name: 'Paper', price: 30000, look: { c1: 'cream', c2: 'ink' } },
  ],
  helmet: [
    { id: 'helmet_classic', name: 'Cap', price: 0, look: { kind: 'cap', c1: 'char' } },
    { id: 'helmet_racer', name: 'Racer', price: 2000, look: { kind: 'racer', c1: 'red' } },
    { id: 'helmet_visor', name: 'Goggles', price: 6000, look: { kind: 'goggles', c1: 'gold' } },
    { id: 'helmet_viking', name: 'Viking', price: 10000, look: { kind: 'horns', c1: 'cream' } },
    { id: 'helmet_dragon', name: 'Dragon', price: 22000, look: { kind: 'spikes', c1: 'green' } },
    { id: 'helmet_crown', name: 'Crown', price: 45000, look: { kind: 'crown', c1: 'gold' } },
  ],
  chute: [
    { id: 'chute_classic', name: 'Paper', price: 0, look: { pat: 'solid', c1: 'cream', c2: 'cream' } },
    { id: 'chute_crimson', name: 'Crimson', price: 2000, look: { pat: 'solid', c1: 'red', c2: 'red' } },
    { id: 'chute_sunburst', name: 'Sunburst', price: 4000, look: { pat: 'stripes', c1: 'orange', c2: 'cream' } },
    { id: 'chute_checker', name: 'Checker', price: 6000, look: { pat: 'checker', c1: 'cream', c2: 'char' } },
    { id: 'chute_stars', name: 'Star field', price: 12000, look: { pat: 'dots', c1: 'char', c2: 'gold' } },
    { id: 'chute_rainbow', name: 'Patchwork', price: 18000, look: { pat: 'patch', c1: 'red', c2: 'green' } },
    { id: 'chute_gold', name: 'Gold leaf', price: 35000, look: { pat: 'solid', c1: 'gold', c2: 'gold' } },
    { id: 'chute_galaxy', name: 'Night', price: 50000, look: { pat: 'dots', c1: 'ink', c2: 'cream' } },
  ],
  trail: [
    { id: 'none', name: 'None', price: 0, look: { kind: 'none' } },
    { id: 'trail_smoke', name: 'Smoke', price: 2000, look: { kind: 'smoke', c1: 'cream' } },
    { id: 'trail_fire', name: 'Embers', price: 7000, look: { kind: 'fire', c1: 'orange' } },
    { id: 'trail_rainbow', name: 'Rings', price: 16000, look: { kind: 'rings', c1: 'gold' } },
    { id: 'trail_stardust', name: 'Stardust', price: 28000, look: { kind: 'dust', c1: 'cream' } },
  ],
  emote: [
    { id: 'emote_wave', name: 'Wave', price: 0, look: { pose: 'wave' } },
    { id: 'emote_salute', name: 'Salute', price: 2000, look: { pose: 'salute' } },
    { id: 'emote_sit', name: 'Sit down', price: 3500, look: { pose: 'sit' } },
    { id: 'emote_pump', name: 'Fist pump', price: 5000, look: { pose: 'pump' } },
    { id: 'emote_dab', name: 'Dab', price: 8000, look: { pose: 'dab' } },
    { id: 'emote_flex', name: 'Flex', price: 12000, look: { pose: 'flex' } },
    { id: 'emote_dance', name: 'Dance', price: 17000, look: { pose: 'dance' } },
    { id: 'emote_flip', name: 'Backflip', price: 25000, look: { pose: 'flip' } },
  ],
  plane: [
    { id: 'plane_classic', name: 'Skyhopper', price: 0, look: { kind: 'prop', c1: 'cream' } },
    { id: 'plane_redbaron', name: 'Red Baron', price: 3000, look: { kind: 'prop', c1: 'red' } },
    { id: 'plane_camo', name: 'Bush', price: 8000, look: { kind: 'prop', c1: 'green' } },
    { id: 'plane_jet', name: 'Jet', price: 20000, look: { kind: 'jet', c1: 'char' } },
    { id: 'plane_gold', name: 'Gold plane', price: 50000, look: { kind: 'prop', c1: 'gold' } },
  ],
};
export const CATEGORIES = [
  ['suit', 'Suits'], ['helmet', 'Helmets'], ['chute', 'Parasols'], ['emote', 'Emotes'], ['trail', 'Trails'], ['plane', 'Planes'],
];
export const find = (cat, id) => CATALOG[cat].find((i) => i.id === id);
export const POSES = CATALOG.emote.map((e) => e.look.pose);
