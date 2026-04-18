import { EventBus } from "../core/event_bus.js";
import { spawnJuice } from "../render/fx_manager.js";
import { calculateBreakDoT, calculateDamage } from "../utils/math.js";
import { setCurrentActionGauge, syncActionValue } from "../utils/speed.js";

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

  const updateMarchCounterIndicator = (unit) => {
    if (!unit?.talent || unit.talent.statusName !== "COUNTER") return;
    const remaining = unit.counterState?.remaining ?? unit.talent.maxTriggersPerTurn;
    upsertStatusIndicator(unit, {
      name: unit.talent.statusName,
      shortLabel: "CTR",
      displayValue: remaining,
      maxValue: unit.talent.maxTriggersPerTurn || 2,
      persistAtZero: true,
    });
  };

  const updateTrailblazerBreakIndicator = (unit) => {
    if (unit?.id !== "trailblazer_destruction" || !unit.talent) return;
    upsertStatusIndicator(unit, {
      name: "BREAK ATK",
      shortLabel: "ATK",
      displayValue: unit.talentState?.breakStacks || 0,
      maxValue: unit.talent.maxStacks || 2,
      persistAtZero: false,
    });
  };

  EventBus.on("onBattleStart", ({ party }) => {
    party.forEach((unit) => {
      unit.statusBadges = [];
      unit.talentState = unit.talentState || {};
      unit.talentAtkPct = 0;

      if (unit.id === "trailblazer_destruction") {
        unit.talentState.breakStacks = 0;
        updateTrailblazerBreakIndicator(unit);
      }

      if (unit.id === "march_7th_preservation") {
        unit.counterState = {
          remaining: unit.talent?.maxTriggersPerTurn || 2,
        };
        updateMarchCounterIndicator(unit);
      }
    });
  });

  EventBus.on("onWeaknessBreak", ({ attacker }) => {
    if (attacker?.id !== "trailblazer_destruction" || !attacker.talent) return;

    attacker.talentState = attacker.talentState || {};
    attacker.talentState.breakStacks = Math.min(
      attacker.talent.maxStacks || 2,
      (attacker.talentState.breakStacks || 0) + 1,
    );
    attacker.talentAtkPct =
      (attacker.talent.breakAtkPctPerStack || 0) *
      (attacker.talentState.breakStacks || 0);
    updateTrailblazerBreakIndicator(attacker);
  });

  EventBus.on("onCounterStateChanged", ({ unit }) => {
    updateMarchCounterIndicator(unit);
  });

  EventBus.on("onTalentStateChanged", ({ unit }) => {
    updateTrailblazerBreakIndicator(unit);
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
