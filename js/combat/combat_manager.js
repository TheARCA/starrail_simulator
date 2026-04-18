import { STATES, state } from "../core/state.js";
import { party } from "../data/characters/index.js";
import { enemies } from "../data/enemies/index.js";
import { EventBus } from "../core/event_bus.js";
import {
  spawnJuice,
  spawnShieldJuice,
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
import { getElementFxStyle } from "../utils/element_fx.js";
import { calculateDamage } from "../utils/math.js";
import { resetActionValue } from "../utils/speed.js";
import { applyShield, absorbDamageWithShield } from "../mechanics/shields.js";
import { getEffectiveAggro } from "../mechanics/aggro_system.js";
import { applyMoveStatusEffects } from "../mechanics/status_effects.js";
import {
  queueReactiveFollowUps,
  resolveQueuedFollowUps,
} from "../mechanics/follow_up.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getMoveData(action, attacker) {
  const logic = attacker.combatLogic;

  if (state.isEnhanced) {
    if (action === "ATTACK") return logic.ultimate.modes.blowoutBasic;
    if (action === "SKILL") return logic.ultimate.modes.blowoutSkill;
    return null;
  }

  if (action === "ATTACK") return logic.basic;
  if (action === "SKILL") return logic.skill;
  if (action === "ULTIMATE") return logic.ultimate;
  return null;
}

function getSelectedAlly(attacker) {
  const aliveParty = party.filter((p) => p.hp > 0);
  return (
    aliveParty.find((p) => p.id === state.selectedAllyId) ||
    aliveParty.find((p) => p.id === attacker.id) ||
    aliveParty[0]
  );
}

function buildHitTargets(moveData, target, aliveEnemies) {
  if (moveData.tag === "AoE") {
    return aliveEnemies.map((enemy) => ({
      enemy,
      isMain: true,
      finalDamage: 0,
      isCritHit: false,
      didDie: false,
    }));
  }

  const targetIndex = aliveEnemies.findIndex((e) => e.id === target.id);
  const hitTargets = [
    {
      enemy: target,
      isMain: true,
      finalDamage: 0,
      isCritHit: false,
      didDie: false,
    },
  ];

  if (moveData.tag === "Blast") {
    if (targetIndex > 0) {
      hitTargets.push({
        enemy: aliveEnemies[targetIndex - 1],
        isMain: false,
        finalDamage: 0,
        isCritHit: false,
        didDie: false,
      });
    }
    if (targetIndex < aliveEnemies.length - 1) {
      hitTargets.push({
        enemy: aliveEnemies[targetIndex + 1],
        isMain: false,
        finalDamage: 0,
        isCritHit: false,
        didDie: false,
      });
    }
  }

  return hitTargets;
}

function getHitMultipliers(moveData, isMain) {
  const baseMultiplier = isMain
    ? moveData.multiplier
    : moveData.multiplierAdj || moveData.multiplier;
  const hitDistribution =
    moveData.hits > 1 && Array.isArray(moveData.hitDistribution)
      ? moveData.hitDistribution
      : [1];
  return hitDistribution.map((portion) => baseMultiplier * portion);
}

function getHitToughnessValues(moveData, isMain) {
  const totalToughness = isMain
    ? moveData.toughnessDamage || 0
    : moveData.toughnessDamageAdj || moveData.toughnessDamage || 0;
  const hitCount =
    moveData.hits > 1 && Array.isArray(moveData.hitDistribution)
      ? moveData.hitDistribution.length
      : 1;

  if (hitCount <= 1) return [totalToughness];

  const perHit = Math.floor(totalToughness / hitCount);
  const remainder = totalToughness - perHit * hitCount;
  return Array.from({ length: hitCount }, (_, index) =>
    perHit + (index < remainder ? 1 : 0),
  );
}

