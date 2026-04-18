import { state, GAME_WIDTH, GAME_HEIGHT, CARD_SIZE } from "../core/state.js";

const MAX_PARTICLES = 250;
const MAX_SLASHES = 40;
const MAX_TEXTS = 30;
const MAX_STRINGS = 50;
const MAX_SHOCKS = 15;

let pIdx = 0;
let lIdx = 0;
let tIdx = 0;
let sIdx = 0;
let dIdx = 0;

export function spawnJuice(
  target,
  damageText,
  isCrit,
  shakeAmount,
  fxStyleOrColor,
) {
  const fxStyle =
    typeof fxStyleOrColor === "string"
      ? {
          particleColor: fxStyleOrColor,
          textColor: isCrit ? "#d7cfb8" : "#47443b",
          shockwaveMaxRadius: isCrit ? 200 : 100,
          shockwaveWidth: isCrit ? 16 : 8,
          particleCount: isCrit ? 60 : 20,
          particleSpeedMin: 5,
          particleSpeedMax: isCrit ? 45 : 25,
          particleMode: "burst",
          dataCodes: ["0xFF", "ERR", "NULL", "0x00", "WARN", "CRIT"],
        }
      : {
          particleColor: fxStyleOrColor?.particleColor || "#47443b",
          textColor: fxStyleOrColor?.textColor || (isCrit ? "#d7cfb8" : "#47443b"),
          shockwaveMaxRadius:
            fxStyleOrColor?.shockwaveMaxRadius || (isCrit ? 200 : 100),
          shockwaveWidth: fxStyleOrColor?.shockwaveWidth || (isCrit ? 16 : 8),
          particleCount:
            fxStyleOrColor?.particleCount || (isCrit ? 60 : 20),
          particleSpeedMin: fxStyleOrColor?.particleSpeedMin || 5,
          particleSpeedMax:
            fxStyleOrColor?.particleSpeedMax || (isCrit ? 45 : 25),
          particleMode: fxStyleOrColor?.particleMode || "burst",
          dataCodes:
            fxStyleOrColor?.dataCodes || ["0xFF", "ERR", "NULL", "0x00", "WARN", "CRIT"],
        };

  state.fx.shake = Math.max(
    state.fx.shake,
    isCrit ? shakeAmount * 1.5 : shakeAmount,
  );
  if (isCrit) {
    state.fx.invert = 4;
    state.fx.flash = 0.2;
  } else if (typeof damageText === "string") state.fx.flash = 0.6;
  else state.fx.flash = 0.1;

  target.flash = 1.0;
  target.offsetX += (Math.random() - 0.5) * (isCrit ? 100 : 50);
  target.offsetY -= isCrit ? 60 : 30;

  const tx =
    (target.renderX || GAME_WIDTH / 2) + CARD_SIZE / 2 + (target.offsetX || 0);
  const ty =
    (target.renderY || GAME_HEIGHT / 2) + CARD_SIZE / 2 + (target.offsetY || 0);

  state.fx.shockwaves[sIdx] = {
    x: tx,
    y: ty,
    radius: 10,
    maxRadius: fxStyle.shockwaveMaxRadius,
    width: fxStyle.shockwaveWidth,
    life: 1.0,
    color: fxStyle.particleColor,
  };
  sIdx = (sIdx + 1) % MAX_SHOCKS;

  state.fx.floatingTexts[tIdx] = {
    x: tx + (Math.random() - 0.5) * 40,
    y: ty,
    text:
      isCrit && typeof damageText === "number"
        ? `CRIT ${damageText}!`
        : `${damageText}`,
    color: fxStyle.textColor,
    life: 1.0,
    isCrit: isCrit,
    vy: isCrit ? -18 : -12,
  };
  tIdx = (tIdx + 1) % MAX_TEXTS;

  for (let i = 0; i < (isCrit ? 8 : 3); i++) {
    state.fx.dataStrings[dIdx] = {
      x: tx + (Math.random() - 0.5) * 120,
      y: ty + (Math.random() - 0.5) * 120,
      text: fxStyle.dataCodes[Math.floor(Math.random() * fxStyle.dataCodes.length)],
      life: 1.0,
      vy: Math.random() * -6 - 2,
    };
    dIdx = (dIdx + 1) % MAX_STRINGS;
  }

  const particleCount = fxStyle.particleCount;
  for (let i = 0; i < particleCount; i++) {
    let angle = Math.random() * Math.PI * 2;
    if (fxStyle.particleMode === "column") {
      angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    } else if (fxStyle.particleMode === "flare") {
      angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
    } else if (fxStyle.particleMode === "zigzag") {
      angle = (Math.random() < 0.5 ? -1 : 1) * (Math.PI / 4 + Math.random() * 0.8);
    } else if (fxStyle.particleMode === "sweep") {
      angle = Math.PI + (Math.random() - 0.5) * 1.2;
    } else if (fxStyle.particleMode === "orbit") {
      angle = Math.random() * Math.PI * 2;
    } else if (fxStyle.particleMode === "pillar") {
      angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.35;
    }

    const speed =
      Math.random() * (fxStyle.particleSpeedMax - fxStyle.particleSpeedMin) +
      fxStyle.particleSpeedMin;
    const vyBias =
      fxStyle.particleMode === "flare" || fxStyle.particleMode === "column"
        ? -4
        : fxStyle.particleMode === "pillar"
          ? -8
          : 0;
    state.fx.particles[pIdx] = {
      x: tx,
      y: ty,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + vyBias,
      life: 1.0,
      color: fxStyle.particleColor,
      size: Math.random() * 8 + 3,
      floorY: GAME_HEIGHT - Math.random() * 40,
    };
    pIdx = (pIdx + 1) % MAX_PARTICLES;
  }

  const slashCount = isCrit ? 3 : 1;
  for (let i = 0; i < slashCount; i++) {
    state.fx.slashes[lIdx] = {
      x: tx,
      y: ty + (Math.random() - 0.5) * 24,
      angle: (Math.random() - 0.5) * 0.8 + (isCrit ? 0.15 : -0.1),
      length: (isCrit ? 180 : 120) + Math.random() * 60,
      width: (isCrit ? 16 : 10) + Math.random() * 4,
      life: 1.0,
      color: fxStyle.particleColor,
      driftX: (Math.random() - 0.5) * 8,
      driftY: -2 - Math.random() * 3,
    };
    lIdx = (lIdx + 1) % MAX_SLASHES;
  }
}

