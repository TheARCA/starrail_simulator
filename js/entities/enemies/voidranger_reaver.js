export const VoidrangerReaver = {
  id: "e_voidranger_reaver",
  name: "Voidranger: Reaver",
  level: 1,
  element: "Imaginary", // Drives the RES math

  hp: 112,
  atk: 12,
  def: 210, // Base level 1 math
  spd: 100,

  toughness: 20,
  isBroken: false,
  weaknesses: ["Physical", "Lightning"],

  offsetX: 0,
  offsetY: 0,
  flash: 0,

  combatLogic: {
    basic: {
      name: "Hunting Blade",
      tag: "Single Target",
      multiplier: 2.5,
      energyGenToTarget: 10,
      shake: 15,
      color: "#47443b",
    },
    skill: {
      name: "Vortex Leap",
      tag: "Blast",
      multiplier: 1.5,
      multiplierAdj: 1.5,
      energyGenToTarget: 5,
      shake: 25,
      color: "#47443b",
    },
  },
};
