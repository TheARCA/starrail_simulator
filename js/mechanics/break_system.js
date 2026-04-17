import { EventBus } from "../core/event_bus.js";

export function initBreakSystem() {
  console.log("SYS // Break System Online");

  EventBus.on("onWeaknessBreak", ({ attacker, target }) => {
    const breakEffect = attacker.breakEffect || 0;
    const effectHitRate = attacker.effectHitRate || 0;
    const effectRes = target.effectRes || 0;
    const element = attacker.element || "Physical";
    const isElite = target.isElite || false;
    const breakDebuffChance = Math.max(
      0,
      1.5 * (1 + effectHitRate) * (1 - effectRes),
    );

    let actualDelay = 2500 / (target.spd || 100);
    target.debuffs = target.debuffs || [];

    let dName = "BLEED",
      dType = "DoT",
      dDur = 2,
      dStacks = 1;

    if (element === "Fire") {
      dName = "BURN";
    } else if (element === "Wind") {
      dName = "WIND SHEAR";
      dStacks = isElite ? 3 : 1;
    } else if (element === "Lightning") {
      dName = "SHOCK";
    } else if (element === "Ice") {
      dName = "FREEZE";
      dType = "Disable";
      dDur = 1;
    } else if (element === "Quantum") {
      dName = "ENTANGLEMENT";
      dType = "Delay";
      dDur = 1;
      actualDelay = (2000 * (1 + breakEffect)) / (target.spd || 100);
    } else if (element === "Imaginary") {
      dName = "IMPRISONMENT";
      dType = "Delay";
      dDur = 1;
      actualDelay = (3000 * (1 + breakEffect)) / (target.spd || 100);
      target.spd = (target.spd || 100) * 0.9;
    }

    target.av += actualDelay;

    if (Math.random() >= Math.min(1, breakDebuffChance)) {
      return;
    }

    let existing = target.debuffs.find((db) => db.name === dName);
    if (existing) {
      existing.duration = dDur;
      if (element === "Wind")
        existing.stacks = Math.min(5, (existing.stacks || 1) + dStacks);
    } else {
      target.debuffs.push({
        name: dName,
        type: dType,
        duration: dDur,
        stacks: dStacks,
        attacker: attacker,
      });
    }
  });
}
