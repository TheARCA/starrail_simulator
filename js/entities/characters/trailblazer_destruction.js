export const TrailblazerDestruction = {
  id: "tb_destruction",
  name: "Trailblazer: Destruction",
  level: 1,
  element: "Physical", // Needed for weakness break math

  hp: 163,
  atk: 84,
  def: 62,
  spd: 100,
  aggro: 125,
  critRate: 0.05,
  critDmg: 0.5,
  breakEffect: 0.0,

  energy: 0,
  maxEnergy: 120,

  offsetX: 0,
  offsetY: 0,
  flash: 0,

  combatLogic: {
    basic: {
      name: "Farewell Hit",
      tag: "Single Target",
      energyGen: 120,
      multiplier: 0.5,
      toughnessDamage: 10,
      shake: 10,
      color: "#d7cfb8",
      description:
        "Deals %element% DMG equal to %mult% of the Trailblazer's ATK to a single enemy.",
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
      description:
        "Deals %element% DMG equal to %mult% of the Trailblazer's ATK to a single enemy and enemies adjacent to it.",
    },
    ultimate: {
      name: "Stardust Ace",
      tag: "Enhance",
      cost: 120,
      energyGen: 0,
      // --- NEW: Description is now an Array for paragraphs! ---
      description: [
        "Choose between two attack modes to deliver a full strike.",
        "Blowout: Farewell Hit deals %element% DMG equal to %multBasic% of the Trailblazer's ATK to a single enemy.",
        "Blowout: RIP Home Run deals %element% DMG equal to %multSkill% of the Trailblazer's ATK to a single enemy, and %element% DMG equal to %multSkillAdj% of the Trailblazer's ATK to enemies adjacent to it.",
      ],
      modes: {
        blowoutBasic: {
          name: "Blowout: Farewell Hit",
          tag: "Single Target",
          multiplier: 3.0, // e.g. 300%
          toughnessDamage: 20,
          shake: 30,
          color: "#d7cfb8",
          description:
            "Deals %element% DMG equal to %mult% of the Trailblazer's ATK to a single enemy.",
        },
        blowoutSkill: {
          name: "Blowout: RIP Home Run",
          tag: "Blast",
          multiplier: 1.8, // e.g. 180%
          multiplierAdj: 1.08, // e.g. 108%
          toughnessDamage: 30,
          toughnessDamageAdj: 15,
          shake: 40,
          color: "#47443b",
          description:
            "Deals %element% DMG equal to %mult% of Trailblazer's ATK to a single enemy and %element% DMG equal to %multAdj% of Trailblazer's ATK to enemies adjacent to it.",
        },
      },
    },
  },
};
