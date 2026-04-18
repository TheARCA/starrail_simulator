const DARK = "#47443b";
const LIGHT = "#d7cfb8";
const WARM = "#c7b59a";
const SOFT = "#b8ad97";

const ELEMENT_FX = {
  Physical: {
    particleColor: DARK,
    textColor: DARK,
    shockwaveMaxRadius: 95,
    shockwaveWidth: 10,
    particleCount: 18,
    particleSpeedMin: 8,
    particleSpeedMax: 24,
    particleMode: "burst",
    dataCodes: ["MASS", "CRUSH", "KIN", "0x50", "IMPACT", "BREACH"],
  },
  Ice: {
    particleColor: LIGHT,
    textColor: DARK,
    shockwaveMaxRadius: 120,
    shockwaveWidth: 6,
    particleCount: 24,
    particleSpeedMin: 6,
    particleSpeedMax: 18,
    particleMode: "column",
    dataCodes: ["ICE", "LOCK", "ZERO", "FROST", "0x1C", "GLASS"],
  },
  Fire: {
    particleColor: WARM,
    textColor: DARK,
    shockwaveMaxRadius: 140,
    shockwaveWidth: 9,
    particleCount: 28,
    particleSpeedMin: 8,
    particleSpeedMax: 22,
    particleMode: "flare",
    dataCodes: ["BURN", "ASH", "HEAT", "0xF1", "EMBER", "RADIANT"],
  },
  Lightning: {
    particleColor: LIGHT,
    textColor: DARK,
    shockwaveMaxRadius: 130,
    shockwaveWidth: 5,
    particleCount: 26,
    particleSpeedMin: 10,
    particleSpeedMax: 26,
    particleMode: "zigzag",
    dataCodes: ["ARC", "SURGE", "0xEE", "SPIKE", "GRID", "FLASH"],
  },
  Wind: {
    particleColor: SOFT,
    textColor: DARK,
    shockwaveMaxRadius: 110,
    shockwaveWidth: 4,
    particleCount: 20,
    particleSpeedMin: 10,
    particleSpeedMax: 22,
    particleMode: "sweep",
    dataCodes: ["GUST", "SHEAR", "FLOW", "0x0A", "DRIFT", "CUT"],
  },
  Quantum: {
    particleColor: LIGHT,
    textColor: DARK,
    shockwaveMaxRadius: 100,
    shockwaveWidth: 7,
    particleCount: 22,
    particleSpeedMin: 6,
    particleSpeedMax: 16,
    particleMode: "orbit",
    dataCodes: ["QBIT", "NULL", "PHASE", "0xQ4", "LENS", "SHIFT"],
  },
  Imaginary: {
    particleColor: WARM,
    textColor: DARK,
    shockwaveMaxRadius: 125,
    shockwaveWidth: 8,
    particleCount: 18,
    particleSpeedMin: 7,
    particleSpeedMax: 18,
    particleMode: "pillar",
    dataCodes: ["FIELD", "BIND", "SEAL", "0x77", "AXIS", "ORDER"],
  },
};

export function getElementFxStyle(element) {
  return ELEMENT_FX[element] || ELEMENT_FX.Physical;
}
