export function applyMoveStatusEffects(attacker, target, moveData) {
  if (!moveData || !target || target.hp <= 0) return;

  if (moveData.baseFreezeChance) {
    applyFreeze(attacker, target, moveData);
  }
}

function applyFreeze(attacker, target, moveData) {
  if (Math.random() >= moveData.baseFreezeChance) return;

  target.debuffs = target.debuffs || [];
  const existingFreeze = target.debuffs.find((debuff) => debuff.name === "FREEZE");
  const freezeData = {
    name: "FREEZE",
    type: "Disable",
    duration: moveData.freezeDuration || 1,
    stacks: 1,
    attacker,
    abilityMultiplier: moveData.freezeDotMult || 0,
  };

  if (existingFreeze) {
    Object.assign(existingFreeze, freezeData);
  } else {
    target.debuffs.push(freezeData);
  }
}
