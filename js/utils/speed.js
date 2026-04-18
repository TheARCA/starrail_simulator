export const INITIAL_ACTION_GAUGE = 10000;

export function getBaseSpd(unit) {
  return unit?.baseSpd ?? unit?.spd ?? 100;
}

export function getSpdPercent(unit) {
  return (
    unit?.spdPct ??
    unit?.spdPercent ??
    unit?.stats?.spdPct ??
    unit?.spdModifier ??
    0
  );
}

export function getFlatSpd(unit) {
  return unit?.flatSpd ?? unit?.spdFlat ?? unit?.stats?.flatSpd ?? 0;
}

export function getEffectiveSpd(unit) {
  const baseSpd = getBaseSpd(unit);
  const effectiveSpd = baseSpd * (1 + getSpdPercent(unit)) + getFlatSpd(unit);
  return Math.max(1, effectiveSpd);
}

export function getCurrentActionGauge(unit) {
  return unit?.actionGauge ?? INITIAL_ACTION_GAUGE;
}

export function getCurrentActionValue(unit) {
  return getCurrentActionGauge(unit) / getEffectiveSpd(unit);
}

export function syncActionValue(unit) {
  if (!unit) return 0;
  const nextAv = getCurrentActionValue(unit);
  unit.av = nextAv;
  return nextAv;
}

export function getBaseActionValue(unit) {
  return 10000 / getEffectiveSpd(unit);
}

export function setCurrentActionGauge(unit, gauge) {
  unit.actionGauge = Math.max(0, gauge);
  return syncActionValue(unit);
}

export function addActionGauge(unit, gaugeDelta) {
  return setCurrentActionGauge(unit, getCurrentActionGauge(unit) + gaugeDelta);
}

export function advanceTimeByAv(unit, avDelta) {
  const gaugeDelta = getEffectiveSpd(unit) * avDelta;
  return setCurrentActionGauge(unit, getCurrentActionGauge(unit) - gaugeDelta);
}

export function resetActionValue(unit) {
  return setCurrentActionGauge(unit, INITIAL_ACTION_GAUGE);
}

export function initializeSpeedState(unit) {
  if (!unit) return;
  if (unit.baseSpd == null) unit.baseSpd = unit.spd ?? 100;
  if (unit.spdPct == null) unit.spdPct = 0;
  if (unit.flatSpd == null) unit.flatSpd = 0;
  if (unit.actionGauge == null) unit.actionGauge = INITIAL_ACTION_GAUGE;
  syncActionValue(unit);
}