export async function executeCombatSequence(action, attacker) {
  const aliveEnemies = enemies.filter((e) => e.hp > 0);
  if (aliveEnemies.length === 0) return;

  state.pendingAction = null;
  state.isAnimating = true;

  const target =
    enemies.find((e) => e.id === state.selectedTargetId && e.hp > 0) ||
    aliveEnemies[0];
  const moveData = getMoveData(action, attacker);
  const actionFxStyle = getElementFxStyle(attacker.element);

  if (!moveData) {
    state.isAnimating = false;
    return;
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
    if (action === "ATTACK") {
      state.sp = Math.min(state.maxSp || 5, (state.sp || 0) + 1);
    } else if (action === "SKILL") {
      state.sp = Math.max(0, (state.sp || 0) - 1);
    }
  }
  await sleep(500);

  if (moveData.energyGen) {
    attacker.energy = Math.min(
      attacker.maxEnergy || 120,
      (attacker.energy || 0) + moveData.energyGen,
    );
  }

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

  attacker.targetOffsetY =
    moveData.tag === "Defense"
      ? -50
      : isCinematic
        ? -180
        : action === "SKILL"
          ? -120
          : -80;
  attacker.targetScale = isCinematic ? 1.3 : 1.15;
  attacker.targetRotation = moveData.tag === "Defense" ? 0.03 : 0.08;
  if (moveData.tag !== "Defense") playAttackDash();
  await sleep(100);

  let isAnyBreak = false;
  let anyCrit = false;

  if (moveData.tag === "Defense") {
    const allyTarget = getSelectedAlly(attacker);
    if (allyTarget) {
      applyShield(attacker, allyTarget, moveData);
      spawnShieldJuice(allyTarget);
    }
  } else {
    const hitTargets = buildHitTargets(moveData, target, aliveEnemies);
    const hitCount = Math.max(
      1,
      moveData.hits > 1 && Array.isArray(moveData.hitDistribution)
        ? moveData.hitDistribution.length
        : 1,
    );

    for (let hitIndex = 0; hitIndex < hitCount; hitIndex++) {
      hitTargets.forEach((t) => {
        const enemy = t.enemy;
        if (enemy.hp <= 0) return;

        const hitMultipliers = getHitMultipliers(moveData, t.isMain);
        const hitToughnessValues = getHitToughnessValues(moveData, t.isMain);
        const activeMultiplier = hitMultipliers[hitIndex] || 0;
        const toughnessDamage = hitToughnessValues[hitIndex] || 0;

        if (activeMultiplier <= 0 && toughnessDamage <= 0) return;

        if (!t.isCritHit) {
          t.isCritHit = Math.random() < (attacker.critRate || 0.05) || isCinematic;
          anyCrit = anyCrit || t.isCritHit;
        }

        const isWeak =
          enemy.weaknesses && enemy.weaknesses.includes(attacker.element);
        let isBreakHit = false;
        let brokeThisHit = false;

        if (isWeak && enemy.toughness !== undefined && !enemy.isBroken) {
          enemy.toughness = Math.max(0, enemy.toughness - toughnessDamage);

          if (enemy.toughness === 0) {
            isBreakHit = true;
            brokeThisHit = true;
            isAnyBreak = true;
          }
        }

        const { normalDamage, breakDamage } = calculateDamage(
          attacker,
          enemy,
          activeMultiplier,
          isBreakHit,
          t.isCritHit,
        );

        if (brokeThisHit) {
          enemy.isBroken = true;
          EventBus.emit("onWeaknessBreak", { attacker, target: enemy });
        }

        const hitDamage = normalDamage + breakDamage;
        t.finalDamage += hitDamage;
        addTotalDamage(hitDamage);

        if (isBreakHit) {
          spawnJuice(enemy, "WEAKNESS BREAK", true, 30, "#d7cfb8");
          playBreak();
        } else if (hitDamage > 0) {
          playHeavyHit();
        }

        if (normalDamage > 0) {
          spawnJuice(enemy, normalDamage, t.isCritHit, moveData.shake, actionFxStyle);
        }
        if (breakDamage > 0) {
          setTimeout(() => spawnJuice(enemy, breakDamage, true, 40, "#47443b"), 100);
        }

        enemy.hp = Math.max(0, enemy.hp - hitDamage);
        if (enemy.hp <= 0 && !t.didDie) {
          spawnDeathExplosion(enemy);
          t.didDie = true;
        }
      });

      if (hitCount > 1 && hitIndex < hitCount - 1) {
        await sleep(120);
      }
    }

    hitTargets.forEach((t) => {
      applyMoveStatusEffects(attacker, t.enemy, moveData);

      if (t.enemy.debuffs && t.enemy.hp > 0) {
        const entang = t.enemy.debuffs.find((db) => db.name === "ENTANGLEMENT");
        if (entang) entang.stacks = Math.min(5, (entang.stacks || 1) + 1);
      }
    });

    await sleep(anyCrit || isCinematic ? 200 : 100);
  }

  validateTargetSelection();
  if (isAnyBreak) await sleep(200);
  await sleep(action === "ATTACK" ? 150 : action === "SKILL" ? 250 : 350);

  attacker.targetOffsetY = 0;
  attacker.targetScale = 1.0;
  attacker.targetRotation = 0;

  if (isCinematic) state.fx.cinematic = false;
  state.isEnhanced = false;
  if (
    action !== "ULTIMATE" &&
    attacker.id === state.activeUnitId &&
    state.extraTurnUnitId !== attacker.id
  ) {
    resetActionValue(attacker);
  }

  state.activeSkillName = null;
  await sleep(400);
  state.isAnimating = false;
}