export function spawnShieldJuice(target) {
  const tx =
    (target.renderX || GAME_WIDTH / 2) + CARD_SIZE / 2 + (target.offsetX || 0);
  const ty =
    (target.renderY || GAME_HEIGHT / 2) + CARD_SIZE / 2 + (target.offsetY || 0);

  state.fx.shockwaves[sIdx] = {
    x: tx,
    y: ty,
    radius: 18,
    maxRadius: 150,
    width: 10,
    life: 1.0,
    color: "#d7cfb8",
  };
  sIdx = (sIdx + 1) % MAX_SHOCKS;

  state.fx.floatingTexts[tIdx] = {
    x: tx,
    y: ty - 10,
    text: "SHIELD",
    color: "#d7cfb8",
    life: 1.2,
    isCrit: false,
    vy: -8,
  };
  tIdx = (tIdx + 1) % MAX_TEXTS;

  for (let i = 0; i < 24; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 14 + 4;
    state.fx.particles[pIdx] = {
      x: tx,
      y: ty,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      life: 1.0,
      color: "#d7cfb8",
      size: Math.random() * 6 + 2,
      floorY: GAME_HEIGHT - Math.random() * 40,
    };
    pIdx = (pIdx + 1) % MAX_PARTICLES;
  }
}

export function spawnDeathExplosion(target) {
  const tx =
    (target.renderX || GAME_WIDTH / 2) + CARD_SIZE / 2 + (target.offsetX || 0);
  const ty =
    (target.renderY || GAME_HEIGHT / 2) + CARD_SIZE / 2 + (target.offsetY || 0);

  state.fx.shockwaves[sIdx] = {
    x: tx,
    y: ty,
    radius: 20,
    maxRadius: 300,
    width: 20,
    life: 1.0,
    color: "#d7cfb8",
  };
  sIdx = (sIdx + 1) % MAX_SHOCKS;

  state.fx.floatingTexts[tIdx] = {
    x: tx,
    y: ty,
    text: "TERMINATED",
    color: "#47443b",
    life: 1.5,
    isCrit: true,
    vy: -4,
  };
  tIdx = (tIdx + 1) % MAX_TEXTS;

  const hexCodes = ["FATAL", "0x0000", "DELETED", "SYS_FAIL"];
  for (let i = 0; i < 8; i++) {
    state.fx.dataStrings[dIdx] = {
      x: tx + (Math.random() - 0.5) * 200,
      y: ty + (Math.random() - 0.5) * 200,
      text: hexCodes[Math.floor(Math.random() * hexCodes.length)],
      life: 1.5,
      vy: Math.random() * -2 - 1,
    };
    dIdx = (dIdx + 1) % MAX_STRINGS;
  }

  for (let i = 0; i < 35; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 50 + 10;
    state.fx.particles[pIdx] = {
      x: tx,
      y: ty,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.2,
      color: "#47443b",
      size: Math.random() * 12 + 4,
      floorY: GAME_HEIGHT - Math.random() * 40,
    };
    pIdx = (pIdx + 1) % MAX_PARTICLES;
  }
}

