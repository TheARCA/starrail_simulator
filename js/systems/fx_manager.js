import { state, GAME_WIDTH, GAME_HEIGHT, CARD_SIZE } from "../core/state.js";

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

  state.fx.shockwaves.push({
    x: tx,
    y: ty,
    radius: 10,
    maxRadius: isCrit ? 200 : 100,
    width: isCrit ? 16 : 8,
    life: 1.0,
    color: particleColor,
  });

  state.fx.floatingTexts.push({
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
  });

  const hexCodes = ["0xFF", "ERR", "NULL", "0x00", "WARN", "CRIT"];
  for (let i = 0; i < (isCrit ? 8 : 3); i++) {
    state.fx.dataStrings.push({
      x: tx + (Math.random() - 0.5) * 120,
      y: ty + (Math.random() - 0.5) * 120,
      text: hexCodes[Math.floor(Math.random() * hexCodes.length)],
      life: 1.0,
      vy: Math.random() * -6 - 2,
    });
  }

  const particleCount = isCrit ? 60 : 20;
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * (isCrit ? 40 : 20) + 5;
    state.fx.particles.push({
      x: tx,
      y: ty,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      color: particleColor,
      size: Math.random() * 8 + 3,
      floorY: ty + 120 + Math.random() * 80,
    });
  }

  while (state.fx.particles.length > 250) state.fx.particles.shift();
  while (state.fx.floatingTexts.length > 30) state.fx.floatingTexts.shift();
  while (state.fx.dataStrings.length > 50) state.fx.dataStrings.shift();
  while (state.fx.shockwaves.length > 15) state.fx.shockwaves.shift();
}

export function spawnDeathExplosion(target) {
  const tx =
    (target.renderX || GAME_WIDTH / 2) + CARD_SIZE / 2 + (target.offsetX || 0);
  const ty =
    (target.renderY || GAME_HEIGHT / 2) + CARD_SIZE / 2 + (target.offsetY || 0);

  state.fx.shockwaves.push({
    x: tx,
    y: ty,
    radius: 20,
    maxRadius: 300,
    width: 20,
    life: 1.0,
    color: "#d7cfb8",
  });
  state.fx.floatingTexts.push({
    x: tx,
    y: ty,
    text: "TERMINATED",
    color: "#47443b",
    life: 1.5,
    isCrit: true,
    vy: -4,
  });

  const hexCodes = ["FATAL", "0x0000", "DELETED", "SYS_FAIL"];
  for (let i = 0; i < 8; i++) {
    state.fx.dataStrings.push({
      x: tx + (Math.random() - 0.5) * 200,
      y: ty + (Math.random() - 0.5) * 200,
      text: hexCodes[Math.floor(Math.random() * hexCodes.length)],
      life: 1.5,
      vy: Math.random() * -2 - 1,
    });
  }

  for (let i = 0; i < 35; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 50 + 10;
    state.fx.particles.push({
      x: tx,
      y: ty,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.2,
      color: "#47443b",
      size: Math.random() * 12 + 4,
      floorY: ty + 150 + Math.random() * 50,
    });
  }

  while (state.fx.particles.length > 200) state.fx.particles.shift();
  while (state.fx.floatingTexts.length > 25) state.fx.floatingTexts.shift();
  while (state.fx.dataStrings.length > 40) state.fx.dataStrings.shift();
  while (state.fx.shockwaves.length > 15) state.fx.shockwaves.shift();
}

// THIS IS THE NEW PHYSICS TICK - It does math, but doesn't draw anything!
export function updateFXPhysics() {
  state.fx.shake *= 0.85;
  if (state.fx.flash > 0) state.fx.flash -= 0.05;
  if (state.fx.invert > 0) state.fx.invert -= 1;

  for (let i = state.fx.shockwaves.length - 1; i >= 0; i--) {
    let sw = state.fx.shockwaves[i];
    sw.radius += (sw.maxRadius - sw.radius) * 0.15;
    sw.life -= 0.05;
    if (sw.life <= 0) state.fx.shockwaves.splice(i, 1);
  }
  for (let i = state.fx.particles.length - 1; i >= 0; i--) {
    let p = state.fx.particles[i];
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
    if (p.life <= 0) state.fx.particles.splice(i, 1);
  }
  for (let i = state.fx.dataStrings.length - 1; i >= 0; i--) {
    let d = state.fx.dataStrings[i];
    d.y += d.vy;
    d.vy *= 0.9;
    d.life -= 0.02;
    if (d.life <= 0) state.fx.dataStrings.splice(i, 1);
  }
  for (let i = state.fx.floatingTexts.length - 1; i >= 0; i--) {
    let t = state.fx.floatingTexts[i];
    t.vy += 0.4;
    t.y += t.vy;
    t.vy *= 0.95;
    t.life -= 0.015;
    if (t.life <= 0) state.fx.floatingTexts.splice(i, 1);
  }
}
