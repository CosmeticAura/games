// The whole look of the casino. Colours, fonts, sky, weather, altimeter, number style, trim and sounds
// all come from here, so swapping a theme restyles every game. Prices are in catalog.json.
// An item id is "<category>_<value>". The value "auto" means "use what the theme itself picks".

const base = { ink: '#0d0e11', cream: '#e8dcc3', green: '#58a368', lose: '#d9604f' };
const mk = (o) => ({ ...base, ...o });

export const THEMES = {
  ink: {
    name: 'Ink night',
    c: mk({ c0: '#14161a', c1: '#1c1f24', c2: '#2a2d34', gold: '#c9a24a', orange: '#e8873a', red: '#a3281f', redDeep: '#6e1612' }),
    sky: ['#0d0e11', '#14161a', '#1c1f24'], ground: '#1c1f24', accent: '#e8873a',
    disp: "'Kaushan Script', 'Brush Script MT', cursive",
    defaults: { weather: 'rain', sky: 'moon', glow: 'red', altimeter: 'ruler', numstyle: 'brush', trim: 'gold', stamp: 'seal' },
  },
  cockpit: {
    name: 'Cockpit dusk',
    c: mk({ c0: '#0c1a2e', c1: '#122640', c2: '#1d3a5e', gold: '#e0a03a', orange: '#ffb347', red: '#c0452b', redDeep: '#6b2a1a', cream: '#f1e3c0' }),
    sky: ['#09131f', '#0f2238', '#1a3a5c'], ground: '#122640', accent: '#ffb347',
    disp: 'ui-monospace, Menlo, Consolas, monospace', ticket: 'tear',
    defaults: { weather: 'none', sky: 'none', glow: 'amber', altimeter: 'tape', numstyle: 'mono', trim: 'gold', stamp: 'seal' },
  },
  print: {
    name: 'Two-ink print',
    c: mk({ c0: '#15207a', c1: '#1b2a96', c2: '#2a3cb0', gold: '#f4d03f', orange: '#f4d03f', red: '#f4d03f', redDeep: '#c9a512', cream: '#f6efd6', green: '#f4d03f', lose: '#f6efd6' }),
    sky: ['#101a66', '#15207a', '#1b2a96'], ground: '#1b2a96', accent: '#f4d03f', dots: true,
    disp: "Georgia, 'Times New Roman', serif",
    defaults: { weather: 'none', sky: 'sun', glow: 'amber', altimeter: 'ruler', numstyle: 'block', trim: 'gold', stamp: 'seal' },
  },
  snow: {
    name: 'Snow peak',
    c: mk({ c0: '#243349', c1: '#34475f', c2: '#4c627d', gold: '#cfd9e6', orange: '#ffbf80', red: '#6fa0d6', redDeep: '#3b5f8a', cream: '#f4f7fb' }),
    sky: ['#1b2840', '#35506f', '#6e8bab'], ground: '#8fa6bd', accent: '#ffcf99',
    disp: 'ui-rounded, -apple-system, sans-serif',
    defaults: { weather: 'snow', sky: 'moon', glow: 'blue', altimeter: 'ruler', numstyle: 'mono', trim: 'silver', stamp: 'seal' },
  },
  desert: {
    name: 'Desert noon',
    c: mk({ c0: '#3a2210', c1: '#52331a', c2: '#6e4724', gold: '#f0c36a', orange: '#fff1c2', red: '#c8542a', redDeep: '#7d2f14', cream: '#fff3da' }),
    sky: ['#5a3418', '#a65f2b', '#d9954a'], ground: '#6b3f1f', accent: '#fff1c2',
    disp: "Georgia, 'Times New Roman', serif",
    defaults: { weather: 'none', sky: 'sun', glow: 'amber', altimeter: 'ruler', numstyle: 'block', trim: 'gold', stamp: 'seal' },
  },
  harbor: {
    name: 'Harbor fog',
    c: mk({ c0: '#1b2427', c1: '#26333a', c2: '#37474f', gold: '#b8c7cc', orange: '#f2b27a', red: '#7aa5b0', redDeep: '#41616b', cream: '#e6eef0' }),
    sky: ['#161e21', '#2a3a40', '#53676e'], ground: '#37474f', accent: '#f2b27a',
    disp: "Georgia, 'Times New Roman', serif",
    defaults: { weather: 'rain', sky: 'none', glow: 'blue', altimeter: 'ruler', numstyle: 'mono', trim: 'silver', stamp: 'seal' },
  },
  temple: {
    name: 'Autumn temple',
    c: mk({ c0: '#2a1510', c1: '#3b1f17', c2: '#573026', gold: '#d9a441', orange: '#ff9a3c', red: '#b8321f', redDeep: '#6e1d12', cream: '#f0dcbf' }),
    sky: ['#1d0f0b', '#3b1f17', '#6e3a22'], ground: '#3b1f17', accent: '#ff9a3c',
    disp: "'Kaushan Script', 'Brush Script MT', cursive",
    defaults: { weather: 'ash', sky: 'moon', glow: 'amber', altimeter: 'ruler', numstyle: 'brush', trim: 'lacquer', stamp: 'seal' },
  },
  deepsea: {
    name: 'Deep sea',
    c: mk({ c0: '#06161c', c1: '#0b232d', c2: '#133846', gold: '#5fd0c0', orange: '#8ff0d8', red: '#2b8f9a', redDeep: '#10505a', cream: '#d8f3ef' }),
    sky: ['#041015', '#08222b', '#0e3a48'], ground: '#0b232d', accent: '#8ff0d8',
    disp: 'ui-rounded, -apple-system, sans-serif',
    defaults: { weather: 'fireflies', sky: 'none', glow: 'jade', altimeter: 'dial', numstyle: 'mono', trim: 'jade', stamp: 'seal' },
  },
  lantern: {
    name: 'Lantern festival',
    c: mk({ c0: '#1a0f1f', c1: '#2a1730', c2: '#42244a', gold: '#f2b84b', orange: '#ff8a3d', red: '#d63b3b', redDeep: '#7a1c2a', cream: '#f7e6c8' }),
    sky: ['#12091a', '#241231', '#4a2152'], ground: '#2a1730', accent: '#ff8a3d',
    disp: "'Kaushan Script', 'Brush Script MT', cursive",
    defaults: { weather: 'fireflies', sky: 'moon', glow: 'amber', altimeter: 'ruler', numstyle: 'brush', trim: 'gold', stamp: 'seal' },
  },
  storm: {
    name: 'Storm',
    c: mk({ c0: '#0b0d12', c1: '#141a24', c2: '#222c3b', gold: '#9fb4cc', orange: '#a8d0ff', red: '#5a7fb0', redDeep: '#2a3f5c', cream: '#e4ecf7' }),
    sky: ['#07090d', '#141b27', '#2a3648'], ground: '#141a24', accent: '#a8d0ff', flash: true,
    disp: 'ui-rounded, -apple-system, sans-serif',
    defaults: { weather: 'rain', sky: 'none', glow: 'blue', altimeter: 'ruler', numstyle: 'block', trim: 'silver', stamp: 'seal' },
  },
  golden: {
    name: 'Golden hour',
    c: mk({ c0: '#2b1a08', c1: '#3f2810', c2: '#5c3c18', gold: '#ffd36a', orange: '#fff0b8', red: '#d9842a', redDeep: '#7a4410', cream: '#fff6dc' }),
    sky: ['#3a2208', '#8a5316', '#e0a040'], ground: '#5c3c18', accent: '#fff0b8',
    disp: "'Kaushan Script', 'Brush Script MT', cursive",
    defaults: { weather: 'fireflies', sky: 'sun', glow: 'amber', altimeter: 'tape', numstyle: 'brush', trim: 'gold', stamp: 'seal' },
  },
};

