// Bot personalities. Ten named styles, four to six in a round. Each bot keeps a little memory between
// rounds (streaks, tilt) and now and then swaps to another style for one or two rounds.
// Bots only ever play the same rules as the player: they never touch the player's tokens or the odds.
import { CONFIG as C } from './config.js';
import * as S from './sim.js';

// Bots never read the altimeter or the safe line: a bot that knew the jump height could beat the odds.
// open: metres fallen before the trigger (kind fixed). bet: share of the bot's balance. react: seconds between
// deciding and pulling the cord. poses: emotes that fit the style. say: short lines by event.
export const STYLES = {
  cautious: { label: 'Cautious', kind: 'fixed', open: [100, 330], bet: [0.02, 0.05], react: [0.08, 0.22], poses: ['wave', 'salute', 'sit'],
    say: { near_open: ['Smart.'], near_crash: ['Too low.', 'Told you.'], landed: ['Phew.'], crashed: ['Oh no.'] } },
  greedy: { label: 'Greedy', kind: 'fixed', open: [900, 1700], bet: [0.12, 0.25], react: [0.1, 0.3], poses: ['flex', 'pump'],
    say: { near_open: ['Weak.'], near_crash: ['Not me.'], landed: ['Easy money.'], crashed: ['Worth a shot.'] } },
  copycat: { label: 'Copycat', kind: 'copy', open: [300, 900], bet: [0.04, 0.1], react: [0.2, 0.7], poses: ['dab', 'wave'],
    say: { near_open: ['Me too.'], near_crash: ['Nope.'], landed: ['Followed right.'], crashed: ['Bad lead.'] } },
  streaky: { label: 'Streaky', kind: 'fixed', open: [350, 800], bet: [0.05, 0.12], react: [0.1, 0.3], poses: ['pump', 'dance'],
    say: { near_open: ['Hot hand.'], near_crash: ['Unlucky.'], landed: ['Again.'], crashed: ['Streak over.'] } },
  tilted: { label: 'Tilted', kind: 'fixed', open: [300, 700], bet: [0.06, 0.12], react: [0.05, 0.2], poses: ['pump', 'dab'],
    say: { near_open: ['Whatever.'], near_crash: ['Ha.'], landed: ['Finally.'], crashed: ['Unreal.'] } },
  showboat: { label: 'Showboat', kind: 'crowd', open: [500, 1400], bet: [0.08, 0.18], react: [0.1, 0.4], poses: ['flip', 'dance', 'flex'],
    say: { near_open: ['Watch this.'], near_crash: ['Oof.'], landed: ['Ta-da.'], crashed: ['Planned.'] } },
  steady: { label: 'Steady', kind: 'fixed', open: [450, 650], bet: [0.05, 0.08], react: [0.1, 0.25], poses: ['salute', 'sit'],
    say: { near_open: ['Fair.'], near_crash: ['Hm.'], landed: ['As usual.'], crashed: ['Rare one.'] } },
  daredevil: { label: 'Daredevil', kind: 'fixed', open: [1500, 2300], bet: [0.1, 0.2], react: [0.04, 0.12], poses: ['flip', 'flex'],
    say: { near_open: ['Too early.'], near_crash: ['So close.'], landed: ['Barely.'], crashed: ['Closer next time.'] } },
  jumpy: { label: 'Jumpy', kind: 'jumpy', open: [100, 320], bet: [0.02, 0.06], react: [0.05, 0.18], poses: ['sit', 'wave'],
    say: { near_open: ['Wait for me!'], near_crash: ['Nope nope.'], landed: ['Still here.'], crashed: ['I knew it.'] } },
  wildcard: { label: 'Wildcard', kind: 'wild', open: [100, 1500], bet: [0.03, 0.2], react: [0.05, 0.5], poses: ['dance', 'dab', 'flip'],
    say: { near_open: ['Ha.'], near_crash: ['Whoops.'], landed: ['Lucky.'], crashed: ['Fine.'] } },
};
export const STYLE_KEYS = Object.keys(STYLES);
// fixed names so a player learns who plays how
export const ROSTER = { Skye: 'cautious', Blaze: 'greedy', Echo: 'copycat', Dash: 'streaky', Maverick: 'tilted', Jett: 'showboat', Orion: 'steady', Ripley: 'daredevil', Kestrel: 'jumpy', Nova: 'wildcard' };

