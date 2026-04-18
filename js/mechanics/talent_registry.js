import { state } from "../core/state.js";
import { EventBus } from "../core/event_bus.js";
import { party } from "../data/characters/index.js";
import { enemies } from "../data/enemies/index.js";
import { spawnJuice, spawnDeathExplosion } from "../render/fx_manager.js";
import { playAttackDash, playHeavyHit, playBreak } from "../core/audio_manager.js";
import { getElementFxStyle } from "../utils/element_fx.js";
import { calculateDamage } from "../utils/math.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function emitTalentStateChanged(unit) {
  EventBus.emit("onTalentStateChanged", { unit });
}

const TALENT_REGISTRY = {
  follow_up_counter: {
    initializeState(unit, talent) {
      unit.counterState = {
        remaining: talent.replenishOnBattleStart
          ? talent.maxCharges || 0
          : unit.counterState?.remaining || 0,
      };
    },

    getIndicator(unit, talent) {
      return {
        name: talent.indicator?.name || "COUNTER",
        shortLabel: talent.indicator?.shortLabel || "CTR",
        displayValue: unit.counterState?.remaining ?? talent.maxCharges ?? 0,
        maxValue: talent.maxCharges || 0,
        persistAtZero: true,
      };
    },

    onShieldApplied({ attacker }) {
      const talent = attacker?.talent;
      if (!attacker || !talent?.replenishOnShieldApplied) return;

      attacker.counterState = {
        remaining: talent.maxCharges || 0,
      };
      emitTalentStateChanged(attacker);
    },

    tryQueueReactiveFollowUp({ sourceUnit, attacker, queue }) {
      const talent = sourceUnit?.talent;
      if (!sourceUnit || !attacker || !talent?.followUpMove) return;

      sourceUnit.counterState = sourceUnit.counterState || {
        remaining: talent.maxCharges || 0,
      };
      if ((sourceUnit.counterState.remaining || 0) <= 0) return;

      sourceUnit.counterState.remaining -= 1;
      emitTalentStateChanged(sourceUnit);

      queue.push({
        type: talent.kind,
        unitId: sourceUnit.id,
        targetId: attacker.id,
        label: talent.followUpMove.queueLabel || "FOLLOW",
        moveData: talent.followUpMove,
      });
    },

    async executeFollowUp(followUp) {
      const unit = party.find((member) => member.id === followUp.unitId && member.hp > 0);
      const target = enemies.find((enemy) => enemy.id === followUp.targetId && enemy.hp > 0);
      if (!unit || !target) return;

      const moveData = followUp.moveData || {};
      state.activeSkillName = moveData.name || unit.talent?.name || "Follow Up";
      await sleep(500);

      unit.targetOffsetY = 20;
      unit.targetScale = 0.95;
      unit.targetRotation = -0.08;
      await sleep(250);

      unit.targetOffsetY = -80;
      unit.targetScale = 1.15;
      unit.targetRotation = 0.08;
      playAttackDash();
      await sleep(100);

      let isBreakHit = false;
      let brokeThisHit = false;
      const isWeak = target.weaknesses && target.weaknesses.includes(unit.element);
      if (isWeak && target.toughness !== undefined && !target.isBroken) {
        target.toughness = Math.max(0, target.toughness - (moveData.toughnessDamage || 0));
        if (target.toughness === 0) {
          isBreakHit = true;
          brokeThisHit = true;
        }
      }

      const isCrit = Math.random() < (unit.critRate || 0.05);
      const { normalDamage, breakDamage } = calculateDamage(
        unit,
        target,
        moveData.multiplier || 0,
        isBreakHit,
        isCrit,
      );
      const totalDamage = Math.max(1, normalDamage + breakDamage);

      if (brokeThisHit) {
        target.isBroken = true;
        EventBus.emit("onWeaknessBreak", { attacker: unit, target });
        spawnJuice(target, "WEAKNESS BREAK", true, 24, "#d7cfb8");
        playBreak();
      }

      spawnJuice(
        target,
        totalDamage,
        isCrit,
        moveData.shake || 12,
        getElementFxStyle(unit.element),
      );
      playHeavyHit();
      target.hp = Math.max(0, target.hp - totalDamage);
      unit.energy = Math.min(
        unit.maxEnergy || 120,
        (unit.energy || 0) + (moveData.energyGen || 0),
      );

      if (target.hp <= 0) {
        spawnDeathExplosion(target);
      }

      await sleep(150);
      unit.targetOffsetY = 0;
      unit.targetScale = 1.0;
      unit.targetRotation = 0;
      state.activeSkillName = null;
      await sleep(400);
    },
  },

  break_atk_stack: {
    initializeState(unit) {
      unit.talentState = unit.talentState || {};
      unit.talentState.breakStacks = 0;
      unit.talentAtkPct = 0;
    },

    getIndicator(unit, talent) {
      return {
        name: talent.indicator?.name || "BREAK ATK",
        shortLabel: talent.indicator?.shortLabel || "ATK",
        displayValue: unit.talentState?.breakStacks || 0,
        maxValue: talent.maxStacks || 0,
        persistAtZero: false,
      };
    },

    onWeaknessBreak({ attacker }) {
      const talent = attacker?.talent;
      if (!attacker || !talent) return;

      attacker.talentState = attacker.talentState || {};
      attacker.talentState.breakStacks = Math.min(
        talent.maxStacks || 0,
        (attacker.talentState.breakStacks || 0) + 1,
      );
      attacker.talentAtkPct =
        (talent.breakAtkPctPerStack || 0) *
        (attacker.talentState.breakStacks || 0);
      emitTalentStateChanged(attacker);
    },
  },
};

function getHandlerForTalent(talent) {
  if (!talent?.kind) return null;
  return TALENT_REGISTRY[talent.kind] || null;
}

export function initializeTalentState(unit) {
  const talent = unit?.talent;
  const handler = getHandlerForTalent(talent);
  if (!handler?.initializeState) return;
  handler.initializeState(unit, talent);
}

export function getTalentIndicator(unit) {
  const talent = unit?.talent;
  const handler = getHandlerForTalent(talent);
  if (!handler?.getIndicator) return null;
  return handler.getIndicator(unit, talent);
}

export function handleTalentWeaknessBreak(attacker, target) {
  const handler = getHandlerForTalent(attacker?.talent);
  if (!handler?.onWeaknessBreak) return;
  handler.onWeaknessBreak({ attacker, target });
}

export function handleTalentShieldApplied(attacker, target, moveData, shield) {
  const handler = getHandlerForTalent(attacker?.talent);
  if (!handler?.onShieldApplied) return;
  handler.onShieldApplied({ attacker, target, moveData, shield });
}

export function queueReactiveTalentFollowUps({ sourceUnit, attacker, defender, queue }) {
  const handler = getHandlerForTalent(sourceUnit?.talent);
  if (!handler?.tryQueueReactiveFollowUp) return;
  handler.tryQueueReactiveFollowUp({ sourceUnit, attacker, defender, queue });
}

export async function executeTalentFollowUp(followUp) {
  const handler = TALENT_REGISTRY[followUp?.type];
  if (!handler?.executeFollowUp) return;
  await handler.executeFollowUp(followUp);
}