export const GLOWS = { red: ['#a3281f', '#6e1612'], amber: ['#d9922b', '#7a4d12'], jade: ['#2f9e7a', '#145040'], blue: ['#3f78c4', '#1c3d6e'], white: ['#e8eef5', '#7b8794'] };
export const TRIMS = { gold: '#c9a24a', jade: '#4fb08c', silver: '#c3ccd6', lacquer: '#c0392b', iron: '#6b7078' };
export const NUMBERS = {
  brush: { font: "'Kaushan Script', 'Brush Script MT', cursive", weight: 400 },
  mono: { font: 'ui-monospace, Menlo, Consolas, monospace', weight: 700 },
  block: { font: "Impact, 'Arial Black', sans-serif", weight: 400 },
};
export const SOUND_PACKS = { classic: { gain: 1, wave: 'sine' }, quiet: { gain: 0.45, wave: 'sine' }, arcade: { gain: 0.5, wave: 'square' } };

export const CATS = ['theme', 'weather', 'sky', 'glow', 'altimeter', 'numstyle', 'trim', 'sound', 'stamp'];
const valueOf = (id) => (id || '').split('_').slice(1).join('_');

// equipped: { theme: 'theme_ink', weather: 'weather_auto', ... }. Returns one plain object the game draws from.
export function resolve(eq = {}) {
  const th = THEMES[valueOf(eq.theme)] || THEMES.ink;
  const pick = (cat) => { const v = valueOf(eq[cat]); return !v || v === 'auto' ? th.defaults[cat] : v; };
  const glow = GLOWS[pick('glow')] || GLOWS.red;
  return {
    id: Object.keys(THEMES).find((k) => THEMES[k] === th), name: th.name, c: th.c, sky: th.sky, ground: th.ground, accent: th.accent,
    disp: th.disp, dots: !!th.dots, flash: !!th.flash, ticket: th.ticket || '',
    weather: pick('weather'), body: pick('sky'), glow: { hi: glow[0], lo: glow[1] }, altimeter: pick('altimeter'),
    num: NUMBERS[pick('numstyle')] || NUMBERS.brush, trim: TRIMS[pick('trim')] || TRIMS.gold,
    sound: SOUND_PACKS[valueOf(eq.sound)] ? valueOf(eq.sound) : 'classic', stamp: pick('stamp'),
  };
}

