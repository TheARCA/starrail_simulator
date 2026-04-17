import { STATES, state } from "../core/state.js";
import { party } from "../data/characters/index.js";
import { enemies } from "../data/enemies/index.js";
import { calculateDamage } from "./damage_calc.js";
import { EventBus } from "../core/event_bus.js"; // NEW: The Event Bus!
import {
  spawnJuice,
  spawnDeathExplosion,
  resetTotalDamage,
  addTotalDamage,
} from "../render/fx_manager.js";
import {
  playAttackDash,
  playHeavyHit,
  playBreak,
  playUltimateCharge,
} from "../core/audio_manager.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function executeCombatSequence(action, attacker) {
  const aliveEnemies = enemies.filter((e) => e.hp > 0);
  if (aliveEnemies.length === 0) return;

  state.pendingAction = null;
  state.isAnimating = true;

  let target =
    enemies.find((e) => e.id === state.selectedTargetId && e.hp > 0) ||
    aliveEnemies[0];
  const logic = attacker.combatLogic;

  let moveData;
  if (state.isEnhanced) {
    if (action === "ATTACK") moveData = logic.ultimate.modes.blowoutBasic;
    else if (action === "SKILL") moveData = logic.ultimate.modes.blowoutSkill;
  } else {
    if (action === "ATTACK") moveData = logic.basic;
    else if (action === "SKILL") moveData = logic.skill;
    else if (action === "ULTIMATE") moveData = logic.ultimate;
  }

  const isCinematic = action === "ULTIMATE" || state.isEnhanced;
  if (isCinematic) {
    state.fx.cinematic = true;
    playUltimateCharge();
  }

  state.activeSkillName = moveData.name;
  resetTotalDamage();
  await sleep(500);

  if (!state.isEnhanced) {
    if (action === "ATTACK")
      state.sp = Math.min(state.maxSp || 5, (state.sp || 0) + 1);
    else if (action === "SKILL") state.sp = Math.max(0, (state.sp || 0) - 1);
  }
  await sleep(500);

  if (moveData.energyGen)
    attacker.energy = Math.min(
      attacker.maxEnergy || 120,
      (attacker.energy || 0) + moveData.energyGen,
    );

  if (
    action === "ULTIMATE" &&
    !state.isEnhanced &&
    moveData.tag !== "Enhance"
  ) {
    attacker.energy = Math.max(
      0,
      (attacker.energy || 0) - (moveData.cost || 120),
    );
  }

  attacker.targetOffsetY = isCinematic ? 30 : 20;
  attacker.targetScale = isCinematic ? 0.9 : 0.95;
  attacker.targetRotation = -0.08;
  await sleep(isCinematic ? 400 : 250);

  attacker.targetOffsetY = isCinematic ? -180 : action === "SKILL" ? -120 : -80;
  attacker.targetScale = isCinematic ? 1.3 : 1.15;
  attacker.targetRotation = 0.08;
  playAttackDash();
  await sleep(100);

  const targetIndex = aliveEnemies.findIndex((e) => e.id === target.id);
  const hitTargets = [{ enemy: target, isMain: true }];

  if (moveData.tag === "Blast") {
    if (targetIndex > 0)
      hitTargets.push({ enemy: aliveEnemies[targetIndex - 1], isMain: false });
    if (targetIndex < aliveEnemies.length - 1)
      hitTargets.push({ enemy: aliveEnemies[targetIndex + 1], isMain: false });
  }

  let isAnyBreak = false;

  hitTargets.forEach((t) => {
    const e = t.enemy;
    const activeMultiplier = t.isMain
      ? moveData.multiplier
      : moveData.multiplierAdj || moveData.multiplier;
    t.isCritHit = Math.random() < (attacker.critRate || 0.05) || isCinematic;

    const isWeak = e.weaknesses && e.weaknesses.includes(attacker.element);
    let isBreakHit = false;
    let brokeThisHit = false;

    if (isWeak && e.toughness !== undefined && !e.isBroken) {
      const tDmg = t.isMain
        ? moveData.toughnessDamage || 10
        : moveData.toughnessDamageAdj || 10;
      e.toughness = Math.max(0, e.toughness - tDmg);

      if (e.toughness === 0) {
        isBreakHit = true;
        brokeThisHit = true;
        isAnyBreak = true;
      }
    }

    const { normalDamage, breakDamage } = calculateDamage(
      attacker,
      e,
      activeMultiplier,
      isBreakHit,
      t.isCritHit,
    );

    if (brokeThisHit) {
      e.isBroken = true;

      // Emit after damage calc so the break-causing hit still uses the pre-broken 0.9 multiplier.
      EventBus.emit("onWeaknessBreak", { attacker, target: e });
    }

    t.finalDamage = normalDamage + breakDamage;
    addTotalDamage(t.finalDamage);

    if (isBreakHit) {
      spawnJuice(e, "WEAKNESS BREAK", true, 30, "#d7cfb8");
      playBreak();
    } else {
      playHeavyHit();
    }

    spawnJuice(e, normalDamage, t.isCritHit, moveData.shake, moveData.color);
    if (breakDamage > 0)
      setTimeout(() => spawnJuice(e, breakDamage, true, 40, "#47443b"), 100);
  });

  const anyCrit = hitTargets.some((t) => t.isCritHit);
  await sleep(anyCrit || isCinematic ? 200 : 100);

  hitTargets.forEach((t) => {
    t.enemy.hp = Math.max(0, t.enemy.hp - t.finalDamage);
    if (t.enemy.hp <= 0) spawnDeathExplosion(t.enemy);

    if (t.enemy.debuffs && t.enemy.hp > 0) {
      let entang = t.enemy.debuffs.find((db) => db.name === "ENTANGLEMENT");
      if (entang) entang.stacks = Math.min(5, (entang.stacks || 1) + 1);
    }
  });

  validateTargetSelection();
  if (isAnyBreak) await sleep(200);
  await sleep(action === "ATTACK" ? 150 : action === "SKILL" ? 250 : 350);

  attacker.targetOffsetY = 0;
  attacker.targetScale = 1.0;
  attacker.targetRotation = 0;

  if (isCinematic) state.fx.cinematic = false;
  state.isEnhanced = false;
  if (action !== "ULTIMATE" && attacker.id === state.activeUnitId)
    attacker.av = 10000 / (attacker.spd || 100);

  state.activeSkillName = null;
  await sleep(400);
  state.isAnimating = false;
}

