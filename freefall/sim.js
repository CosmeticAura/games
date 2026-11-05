// Pure physics + round maths. No browser needed, so it is testable in node.
import { CONFIG as C } from './config.js';

export function newJumper(height) {
  return { y: height, v: 0, fallen: 0, opened: false, openFallen: null, openAlt: null, landed: false, landSpeed: 0, t: 0 };
}

export function multiplierAt(fallen) {
  return C.multBase + C.multPerStep * (fallen / C.metersPerStep);
}

// advance one step; returns the jumper (mutated)
export function step(j, dt) {
  if (j.landed) return j;
  j.t += dt;
  if (!j.opened) {
    // gravity fades as drag builds; speed approaches terminalSpeed
    const r = j.v / C.terminalSpeed;
    j.v += C.gravity * (1 - r * r) * dt;
  } else if (j.v > C.chuteSpeed) {
    j.v = Math.max(C.chuteSpeed, j.v - C.chuteDecel * dt);
  } else {
    j.v = C.chuteSpeed;
  }
  const drop = j.v * dt;
  if (j.y - drop <= 0) {
    // touch down: interpolate nothing, speed at contact is j.v
    j.fallen += j.y;
    j.y = 0;
    j.landed = true;
    j.landSpeed = j.v;
  } else {
    j.y -= drop;
    j.fallen += drop;
  }
  return j;
}

export function open(j) {
  if (j.opened || j.landed) return false;
  j.opened = true;
  j.openFallen = j.fallen;
  j.openAlt = j.y;
  return true;
}

export function outcome(j, bet) {
  const mult = multiplierAt(j.opened ? j.openFallen : j.fallen);
  const win = j.landed && j.landSpeed < C.safeLanding;
  return { win, mult, landSpeed: j.landSpeed, payout: win ? Math.round(bet * mult) : 0, net: win ? Math.round(bet * mult) - bet : -bet };
}

export function randomHeight(rnd = Math.random) {
  return Math.round(C.minHeight + rnd() * (C.maxHeight - C.minHeight));
}

// bots decide an altitude to open at; greedy ones cut it fine
export function makeBot(name, balance, height, rnd = Math.random) {
  const greedy = rnd() < C.botGreedyShare;
  const [lo, hi] = greedy ? C.greedyOpenAlt : C.safeOpenAlt;
  let openAt = lo + rnd() * (hi - lo);
  openAt = Math.min(openAt, height - 15 - rnd() * 40); // can't open above the jump point
  openAt = Math.max(openAt, 0);
  const share = C.botBetMin + rnd() * (C.botBetMax - C.botBetMin);
  const bet = Math.max(C.minBet, Math.round(balance * share / 10) * 10);
  return { name, greedy, bet, openAt, j: newJumper(height), done: false, result: null };
}

export function stepBot(b, dt) {
  const j = b.j;
  if (!j.opened && !j.landed && j.y <= b.openAt) open(j);
  step(j, dt);
  if (j.landed && !b.done) { b.done = true; b.result = outcome(j, b.bet); }
}
