export const TrailblazerDestruction = {
  id: "tb_destruction",
  name: "Trailblazer: Destruction",
  level: 1,
  element: "Physical", // Needed for weakness break math

  hp: 163,
  atk: 84,
  def: 62,
  spd: 100,
  energy: 0,
  maxEnergy: 120,

  offsetX: 0,
  offsetY: 0,
  flash: 0,

  combatLogic: {
    basic: {
      name: "Farewell Hit",
      tag: "Single Target",
      energyGen: 20,
      multiplier: 0.5,
      toughnessDamage: 10,
      shake: 10,
      color: "#d7cfb8",
    },
    skill: {
      name: "RIP Home Run",
      tag: "Blast",
      energyGen: 30,
      multiplier: 0.625,
      multiplierAdj: 0.625,
      toughnessDamage: 20,
      toughnessDamageAdj: 10,
      shake: 20,
      color: "#47443b",
    },
    ultimate: {
      name: "Stardust Ace",
      tag: "Enhance",
      cost: 120,
      energyGen: 0,
      modes: {
        blowoutBasic: {
          name: "Blowout: Farewell Hit",
          tag: "Single Target",
          multiplier: 0.8, // Example enhanced multiplier
          toughnessDamage: 20,
          shake: 30,
          color: "#d7cfb8",
        },
        blowoutSkill: {
          name: "Blowout: RIP Home Run",
          tag: "Blast",
          multiplier: 1.0, // Example enhanced multiplier
          multiplierAdj: 0.8,
          toughnessDamage: 30,
          toughnessDamageAdj: 15,
          shake: 40,
          color: "#47443b",
        },
      },
    },
  },
};
