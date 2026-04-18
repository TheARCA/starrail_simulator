export function getEffectiveAggro(unit) {
  const baseAggro = unit.baseAggro || unit.aggro || 100;
  return baseAggro * (unit.shield?.aggroMultiplier || 1);
}
