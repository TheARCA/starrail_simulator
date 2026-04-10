export const Antibaryon = {
  id: "e_antibaryon",
  name: "Antibaryon",
  level: 1,

  hp: 45,
  atk: 12,
  def: 210,
  spd: 83,

  toughness: 10,
  isBroken: false,
  weaknesses: ["Quantum", "Physical"], // Added Physical for testing

  offsetX: 0,
  offsetY: 0,
  flash: 0,

  combatLogic: {
    basic: {
      name: "Malice Delete",
      multiplier: 1.0,
      shake: 10,
      color: "#47443b",
    },
  },
};
