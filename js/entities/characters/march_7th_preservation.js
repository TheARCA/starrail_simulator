export const March7thPreservation = {
  id: "march_7th",
  name: "March 7th",
  level: 1,
  element: "Ice",

  hp: 144,
  atk: 69,
  def: 78,
  spd: 101,
  aggro: 150, // Preservation path base aggro
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
      name: "Frigid Cold Arrow",
      tag: "Single Target",
      energyGen: 20,
      multiplier: 0.5,
      toughnessDamage: 10,
      shake: 10,
      color: "#8ad4eb", // Frosty Ice Blue
      description:
        "Deals %element% DMG equal to %mult% of March 7th's ATK to a single enemy.",
    },
    skill: {
      name: "The Power of Cuteness",
      tag: "Defense",
      targetType: "Ally",
      energyGen: 30,
      multiplier: 0, // No attack damage
      toughnessDamage: 0,
      shieldDefMult: 0.38,
      shieldFlat: 190,
      shieldDuration: 3,
      aggroModifier: 5.0, // +500% aggro modifier
      aggroThreshold: 0.3, // Requires 30% HP or higher
      shake: 5,
      color: "#ffb6c1", // Cute Pink
      description:
        "Provides a single ally with a Shield that can absorb DMG equal to 38% of March 7th's DEF plus 190 for 3 turn(s). If the ally's current HP percentage is 30% or higher, greatly increases the chance of enemies attacking that ally.",
    },
    ultimate: {
      name: "Glacial Cascade",
      tag: "AoE",
      cost: 120,
      energyGen: 5,
      multiplier: 0.9,
      hits: 4, // 25% + 25% + 25% + 25%
      hitDistribution: [0.25, 0.25, 0.25, 0.25],
      toughnessDamage: 20,
      baseFreezeChance: 0.5, // 50% base chance
      freezeDuration: 1,
      freezeDotMult: 0.3, // 30% ATK Additional DMG
      shake: 35,
      color: "#a4e2fc", // Bright Glacial Blue
      description: [
        "Deals %element% DMG equal to %mult% of March 7th's ATK to all enemies.",
        "Hit enemies have a 50% base chance to be Frozen for 1 turn(s).",
        "While Frozen, enemies cannot take action and will receive Ice Additional DMG equal to 30% of March 7th's ATK at the beginning of each turn.",
      ],
    },
  },
};
