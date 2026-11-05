// Freefall tuning. Change numbers here, nothing else needs touching.
export const CONFIG = {
  // jump
  minHeight: 100,          // m, plane height range (hidden from the player)
  maxHeight: 2500,
  // multiplier: 1.00x at the jump, +1.00x per 100 m fallen
  multBase: 1.0,
  multPerStep: 1.0,
  metersPerStep: 100,
  // physics
  gravity: 80,             // m/s^2 at the start of the fall (v3: fast)
  terminalSpeed: 220,      // m/s, freefall tops out here (reached smoothly)
  chuteDecel: 320,         // m/s^2, steady braking once the chute is open (about half a second)
  chuteSpeed: 60,          // m/s, steady descent under the chute
  safeLanding: 68,         // m/s, land slower than this to win
  // bets and tokens
  minBet: 10,
  startTokens: 10000,
  dailyBonus: 10000,
  // bots
  botsMin: 4,
  botsMax: 6,
  botBetMin: 0.02,         // share of your balance
  botBetMax: 0.15,
  botNames: ['Maverick', 'Skye', 'Dash', 'Nova', 'Ripley', 'Blaze', 'Echo', 'Jett', 'Pixel', 'Orion', 'Zuzu', 'Kestrel'],
  // chance a bot is greedy (opens low) vs safe (opens high)
  botGreedyShare: 0.5,
  safeOpenAlt: [130, 260],   // m above ground
  greedyOpenAlt: [30, 170],
  // v2: view, drift, feel
  groundVisibleM: 400,       // v3: ground first shows this many m below you (about 2 s at top speed)
  viewPxPerM: 0.0036,        // vertical scale: screen height * this = pixels per metre
  xStretch: 4,             // sideways is drawn this much bigger than vertical
  endHold: 3,                // seconds the wide ending shot stays before the results
  driftFree: 14,             // m/s sideways in freefall
  driftChute: 5,             // m/s sideways under the chute
  botDriftSpread: 16,        // m, bots wander this far from you
  fastForward: 2,            // time multiplier once you have landed and bots are still falling
  slowmoScale: 0.35,         // time scale at the chute-open beat
  slowmoSecs: 0.3,
  chuteWarp: 1,              // time speed-up while every jumper still in the air is under a chute and high up
  historyLen: 20,
  rescueTokens: 1000,        // given when you are below the minimum bet
  streakExtra: 500,          // extra tokens per streak day beyond the first
  streakExtraMax: 5000,
};
