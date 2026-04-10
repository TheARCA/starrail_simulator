import { state, GAME_WIDTH, GAME_HEIGHT, CARD_SIZE } from "../core/state.js";

// --- RING BUFFER CONFIGURATION ---
const MAX_PARTICLES = 250;
const MAX_TEXTS = 30;
const MAX_STRINGS = 50;
const MAX_SHOCKS = 15;

let pIdx = 0;
let tIdx = 0;
let sIdx = 0;
let dIdx = 0;

export function spawnJuice(
  target,
  damageText,
  isCrit,
  shakeAmount,
  particleColor,
) {
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

  // --- RING BUFFER INSERTIONS ---
  state.fx.shockwaves[sIdx] = {
    x: tx,
    y: ty,
    radius: 10,
    maxRadius: isCrit ? 200 : 100,
    width: isCrit ? 16 : 8,
    life: 1.0,
    color: particleColor,
  };
  sIdx = (sIdx + 1) % MAX_SHOCKS;

  state.fx.floatingTexts[tIdx] = {
    x: tx + (Math.random() - 0.5) * 40,
    y: ty,
    text:
      isCrit && typeof damageText === "number"
        ? `CRIT ${damageText}!`
        : `${damageText}`,
    color: isCrit ? "#d7cfb8" : "#47443b",
    life: 1.0,
    isCrit: isCrit,
    vy: isCrit ? -18 : -12,
  };
  tIdx = (tIdx + 1) % MAX_TEXTS;

  const hexCodes = ["0xFF", "ERR", "NULL", "0x00", "WARN", "CRIT"];
  for (let i = 0; i < (isCrit ? 8 : 3); i++) {
    state.fx.dataStrings[dIdx] = {
      x: tx + (Math.random() - 0.5) * 120,
      y: ty + (Math.random() - 0.5) * 120,
      text: hexCodes[Math.floor(Math.random() * hexCodes.length)],
      life: 1.0,
      vy: Math.random() * -6 - 2,
    };
    dIdx = (dIdx + 1) % MAX_STRINGS;
  }

  const particleCount = isCrit ? 60 : 20;
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * (isCrit ? 40 : 20) + 5;
    state.fx.particles[pIdx] = {
      x: tx,
      y: ty,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      color: particleColor,
      size: Math.random() * 8 + 3,
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
