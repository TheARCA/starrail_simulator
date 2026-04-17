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

export function getBaseBreakDamage(attackerLevel, maxToughness) {
  const lvlMultiplier = LEVEL_MULTIPLIER[attackerLevel] || LEVEL_MULTIPLIER[1];
  const maxToughnessMultiplier = 0.5 + maxToughness / 40;
  return lvlMultiplier * maxToughnessMultiplier;
}

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
  const maxToughness = target.baseToughness || target.toughness || 30;

  const dmgBoost = attacker.dmgBoost || 0;
  const weaken = attacker.weaken || 0;
  const defBonus = target.defBonus || 0;
  const defReduction = target.defReduction || 0;
  const defIgnore = attacker.defIgnore || 0;
  const resPen = attacker.resPen || 0;
  const vulnerability = target.vulnerability || 0;
  const dmgMitigation = target.dmgMitigation || 0;
  const breakEffect = attacker.breakEffect || 0;

  const critDmg = attacker.critDmg || 0.5;
  const critMultiplier = isCritHit ? 1 + critDmg : 1.0;
  const boostMultiplier = 1 + dmgBoost;
  const weakenMultiplier = 1 - weaken;

  const defScaling = Math.max(0, 1 + defBonus - defReduction - defIgnore);
  let defMultiplier = 1.0;
  if (defScaling > 0)
    defMultiplier =
      (attackerLevel + 20) /
      ((enemyLevel + 20) * defScaling + (attackerLevel + 20));

  let enemyRes = 0.2;
  if (target.weaknesses && target.weaknesses.includes(element)) {
    enemyRes = 0.0;
  }

  let finalRes = enemyRes - resPen;
  let resMultiplier = 1.0 - finalRes;
  const vulnMultiplier = 1 + vulnerability;
  const mitMultiplier = 1 - dmgMitigation;
  const toughnessMultiplier = target.isBroken ? 1.0 : 0.9;

  const normalDamage = Math.floor(
    activeMultiplier *
      atk *
      critMultiplier *
      boostMultiplier *
      weakenMultiplier *
      defMultiplier *
      resMultiplier *
      vulnMultiplier *
      mitMultiplier *
      toughnessMultiplier,
  );

  let breakDamage = 0;
  if (isBreakHit) {
    let elementMultiplier = 1.0;
    if (["Physical", "Fire"].includes(element)) elementMultiplier = 2.0;
    else if (element === "Wind") elementMultiplier = 1.5;
    else if (["Ice", "Lightning"].includes(element)) elementMultiplier = 1.0;
    else if (["Quantum", "Imaginary"].includes(element))
      elementMultiplier = 0.5;

    const baseBreak = getBaseBreakDamage(attackerLevel, maxToughness);
    breakDamage = Math.floor(
      elementMultiplier *
        baseBreak *
        defMultiplier *
        resMultiplier *
        vulnMultiplier *
        mitMultiplier *
        0.9 *
        (1 + breakEffect),
    );
  }

  return { normalDamage, breakDamage };
}

// --- FIXED: EXACT HSR DOT FORMULAS ---
export function calculateBreakDoT(attacker, target, debuff) {
  const element = attacker.element || "Physical";
  const baseBreak = getBaseBreakDamage(
    attacker.level || 1,
    target.baseToughness || 30,
  );
  const isElite = target.isElite || false;
  const maxHp = target.baseHp || target.hp || 100;
  const resPen = attacker.resPen || 0;

  let dotDamage = 0;

  if (element === "Physical") {
    // Bleed: MaxHP% capped at 2x BaseBreak
    const hpPercent = isElite ? 0.07 : 0.16;
    dotDamage = Math.min(maxHp * hpPercent, 2.0 * baseBreak);
  } else if (element === "Lightning") {
    dotDamage = 2.0 * baseBreak;
  } else if (element === "Fire") {
    dotDamage = 1.0 * baseBreak;
  } else if (element === "Wind") {
    dotDamage = 1.0 * baseBreak * (debuff.stacks || 1);
  } else if (element === "Ice") {
    dotDamage = 1.0 * baseBreak;
  } else if (element === "Quantum") {
    dotDamage = 0.6 * baseBreak * (debuff.stacks || 1);
  } else if (element === "Imaginary") {
    dotDamage = 0;
  }

  // Calculate snapshot defenses
  const defScaling = Math.max(
    0,
    1 +
      (target.defBonus || 0) -
      (target.defReduction || 0) -
      (attacker.defIgnore || 0),
  );
  let defMultiplier = 1.0;
  if (defScaling > 0)
    defMultiplier =
      ((attacker.level || 1) + 20) /
      (((target.level || 1) + 20) * defScaling + ((attacker.level || 1) + 20));

  let enemyRes = 0.2;
  if (target.weaknesses && target.weaknesses.includes(element)) {
    enemyRes = 0.0;
  }

  // Subtract any Resistance Penetration the attacker might have
  let finalRes = enemyRes - resPen;

  let resMultiplier = 1.0 - finalRes;
  const vulnMultiplier = 1 + (target.vulnerability || 0);
  const breakEffectMultiplier = 1 + (attacker.breakEffect || 0);

  return Math.floor(
    dotDamage *
      defMultiplier *
      resMultiplier *
      vulnMultiplier *
      breakEffectMultiplier,
  );
}