const MEM = {};
export function resetMemory() { for (const k of Object.keys(MEM)) delete MEM[k]; }
export function memoryOf(name) { return MEM[name]; }

const between = (r, [a, b]) => a + r() * (b - a);
const pickOf = (arr, r) => arr[Math.floor(r() * arr.length)];

export function makeBot(name, height, rnd = Math.random) {
  const mem = MEM[name] || (MEM[name] = { bal: between(rnd, C.botBalance), win: 0, loss: 0, swapLeft: 0, swapStyle: null });
  const home = ROSTER[name] || pickOf(STYLE_KEYS, rnd);
  let key = home;
  if (mem.cool > 0) mem.cool--;
  else if (mem.swapLeft <= 0 && rnd() < C.botSwapChance) {
    mem.swapStyle = pickOf(STYLE_KEYS.filter((k) => k !== home), rnd); mem.swapLeft = 1 + Math.floor(rnd() * 2);
  }
  if (mem.swapLeft > 0) { key = mem.swapStyle; mem.swapLeft--; if (mem.swapLeft === 0) mem.cool = 1; }
  if (key === 'wildcard') key = pickOf(STYLE_KEYS.filter((k) => k !== 'wildcard'), rnd);
  const st = STYLES[key];
  mem.bal = Math.max(500, Math.min(60000, mem.bal));
  let share = between(rnd, st.bet);
  if (key === 'tilted') share *= 2 ** Math.min(mem.loss, 2);
  const bet = Math.max(C.minBet, Math.min(Math.floor(mem.bal), Math.round(mem.bal * share / 10) * 10));
  let open = between(rnd, st.open) * (0.92 + rnd() * 0.16);
  if (key === 'streaky') open += 140 * Math.min(mem.win, 3);
  if (key === 'tilted' && mem.loss) open += 180;
  const base = {
    name, style: key, home, label: STYLES[key].label, swapped: key !== home && !!mem.swapStyle, bet, openFallen: open,
    react: between(rnd, st.react), openAt: null, j: S.newJumper(height),
    done: false, result: null, bubble: null, lastSay: -99,
  };
  return base;
}

// ctx.players: everybody in the round (to watch openers and crashes). Called once per sim step.
export function stepBot(b, dt, ctx = { players: [] }) {
  const j = b.j; b.t = (b.t || 0) + dt;
  if (!j.opened && !j.landed) {
    if (b.openAt == null && wantsOpen(b, ctx)) b.openAt = b.t + b.react;
    if (b.openAt != null && b.t >= b.openAt) S.open(j);
  }
  S.step(j, dt);
  if (j.landed && !b.done) { b.done = true; b.result = S.outcome(j, b.bet); }
}

function wantsOpen(b, ctx) {
  const j = b.j, st = STYLES[b.style], others = ctx.players.filter((p) => p.j !== j);
  switch (st.kind) {
    case 'copy': {
      if (b.follow == null && others.some((p) => p.j.opened)) b.follow = b.t;
      return b.follow != null || j.fallen >= b.openFallen;
    }
    case 'crowd': {
      const need = Math.max(1, Math.ceil(others.length * 0.6));
      const gone = others.filter((p) => p.j.opened || p.j.landed).length;
      return gone >= need || j.fallen >= b.openFallen * 1.6;
    }
    case 'jumpy': return j.fallen >= b.openFallen || others.some((p) => p.j.landed && !p.j.opened);
    default: return j.fallen >= b.openFallen;
  }
}

// what the bot learns from the round, used for the next one
export function settleBot(b) {
  const m = MEM[b.name]; if (!m || !b.result) return;
  m.bal += b.result.net;
  if (b.result.win) { m.win++; m.loss = 0; } else { m.loss++; m.win = 0; }
  m.bal = Math.max(m.bal, 1500);
}

// short line for an event ('near_open', 'near_crash', 'landed', 'crashed'), or null
export function lineFor(b, ev, now, rnd = Math.random) {
  if (now - b.lastSay < 4 || rnd() > 0.55) return null;
  const list = STYLES[b.style].say[ev]; if (!list) return null;
  b.lastSay = now; return pickOf(list, rnd);
}
export function emoteFor(name, rnd = Math.random) {
  const st = STYLES[ROSTER[name] ? ROSTER[name] : 'wildcard'];
  return 'emote_' + pickOf(st.poses, rnd);
}