export async function enemyAction(attacker) {
  if (state.current !== STATES.ENEMY_TURN) return;

  const aliveParty = party.filter((p) => p.hp > 0);
  if (aliveParty.length === 0) return;

  state.isAnimating = true;

  const totalAggro = aliveParty.reduce((sum, p) => sum + (p.aggro || 100), 0);

  // Roll a random number between 0 and the total aggro
  let randomRoll = Math.random() * totalAggro;

  // Subtract aggro from the roll until we hit a character
  let target = aliveParty[0]; // Safe fallback
  for (const hero of aliveParty) {
    const heroAggro = hero.aggro || 100; // Default to 100 if missing
    if (randomRoll < heroAggro) {
      target = hero;
      break;
    }
    randomRoll -= heroAggro;
  }
  const logicKeys = Object.keys(attacker.combatLogic || {});
  const moveKey = logicKeys[Math.floor(Math.random() * logicKeys.length)];
  const attackLogic = attacker.combatLogic[moveKey] ||
    attacker.combatLogic.basic || {
      name: "Attack",
      tag: "Single Target",
      multiplier: 1.0,
      shake: 10,
      color: "#47443b",
    };

  if (attacker.isBroken) {
    attacker.isBroken = false;
    attacker.toughness = attacker.baseToughness || 30;
  }

  state.activeSkillName = attackLogic.name;
  await sleep(500);

  attacker.targetOffsetY = 40;
  attacker.targetScale = 0.95;
  attacker.targetRotation = -0.05;
  await sleep(300);

  attacker.targetOffsetY = -80;
  attacker.targetScale = 1.15;
  attacker.targetRotation = 0.05;
  await sleep(80);

  const targetIndex = aliveParty.findIndex((p) => p.id === target.id);
  const hitTargets = [{ hero: target, isMain: true }];

  if (attackLogic.tag === "Blast") {
    if (targetIndex > 0)
      hitTargets.push({ hero: aliveParty[targetIndex - 1], isMain: false });
    if (targetIndex < aliveParty.length - 1)
      hitTargets.push({ hero: aliveParty[targetIndex + 1], isMain: false });
  }

  hitTargets.forEach((t) => {
    const h = t.hero;
    const activeMultiplier = t.isMain
      ? attackLogic.multiplier
      : attackLogic.multiplierAdj || attackLogic.multiplier;
    const { normalDamage } = calculateDamage(
      attacker,
      h,
      activeMultiplier,
      false,
      false,
    );
    const dmg = Math.max(1, normalDamage);

    if (attackLogic.energyGenToTarget) {
      h.energy = Math.min(
        h.maxEnergy || 120,
        (h.energy || 0) + attackLogic.energyGenToTarget,
      );
    }

    spawnJuice(h, dmg, false, attackLogic.shake, attackLogic.color);
    h.hp = Math.max(0, h.hp - dmg);
  });

  await sleep(100);

  hitTargets.forEach((t) => {
    if (t.hero.hp <= 0) spawnDeathExplosion(t.hero);
  });

  attacker.targetOffsetY = 0;
  attacker.targetScale = 1.0;
  attacker.targetRotation = 0;

  attacker.av = 10000 / (attacker.spd || 100);
  state.activeSkillName = null;

  await sleep(400);
  state.isAnimating = false;
}

