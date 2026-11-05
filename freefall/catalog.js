// Everything for sale. First item in each category is free and owned from the start.
// sky: [top, horizon] colours and light settings for backgrounds.
export const CATALOG = {
  chute: [
    { id: 'chute_classic', name: 'Classic', price: 0 },
    { id: 'chute_crimson', name: 'Crimson', price: 2000 },
    { id: 'chute_sunburst', name: 'Sunburst', price: 4000 },
    { id: 'chute_checker', name: 'Checkerboard', price: 6000 },
    { id: 'chute_stars', name: 'Star Field', price: 12000 },
    { id: 'chute_rainbow', name: 'Rainbow', price: 18000 },
    { id: 'chute_gold', name: 'Solid Gold', price: 35000 },
    { id: 'chute_galaxy', name: 'Galaxy', price: 50000 },
  ],
  suit: [
    { id: 'suit_classic', name: 'Blue Classic', price: 0 },
    { id: 'suit_flame', name: 'Flame', price: 2500 },
    { id: 'suit_camo', name: 'Camo', price: 4000 },
    { id: 'suit_racing', name: 'Racer', price: 7000 },
    { id: 'suit_neon', name: 'Neon', price: 15000 },
    { id: 'suit_astro', name: 'Astronaut', price: 30000 },
  ],
  helmet: [
    { id: 'helmet_classic', name: 'Classic', price: 0 },
    { id: 'helmet_racer', name: 'Racer', price: 2000 },
    { id: 'helmet_visor', name: 'Cyber Visor', price: 6000 },
    { id: 'helmet_viking', name: 'Viking', price: 10000 },
    { id: 'helmet_dragon', name: 'Dragon', price: 22000 },
    { id: 'helmet_crown', name: 'Golden Crown', price: 45000 },
  ],
  plane: [
    { id: 'plane_classic', name: 'Skyhopper', price: 0 },
    { id: 'plane_redbaron', name: 'Red Baron', price: 3000 },
    { id: 'plane_camo', name: 'Bush Camo', price: 8000 },
    { id: 'plane_jet', name: 'Jet', price: 20000 },
    { id: 'plane_gold', name: 'Golden Plane', price: 50000 },
  ],
  trail: [
    { id: 'none', name: 'No trail', price: 0 },
    { id: 'trail_smoke', name: 'Smoke', price: 2000 },
    { id: 'trail_fire', name: 'Fire', price: 7000 },
    { id: 'trail_rainbow', name: 'Rainbow Rings', price: 16000 },
    { id: 'trail_stardust', name: 'Stardust', price: 28000 },
  ],
  bg: [
    { id: 'bg_day', name: 'Sunny Day', price: 0, sky: ['#4f9be8', '#cfe6f7'], fog: '#cfe6f7', light: 1.0 },
    { id: 'bg_dusk', name: 'Sunset', price: 3000, sky: ['#3b2a6b', '#ff9a5a'], fog: '#e0906a', light: 0.8 },
    { id: 'bg_night', name: 'Moonlit Night', price: 9000, sky: ['#050b1f', '#1b2a52'], fog: '#16224a', light: 0.45 },
    { id: 'bg_candy', name: 'Candy Sky', price: 14000, sky: ['#ff8fd0', '#ffe7f5'], fog: '#ffd6ee', light: 1.0 },
    { id: 'bg_aurora', name: 'Aurora', price: 26000, sky: ['#04122a', '#0f4a52'], fog: '#0c3a46', light: 0.6 },
    { id: 'bg_space', name: 'Edge of Space', price: 40000, sky: ['#000008', '#150c2e'], fog: '#150c2e', light: 0.55 },
  ],
};
export const CATEGORIES = [
  ['chute', 'Parachutes'], ['suit', 'Suits'], ['helmet', 'Helmets'], ['plane', 'Planes'], ['trail', 'Trails'], ['bg', 'Skies'],
];
export const find = (cat, id) => CATALOG[cat].find((i) => i.id === id);
