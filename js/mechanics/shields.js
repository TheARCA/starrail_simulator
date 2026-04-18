import { EventBus } from "../core/event_bus.js";

function getShieldBonus(attacker) {
  const rawShieldBonus =
    attacker.shieldBonus ??
    attacker.shieldBonusPct ??
    attacker.stats?.shieldBonus ??
    0;
  return rawShieldBonus > 1 ? rawShieldBonus / 100 : rawShieldBonus;
}

export function applyShield(attacker, target, moveData) {
  target.baseAggro = target.baseAggro || target.aggro || 100;

  const shieldBonus = getShieldBonus(attacker);
  const shieldValue = Math.floor(
    ((attacker.def || 0) * (moveData.shieldDefMult || 0) +
      (moveData.shieldFlat || 0)) *
      (1 + shieldBonus),
  );
  const currentHpPercent = (target.hp || 0) / (target.baseHp || target.hp || 1);
  const aggroMultiplier =
    currentHpPercent >= (moveData.aggroThreshold || 0)
      ? 1 + (moveData.aggroModifier || 0)
      : 1;

  target.shield = {
    value: shieldValue,
    maxValue: shieldValue,
    duration: moveData.shieldDuration || 1,
    sourceId: attacker.id,
    aggroMultiplier,
  };
  target.shieldFlash = 1.0;

  EventBus.emit("onShieldApplied", {
    attacker,
    target,
    moveData,
    shield: target.shield,
  });

  return target.shield;
}

export function absorbDamageWithShield(target, damage) {
  if (!target.shield || target.shield.value <= 0) {
    return { hpDamage: damage, absorbed: 0 };
  }

  const absorbed = Math.min(target.shield.value, damage);
  target.shield.value -= absorbed;
  if (target.shield.value <= 0) {
    target.shield = null;
  }

  return {
    hpDamage: Math.max(0, damage - absorbed),
    absorbed,
  };
}
