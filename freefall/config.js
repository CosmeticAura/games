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
  gravity: 9.81,           // m/s^2 at the start of the fall
  terminalSpeed: 55,       // m/s, freefall tops out here (reached smoothly)
  chuteDecel: 30,          // m/s^2, steady braking once the chute is open
  chuteSpeed: 6,           // m/s, steady descent under the chute
  safeLanding: 7,          // m/s, land slower than this to win
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
  safeOpenAlt: [140, 320],   // m above ground
  greedyOpenAlt: [25, 120],
  // v2: view, drift, feel
  groundVisibleM: 40,        // ground first appears this many m below the diver (less than the chute needs)
  driftFree: 14,             // m/s sideways in freefall
  driftChute: 5,             // m/s sideways under the chute
  botDriftSpread: 16,        // m, bots wander this far from you
  fastForward: 3,            // time multiplier once you have landed and bots are still falling
  slowmoScale: 0.35,         // time scale at the chute-open beat
  slowmoSecs: 0.45,
  chuteWarp: 6,              // time speed-up while every jumper still in the air is under a chute and high up
  historyLen: 20,
  rescueTokens: 1000,        // given when you are below the minimum bet
  streakExtra: 500,          // extra tokens per streak day beyond the first
  streakExtraMax: 5000,
};
