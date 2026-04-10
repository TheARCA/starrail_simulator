// js/utils/math.js

export const LEVEL_MULTIPLIER = {
  1: 54.0,
  2: 58.0,
  3: 62.0,
  4: 67.5264,
  5: 70.5094,
  6: 73.5228,
  7: 76.566,
  8: 79.6385,
  9: 82.7395,
  10: 85.8684,
  11: 91.4944,
  12: 97.068,
  13: 102.5892,
  14: 108.0579,
  15: 113.4743,
  16: 118.8383,
  17: 124.1499,
  18: 129.4091,
  19: 134.6159,
  20: 139.7703,
  21: 149.3323,
  22: 158.8011,
  23: 168.1768,
  24: 177.4594,
  25: 186.6489,
  26: 195.7452,
  27: 204.7484,
  28: 213.6585,
  29: 222.4754,
  30: 231.1992,
  31: 246.4276,
  32: 261.181,
  33: 275.4733,
  34: 289.3179,
  35: 302.7275,
  36: 315.7144,
  37: 328.2905,
  38: 340.4671,
  39: 352.2554,
  40: 363.6658,
  41: 408.124,
  42: 451.7883,
  43: 494.6798,
  44: 536.8188,
  45: 578.2249,
  46: 618.9172,
  47: 658.9138,
  48: 698.2325,
  49: 736.8905,
  50: 774.9041,
  51: 871.0599,
  52: 964.8705,
  53: 1056.4206,
  54: 1145.791,
  55: 1233.0585,
  56: 1318.2965,
  57: 1401.575,
  58: 1482.9608,
  59: 1562.5178,
  60: 1640.3068,
  61: 1752.3215,
  62: 1861.9011,
  63: 1969.1242,
  64: 2074.0659,
  65: 2176.7983,
  66: 2277.3904,
  67: 2375.9085,
  68: 2472.416,
  69: 2566.9739,
  70: 2659.6406,
  71: 2780.3044,
  72: 2898.6022,
  73: 3014.6029,
  74: 3128.3729,
  75: 3239.9758,
  76: 3349.473,
  77: 3456.9236,
  78: 3562.3843,
  79: 3665.9099,
  80: 3767.5533,
  81: 3957.8618,
  82: 4155.2118,
  83: 4359.8638,
  84: 4572.0878,
  85: 4792.1641,
  86: 5020.3833,
  87: 5257.0466,
  88: 5502.4664,
  89: 5756.9667,
  90: 6020.8836,
  91: 6294.5654,
  92: 6578.3734,
  93: 6872.6823,
  94: 7177.8806,
  95: 7494.3713,
};

export function calculateDamage(
  attacker,
  target,
  activeMultiplier,
  isBreakHit,
  isCritHit,
) {
  const attackerLevel = attacker.level || 1;
  const enemyLevel = target.level || 1;
  const atk = attacker.atk || 0;
  const element = attacker.element || "Physical";

  // Uses baseToughness initialized in visual.js, or falls back to current toughness
  const maxToughness = target.baseToughness || target.toughness || 30;

  // --- 0. EXTRACT STATS & BUFFS/DEBUFFS (Defaults to 0) ---
  const dmgBoost = attacker.dmgBoost || 0;
  const weaken = attacker.weaken || 0;
  const defBonus = target.defBonus || 0;
  const defReduction = target.defReduction || 0;
  const defIgnore = attacker.defIgnore || 0;
  const resPen = attacker.resPen || 0;
  const vulnerability = target.vulnerability || 0;
  const dmgMitigation = target.dmgMitigation || 0;

  // --- 1. CRIT MULTIPLIER ---
  const critDmg = attacker.critDmg || 0.5; // Base 50%
  const critMultiplier = isCritHit ? 1 + critDmg : 1.0;

  // --- 2. DMG BOOST MULTIPLIER ---
  const boostMultiplier = 1 + dmgBoost - weaken;

  // --- 3. DEF MULTIPLIER ---
  const defScaling = Math.max(0, 1 + defBonus - defReduction - defIgnore);
  let defMultiplier = 1.0; // Caps at 100% if scaling reaches 0
  if (defScaling > 0) {
    defMultiplier =
      (attackerLevel + 20) /
      ((enemyLevel + 20) * defScaling + (attackerLevel + 20));
  }

  // --- 4. RES MULTIPLIER ---
  const isWeak = target.weaknesses && target.weaknesses.includes(element);
  const baseRes = isWeak ? 0.0 : 0.2; // 0% if weak, 20% if not
  let resMultiplier = 1 - (baseRes - resPen);
  resMultiplier = Math.max(0.1, Math.min(2.0, resMultiplier)); // Clamp 10% to 200%

  // --- 5. VULNERABILITY MULTIPLIER ---
  const vulnMultiplier = 1 + vulnerability;

  // --- 6. MITIGATION MULTIPLIER ---
  const mitMultiplier = 1 - dmgMitigation;

  // --- 7. TOUGHNESS MULTIPLIER ---
  const toughnessMultiplier = target.isBroken ? 1.0 : 0.9;

  // ==========================================
  // A. NORMAL DAMAGE CALCULATION
  // ==========================================
  const baseDamage = activeMultiplier * atk;
  const normalDamage = Math.floor(
    baseDamage *
      critMultiplier *
      boostMultiplier *
      defMultiplier *
      resMultiplier *
      vulnMultiplier *
      mitMultiplier *
      toughnessMultiplier,
  );

  // ==========================================
  // B. BREAK DAMAGE CALCULATION
  // ==========================================
  let breakDamage = 0;
  if (isBreakHit) {
    const maxToughnessMultiplier = 0.5 + maxToughness / 40;

    let elementMultiplier = 1.0;
    if (["Physical", "Fire"].includes(element)) elementMultiplier = 2.0;
    else if (element === "Wind") elementMultiplier = 1.5;
    else if (["Ice", "Lightning"].includes(element)) elementMultiplier = 1.0;
    else if (["Quantum", "Imaginary"].includes(element))
      elementMultiplier = 0.5;

    const lvlMultiplier =
      LEVEL_MULTIPLIER[attackerLevel] || LEVEL_MULTIPLIER[1];

    const baseBreak =
      elementMultiplier * lvlMultiplier * maxToughnessMultiplier;

    // Break DMG ignores CRIT, Boosts, and Weaken. Uses base 0.9 Toughness mult on the breaking hit.
    breakDamage = Math.floor(
      baseBreak *
        defMultiplier *
        resMultiplier *
        vulnMultiplier *
        mitMultiplier *
        0.9,
    );
  }

  return { normalDamage, breakDamage };
}
