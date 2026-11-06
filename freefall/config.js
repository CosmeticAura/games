// Freefall v4 tuning. Change numbers here, nothing else needs touching.
// Play tokens only, never real money.
export const CONFIG = {
  // jump heights (m). The mix is also what the multiplier is worked out from.
  minHeight: 100,
  maxHeight: 2500,
  heightMix: [
    { p: 0.30, lo: 100,  hi: 500  },   // short
    { p: 0.50, lo: 500,  hi: 1800 },   // medium
    { p: 0.20, lo: 1800, hi: 2500 },   // long
  ],
  repeatBand: 0.10,        // a new height is never within 10% of the last one

  // multiplier = returnShare / (chance a random jump is still in the air at that height fallen)
  returnShare: 0.92,
  multCap: 100,            // highest multiplier the game pays
  multDecimals: 2,

  // physics
  gravity: 60,             // m/s^2 at the start of the fall
  terminalSpeed: 160,      // m/s
  chuteDecel: 1000,        // m/s^2, the snap when the chute opens
  chuteSpeed: 60,          // m/s, steady descent under the chute
  safeLanding: 100,        // m/s, land slower than this and you walk away
  groundVisibleM: 30,      // the ground only shows this close, about 0.2 s at top speed: too late to react

  // bets and tokens
  minBet: 100, // same as the shared wallet; the wallet value is the one the game uses
  dailyBonus: 10000,
  streakExtra: 500,
  streakExtraMax: 5000,
  rescueTokens: 1000,      // given when the balance is below the minimum bet

  // bots
  botsMin: 4,
  botsMax: 6,
  botBetMin: 0.02,
  botBetMax: 0.15,
  botBalance: [2000, 30000],
  // bots choose how many metres to fall before opening
  botOpenMix: [
    { p: 0.50, lo: 100, hi: 450 },
    { p: 0.40, lo: 450, hi: 1300 },
    { p: 0.10, lo: 1300, hi: 2000 },
  ],
  // some bots watch the altimeter and open this far above the ground instead
  botAwareShare: 0.03,
  botAwareAlt: [250, 700],
  botNames: ['Skye', 'Blaze', 'Echo', 'Dash', 'Maverick', 'Jett', 'Orion', 'Ripley', 'Kestrel', 'Nova'],  // each has a fixed style in bots.js
  botSwapChance: 0.18,     // chance a bot plays another style for the next 1 or 2 rounds

  // view and feel
  viewPxPerM: 0.0036,      // screen height * this = pixels per metre
  xStretch: 4,             // sideways is drawn this much bigger than vertical
  driftFree: 14,           // m/s sideways in freefall
  driftChute: 5,
  botDriftSpread: 16,
  endHold: 3,              // seconds the wide ground shot stays before the results
  skipSpeed: 8,            // time multiplier for Skip to results
  historyLen: 20,

  // profiles
  nameMin: 3,
  nameMax: 16,
  starterSuits: ['suit_classic', 'suit_flame', 'suit_camo', 'suit_racing'],
  avatarCount: 12,

  // sound
  defaultVolume: 0.7,
};
