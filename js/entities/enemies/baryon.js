export const Baryon = {
  id: "e_baryon",
  name: "Baryon",
  level: 1,

  hp: 45,
  atk: 12,
  def: 210,
  spd: 83,

  toughness: 10,
  isBroken: false,
  weaknesses: ["Ice", "Wind"],

  offsetX: 0,
  offsetY: 0,
  flash: 0,

  combatLogic: {
    basic: {
      name: "Obliterate",
      tag: "Single Target",
      multiplier: 2.5,
      energyGenToTarget: 10,
      shake: 15,
      color: "#47443b",
    },
  },
};