export async function processTurnStart(unit) {
  state.isAnimating = true;

  // A data packet that mechanics can modify safely
  let turnData = { skipTurn: false, dotDamageTotal: 0 };

  // --- DECOUPLED EVENT: Let DoTs, Freezes, and Shields react to the turn starting ---
  EventBus.emit("onTurnStart", { unit, turnData });

  // Apply the collective damage compiled by the Event Bus
  if (turnData.dotDamageTotal > 0) {
    unit.hp = Math.max(0, unit.hp - turnData.dotDamageTotal);
    playHeavyHit();

    if (unit.hp <= 0) {
      spawnDeathExplosion(unit);
      turnData.skipTurn = true;
      validateTargetSelection();
    }
    await sleep(500);
  }

  state.isAnimating = false;
  return !turnData.skipTurn;
}

// --- NEW: INTELLIGENT TARGET REASSIGNMENT ---
function validateTargetSelection() {
  const aliveEnemies = enemies.filter((e) => e.hp > 0);
  if (aliveEnemies.length === 0) return;

  const isTargetAlive = aliveEnemies.some(
    (e) => e.id === state.selectedTargetId,
  );

  if (!isTargetAlive) {
    const oldTargetIndex = enemies.findIndex(
      (e) => e.id === state.selectedTargetId,
    );

    // Try to find the closest alive enemy to the right
    let nextTarget = enemies.find((e, idx) => e.hp > 0 && idx > oldTargetIndex);

    // If none to the right, try finding the closest to the left
    if (!nextTarget) {
      const reversedEnemies = [...enemies].reverse();
      nextTarget = reversedEnemies.find(
        (e, idx) => e.hp > 0 && enemies.length - 1 - idx < oldTargetIndex,
      );
    }

    if (nextTarget) {
      state.selectedTargetId = nextTarget.id;
    } else {
      state.selectedTargetId = aliveEnemies[0].id; // Safe fallback
    }
  }
}
