// Pure physics and round maths. No browser needed, so it is testable in node.
import { CONFIG as C } from './config.js';

export function newJumper(height) {
  return { y: height, v: 0, fallen: 0, opened: false, openFallen: null, openAlt: null, openV: 0, openSafe: false, landed: false, landSpeed: 0, t: 0 };
}

// chance that a random jump is still in the air after `fallen` metres
export function airChance(fallen) {
  let s = 0;
  for (const m of C.heightMix) s += m.p * Math.min(1, Math.max(0, (m.hi - fallen) / (m.hi - m.lo)));
  return s;
}

// pays returnShare on average: share / chance still in the air, floored to the display decimals
export function multiplierAt(fallen) {
  const s = airChance(fallen);
  const raw = s <= C.returnShare / C.multCap ? C.multCap : C.returnShare / s;
  const k = 10 ** C.multDecimals;
  return Math.min(C.multCap, Math.floor(raw * k + 1e-9) / k);
}

// lowest altitude you can open at, going at speed v, and still land under safeLanding
export function minSafeAlt(v) {
  return v > C.safeLanding ? (v * v - C.safeLanding * C.safeLanding) / (2 * C.chuteDecel) : 0;
}

export function step(j, dt) {
  if (j.landed) return j;
  j.t += dt;
  if (!j.opened) {
    const r = j.v / C.terminalSpeed;
    j.v += C.gravity * (1 - r * r) * dt;
  } else if (j.v > C.chuteSpeed) {
    j.v = Math.max(C.chuteSpeed, j.v - C.chuteDecel * dt);
  } else {
    j.v = C.chuteSpeed;
  }
  const drop = j.v * dt;
  if (j.y - drop <= 0) {
    j.fallen += j.y; j.y = 0; j.landed = true; j.landSpeed = j.v;
  } else {
    j.y -= drop; j.fallen += drop;
  }
  return j;
}

export function open(j) {
  if (j.opened || j.landed) return false;
  j.opened = true; j.openFallen = j.fallen; j.openAlt = j.y; j.openV = j.v;
  j.openSafe = j.y >= minSafeAlt(j.v);
  return true;
}

// run a jumper to the ground (used when the round ends and everyone under a chute lands at once)
export function finish(j) {
  let n = 0;
  while (!j.landed && n++ < 1e6) step(j, 1 / 120);
  return j;
}

export function outcome(j, bet) {
  const mult = multiplierAt(j.opened ? j.openFallen : j.fallen);
  const win = j.landed && j.opened && j.landSpeed < C.safeLanding;
  const payout = win ? Math.round(bet * mult) : 0;
  return { win, mult, landSpeed: j.landSpeed, payout, net: payout - bet };
}

// ---- heights ----
function pick(mix, rnd) {
  let r = rnd(), acc = 0;
  for (const m of mix) { acc += m.p; if (r < acc) return m; }
  return mix[mix.length - 1];
}
export function randomHeight(rnd = Math.random, prev = null) {
  for (let i = 0; i < 50; i++) {
    const m = pick(C.heightMix, rnd);
    const h = Math.round(m.lo + rnd() * (m.hi - m.lo));
    if (prev == null || Math.abs(h - prev) > prev * C.repeatBand) return h;
  }
  return prev > 1300 ? C.minHeight + 50 : C.maxHeight - 50;
}

// ---- bots ----
export function makeBot(name, height, rnd = Math.random) {
  const aware = rnd() < C.botAwareShare;
  const m = pick(C.botOpenMix, rnd);
  const openFallen = m.lo + rnd() * (m.hi - m.lo);
  const [alo, ahi] = C.botAwareAlt;
  const awareAlt = alo + rnd() * (ahi - alo);
  const balance = C.botBalance[0] + rnd() * (C.botBalance[1] - C.botBalance[0]);
  const share = C.botBetMin + rnd() * (C.botBetMax - C.botBetMin);
  const bet = Math.max(C.minBet, Math.round(balance * share / 10) * 10);
  return { name, aware, bet, openFallen, awareAlt, j: newJumper(height), done: false, result: null };
}

export function stepBot(b, dt) {
  const j = b.j;
  if (!j.opened && !j.landed) {
    if (b.aware ? j.y <= b.awareAlt : j.fallen >= b.openFallen) open(j);
  }
  step(j, dt);
  if (j.landed && !b.done) { b.done = true; b.result = outcome(j, b.bet); }
}
