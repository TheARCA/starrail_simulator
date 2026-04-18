import { EventBus } from "../core/event_bus.js";
import { spawnJuice } from "../render/fx_manager.js";
import { calculateBreakDoT, calculateDamage } from "../utils/math.js";
import { setCurrentActionGauge, syncActionValue } from "../utils/speed.js";
import {
  getTalentIndicator,
  handleTalentShieldApplied,
  handleTalentWeaknessBreak,
  initializeTalentState,
} from "./talent_registry.js";

export function initMechanics() {
  console.log("SYS // Status Manager Online");

  const upsertStatusIndicator = (
    unit,
    {
      name,
      displayValue,
      maxValue,
      shortLabel = name,
      persistAtZero = false,
    },
  ) => {
    unit.statusBadges = unit.statusBadges || [];
    const existing = unit.statusBadges.find((badge) => badge.name === name);

    if (!persistAtZero && (displayValue == null || displayValue <= 0)) {
      if (existing) {
        unit.statusBadges = unit.statusBadges.filter((badge) => badge !== existing);
      }
      return;
    }

    const nextBadge = {
      name,
      displayValue,
      maxValue,
      shortLabel,
    };

    if (existing) {
      Object.assign(existing, nextBadge);
    } else {
      unit.statusBadges.push(nextBadge);
    }
  };

  const refreshTalentIndicator = (unit) => {
    const indicator = getTalentIndicator(unit);
    if (!indicator) return;
    upsertStatusIndicator(unit, indicator);
  };

  EventBus.on("onBattleStart", ({ party }) => {
    party.forEach((unit) => {
      unit.statusBadges = [];
      unit.talentState = unit.talentState || {};
      unit.talentAtkPct = 0;
      initializeTalentState(unit);
      refreshTalentIndicator(unit);
    });
  });

  EventBus.on("onWeaknessBreak", ({ attacker }) => {
    handleTalentWeaknessBreak(attacker);
    refreshTalentIndicator(attacker);
  });

  EventBus.on("onShieldApplied", ({ attacker, target, moveData, shield }) => {
    handleTalentShieldApplied(attacker, target, moveData, shield);
    refreshTalentIndicator(attacker);
  });

  EventBus.on("onTalentStateChanged", ({ unit }) => {
    refreshTalentIndicator(unit);
  });

  EventBus.on("onTurnStart", ({ unit, turnData }) => {
    if (unit.shield) {
      unit.shield.duration -= 1;
      if (unit.shield.duration <= 0 || unit.shield.value <= 0) {
        unit.shield = null;
      }
    }

    if (!unit.debuffs || unit.debuffs.length === 0) return;

    for (let i = unit.debuffs.length - 1; i >= 0; i--) {
      let d = unit.debuffs[i];

      if (d.type === "DoT" || d.name === "FREEZE" || d.name === "ENTANGLEMENT") {
        const exactDamage = d.abilityMultiplier
          ? calculateDamage(
              d.attacker || unit,
              unit,
              d.abilityMultiplier,
              false,
              false,
            ).normalDamage
          : calculateBreakDoT(d.attacker || unit, unit, d);
        if (exactDamage > 0) {
          turnData.dotDamageTotal += exactDamage;
          // The mechanic spawns its own damage numbers!
          spawnJuice(unit, Math.floor(exactDamage), false, 15, "#47443b");
        }
      }

      if (d.name === "FREEZE") {
        turnData.skipTurn = true;
        setCurrentActionGauge(unit, 5000); // 50% Action Advance on Unfreeze
      }

      if (d.name === "IMPRISONMENT" && d.duration === 1) {
        unit.spdPct = (unit.spdPct || 0) - (d.spdPctDelta || -0.1);
        syncActionValue(unit);
      }

      d.duration -= 1;
      if (d.duration <= 0) unit.debuffs.splice(i, 1);
    }
  });
}