export function updateFXPhysics() {
  state.fx.shake *= 0.85;
  if (state.fx.flash > 0) state.fx.flash -= 0.05;
  if (state.fx.invert > 0) state.fx.invert -= 1;
  if (state.fx.totalDamage.life > 0) state.fx.totalDamage.life -= 0.02;

  for (let i = 0; i < state.fx.shockwaves.length; i++) {
    let sw = state.fx.shockwaves[i];
    if (sw.life <= 0) continue;
    sw.radius += (sw.maxRadius - sw.radius) * 0.15;
    sw.life -= 0.05;
  }
  for (let i = 0; i < state.fx.particles.length; i++) {
    let p = state.fx.particles[i];
    if (p.life <= 0) continue;
    p.vy += 1.8;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.94;
    p.vy *= 0.94;
    if (p.y > p.floorY) {
      p.y = p.floorY;
      p.vy *= -0.5;
      p.vx *= 0.7;
    }
    p.life -= 0.02;
  }
  for (let i = 0; i < state.fx.slashes.length; i++) {
    let slash = state.fx.slashes[i];
    if (!slash || slash.life <= 0) continue;
    slash.x += slash.driftX;
    slash.y += slash.driftY;
    slash.length *= 0.96;
    slash.width *= 0.94;
    slash.life -= 0.07;
  }
  for (let i = 0; i < state.fx.dataStrings.length; i++) {
    let d = state.fx.dataStrings[i];
    if (d.life <= 0) continue;
    d.y += d.vy;
    d.vy *= 0.9;
    d.life -= 0.02;
  }
  for (let i = 0; i < state.fx.floatingTexts.length; i++) {
    let t = state.fx.floatingTexts[i];
    if (t.life <= 0) continue;
    t.vy += 0.4;
    t.y += t.vy;
    t.vy *= 0.95;
    t.life -= 0.015;
  }
}

export function resetTotalDamage() {
  state.fx.totalDamage.value = 0;
  state.fx.totalDamage.life = 0;
}

export function addTotalDamage(amount) {
  state.fx.totalDamage.value += amount;
  state.fx.totalDamage.life = 2.5;
}