// Writes the look into CSS variables on the page. No other file sets colours.
export function apply(look, root = document.documentElement) {
  const s = root.style, c = look.c;
  for (const k of ['ink', 'c0', 'c1', 'c2', 'cream', 'orange', 'red', 'green', 'lose']) s.setProperty('--' + k, c[k]);
  s.setProperty('--gold', look.trim); s.setProperty('--orange', look.accent);
  s.setProperty('--disp', look.disp); s.setProperty('--numfont', look.num.font); s.setProperty('--numweight', String(look.num.weight));
  root.dataset.theme = look.id; root.dataset.ticket = look.ticket;
}

// A small picture of a look, for the shop. Draws sky, sky body, glow, a number and the trim.
export function swatch(g, w, h, look) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, look.sky[0]); gr.addColorStop(0.6, look.sky[1]); gr.addColorStop(1, look.sky[2]);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const gl = g.createLinearGradient(0, h, 0, h * 0.4); gl.addColorStop(0, look.glow.hi + 'cc'); gl.addColorStop(1, look.glow.lo + '00');
  g.fillStyle = gl; g.fillRect(0, h * 0.4, w, h * 0.6);
  if (look.body === 'moon' || look.body === 'sun') {
    g.fillStyle = look.body === 'sun' ? '#ffe9a8' : look.c.cream; g.beginPath(); g.arc(w * 0.78, h * 0.2, w * 0.07, 0, 7); g.fill();
    if (look.body === 'moon') { g.fillStyle = look.sky[0]; g.beginPath(); g.arc(w * 0.8, h * 0.18, w * 0.06, 0, 7); g.fill(); }
  }
  g.strokeStyle = look.c.cream; g.globalAlpha = 0.35; g.lineWidth = 1; g.beginPath();
  if (look.weather === 'rain') for (let i = 0; i < 14; i++) { const x = (i * 37) % w, y = (i * 53) % (h * 0.6); g.moveTo(x, y); g.lineTo(x - 3, y + 12); }
  g.stroke(); g.globalAlpha = 0.8; g.fillStyle = look.c.cream;
  if (look.weather === 'snow' || look.weather === 'ash' || look.weather === 'fireflies') {
    g.fillStyle = look.weather === 'fireflies' ? '#f2e27a' : look.weather === 'ash' ? '#b0a090' : '#fff';
    for (let i = 0; i < 14; i++) { g.beginPath(); g.arc((i * 41) % w, (i * 59) % (h * 0.7), 2, 0, 7); g.fill(); }
  }
  g.globalAlpha = 1;
  g.fillStyle = look.accent; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${look.num.weight} ${Math.round(w * 0.3)}px ${look.num.font}`; g.fillText('412', w / 2, h * 0.52);
  g.strokeStyle = look.trim; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
  if (look.altimeter === 'dial') { g.beginPath(); g.arc(w * 0.2, h * 0.8, w * 0.12, 0, 7); g.stroke(); }
  else { g.beginPath(); g.moveTo(w * 0.12, h * 0.15); g.lineTo(w * 0.12, h * 0.85); g.stroke(); }
}