export async function enemyAction(attacker) {
  if (state.current !== STATES.ENEMY_TURN) return;

  const aliveParty = party.filter((p) => p.hp > 0);
  if (aliveParty.length === 0) return;

  state.isAnimating = true;

  const totalAggro = aliveParty.reduce((sum, p) => sum + getEffectiveAggro(p), 0);
  let randomRoll = Math.random() * totalAggro;

  let target = aliveParty[0];
  for (const hero of aliveParty) {
    const heroAggro = getEffectiveAggro(hero);
    if (randomRoll < heroAggro) {
      target = hero;
      break;
    }
    randomRoll -= heroAggro;
  }

  const logicKeys = Object.keys(attacker.combatLogic || {});
  const attackFxStyle = getElementFxStyle(attacker.element || "Physical");
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

  attacker.targetOffsetY = 20;
  attacker.targetScale = 0.95;
  attacker.targetRotation = -0.08;
  await sleep(250);

  attacker.targetOffsetY = attackLogic.tag === "Blast" ? -120 : -80;
  attacker.targetScale = 1.15;
  attacker.targetRotation = 0.08;
  playAttackDash();
  await sleep(100);

  const targetIndex = aliveParty.findIndex((p) => p.id === target.id);
  const hitTargets = [{ hero: target, isMain: true }];

  if (attackLogic.tag === "Blast") {
    if (targetIndex > 0) {
      hitTargets.push({ hero: aliveParty[targetIndex - 1], isMain: false });
    }
    if (targetIndex < aliveParty.length - 1) {
      hitTargets.push({ hero: aliveParty[targetIndex + 1], isMain: false });
    }
  }

  hitTargets.forEach((t) => {
    const hero = t.hero;
    const hadShield = !!hero.shield;
    const shieldSourceId = hero.shield?.sourceId || null;
    const activeMultiplier = t.isMain
      ? attackLogic.multiplier
      : attackLogic.multiplierAdj || attackLogic.multiplier;
    const { normalDamage } = calculateDamage(
      attacker,
      hero,
      activeMultiplier,
      false,
      false,
    );
    const dmg = Math.max(1, normalDamage);
    const { hpDamage, absorbed } = absorbDamageWithShield(hero, dmg);
    if (absorbed > 0) {
      hero.shieldFlash = Math.max(hero.shieldFlash || 0, 0.65);
    }

    if (attackLogic.energyGenToTarget) {
      hero.energy = Math.min(
        hero.maxEnergy || 120,
        (hero.energy || 0) + attackLogic.energyGenToTarget,
      );
    }

    if (hpDamage > 0) {
      spawnJuice(hero, hpDamage, false, attackLogic.shake, attackFxStyle);
    } else if (absorbed > 0) {
      spawnJuice(hero, "BLOCK", false, attackLogic.shake, "#d7cfb8");
    }

    hero.hp = Math.max(0, hero.hp - hpDamage);

    if (hadShield && hero.hp > 0) {
      queueReactiveFollowUps({
        attacker,
        defender: hero,
        shieldSourceId,
      });
    }
  });

  await sleep(100);

  hitTargets.forEach((t) => {
    if (t.hero.hp <= 0) spawnDeathExplosion(t.hero);
  });

  attacker.targetOffsetY = 0;
  attacker.targetScale = 1.0;
  attacker.targetRotation = 0;

  resetActionValue(attacker);
  state.activeSkillName = null;

  await sleep(800);
  await resolveQueuedFollowUps();
  await sleep(400);
  state.isAnimating = false;
}

export async function processTurnStart(unit) {
  state.isAnimating = true;

  const turnData = { skipTurn: false, dotDamageTotal: 0 };
  EventBus.emit("onTurnStart", { unit, turnData });

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

function validateTargetSelection() {
  const aliveEnemies = enemies.filter((e) => e.hp > 0);
  if (aliveEnemies.length === 0) return;

  const isTargetAlive = aliveEnemies.some((e) => e.id === state.selectedTargetId);
  if (isTargetAlive) return;

  const oldTargetIndex = enemies.findIndex((e) => e.id === state.selectedTargetId);
  let nextTarget = enemies.find((e, idx) => e.hp > 0 && idx > oldTargetIndex);

  if (!nextTarget) {
    const reversedEnemies = [...enemies].reverse();
    nextTarget = reversedEnemies.find(
      (e, idx) => e.hp > 0 && enemies.length - 1 - idx < oldTargetIndex,
    );
  }

  state.selectedTargetId = nextTarget ? nextTarget.id : aliveEnemies[0].id;
}
