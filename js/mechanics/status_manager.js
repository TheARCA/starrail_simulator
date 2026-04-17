import { EventBus } from "../core/event_bus.js";
import { calculateBreakDoT } from "../combat/damage_calc.js";
import { spawnJuice } from "../render/fx_manager.js";

export function initMechanics() {
  console.log("SYS // Status Manager Online");

  EventBus.on("onTurnStart", ({ unit, turnData }) => {
    if (!unit.debuffs || unit.debuffs.length === 0) return;

    for (let i = unit.debuffs.length - 1; i >= 0; i--) {
      let d = unit.debuffs[i];

      if (
        d.type === "DoT" ||
        d.name === "FREEZE" ||
        d.name === "ENTANGLEMENT"
      ) {
        const exactDamage = calculateBreakDoT(d.attacker || unit, unit, d);
        if (exactDamage > 0) {
          turnData.dotDamageTotal += exactDamage;
          // The mechanic spawns its own damage numbers!
          spawnJuice(unit, Math.floor(exactDamage), false, 15, "#47443b");
        }
      }

      if (d.name === "FREEZE") {
        turnData.skipTurn = true;
        unit.av = 5000 / (unit.spd || 100); // 50% Action Advance on Unfreeze
      }

      if (d.name === "IMPRISONMENT" && d.duration === 1) {
        unit.spd = (unit.spd || 90) / 0.9; // Restore 10% SPD
      }

      d.duration -= 1;
      if (d.duration <= 0) unit.debuffs.splice(i, 1);
    }
  });
}
