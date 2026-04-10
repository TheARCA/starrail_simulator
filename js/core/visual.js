import { updateFXPhysics } from "../systems/fx_manager.js";
import {
  STATES,
  state,
  mouse,
  GAME_WIDTH,
  GAME_HEIGHT,
  CARD_SIZE,
  UI_PANEL,
  btnAttack,
  btnSkill,
  btnUltimate,
  btnStartBattle,
  btnClearEnemies,
} from "./state.js";
import { DATABASE_HEROES, party } from "../data/hero_db.js";
import { DATABASE_ENEMIES, enemies } from "../data/enemy_db.js";

let canvas, ctx;

const NIER_BG = "#b5b19b";
const NIER_DARK = "#47443b";
const NIER_LIGHT = "#d7cfb8";

const spritePlaceholder = new Image();
spritePlaceholder.src = `https://placehold.co/${CARD_SIZE}x${CARD_SIZE}/47443b/d7cfb8/png?text=DATA`;

function resizeCanvas() {
  const windowRatio = window.innerWidth / window.innerHeight;
  const gameRatio = GAME_WIDTH / GAME_HEIGHT;
  let newWidth, newHeight;

  if (windowRatio > gameRatio) {
    newHeight = window.innerHeight;
    newWidth = newHeight * gameRatio;
  } else {
    newWidth = window.innerWidth;
    newHeight = newWidth / gameRatio;
  }
  canvas.style.width = `${newWidth}px`;
  canvas.style.height = `${newHeight}px`;
}

export function initVisuals() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  document.fonts.ready.then(() => requestAnimationFrame(render));
}

function drawTextWithCA(
  text,
  x,
  y,
  mainColor,
  strokeColor = null,
  strokeWidth = 0,
) {
  ctx.save();
  const sColor = ctx.shadowColor;
  const sBlur = ctx.shadowBlur;
  const sOffsetX = ctx.shadowOffsetX;
  const sOffsetY = ctx.shadowOffsetY;
  ctx.shadowColor = "transparent";

  if (strokeColor && strokeWidth > 0) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = "rgba(255, 50, 50, 0.4)";
    ctx.strokeText(text, x - 1.5, y);
    ctx.strokeStyle = "rgba(50, 200, 255, 0.4)";
    ctx.strokeText(text, x + 1.5, y);
  }
  ctx.fillStyle = "rgba(255, 50, 50, 0.5)";
  ctx.fillText(text, x - 1.5, y);
  ctx.fillStyle = "rgba(50, 200, 255, 0.5)";
  ctx.fillText(text, x + 1.5, y);

  ctx.shadowColor = sColor;
  ctx.shadowBlur = sBlur;
  ctx.shadowOffsetX = sOffsetX;
  ctx.shadowOffsetY = sOffsetY;

  if (strokeColor && strokeWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = mainColor;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function strokeWithCA(mainColor, lineWidth) {
  ctx.save();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = lineWidth;
  ctx.translate(-1.5, 0);
  ctx.strokeStyle = "rgba(255, 50, 50, 0.3)";
  ctx.stroke();
  ctx.translate(3, 0);
  ctx.strokeStyle = "rgba(50, 200, 255, 0.3)";
  ctx.stroke();
  ctx.restore();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = mainColor;
  ctx.stroke();
}

function applyHardShadow() {
  ctx.shadowColor = "rgba(71, 68, 59, 0.25)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 12;
  ctx.shadowOffsetY = 12;
}
function clearShadow() {
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// --- NEW: SMART MULTILINE TEXT WRAPPER ---
function getWrappedText(ctx, text, maxW, initialFontSize, fontWeight) {
  let fontSize = initialFontSize;
  let lines = [];

  while (fontSize > 10) {
    ctx.font = `${fontWeight} ${fontSize}px 'NewRodin', sans-serif`;
    const words = text.split(" ");
    lines = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
      if (ctx.measureText(currentLine + " " + words[i]).width <= maxW) {
        currentLine += " " + words[i];
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);

    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    // If it fits in max 2 lines AND the widest line isn't overflowing, we are good!
    if (lines.length <= 2 && widest <= maxW) break;

    // Otherwise, shrink the font and try again
    fontSize -= 1;
  }
  return { lines, fontSize };
}
function isInside(x, y, rect) {
  return x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h;
}
function calculateXPosition(index, totalCards, cardSize, screenWidth) {
  // Use a fixed, tight gap between cards so they don't stretch weirdly
  const gap = 30;

  // Calculate how wide the entire group of cards is
  const totalGroupWidth = totalCards * cardSize + (totalCards - 1) * gap;

  // Perfectly center the group to the true middle of the screen
  let startX = (screenWidth - totalGroupWidth) / 2;

  // Safety clamp: Just in case the group gets insanely wide,
  // ensure it never crosses into the 240px Action Order HUD.
  startX = Math.max(260, startX);

  return startX + index * (cardSize + gap);
}
function getMenuRect(index, total, startY) {
  const w = 240;
  const h = 70;
  const spacing = 30;
  const totalW = total * w + (total - 1) * spacing;
  const startX = (GAME_WIDTH - totalW) / 2;
  return { x: startX + index * (w + spacing), y: startY, w, h };
}

function drawChamferedRect(x, y, w, h, cutSize) {
  ctx.beginPath();
  ctx.moveTo(x + cutSize, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - cutSize);
  ctx.lineTo(x + w - cutSize, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + cutSize);
  ctx.closePath();
}

function drawBackground() {
  ctx.fillStyle = NIER_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const timeOffset = (performance.now() / 40) % 120;
  ctx.beginPath();
  for (let i = -120; i < GAME_HEIGHT; i += 120) {
    ctx.moveTo(0, i + timeOffset);
    ctx.lineTo(GAME_WIDTH, i + timeOffset);
  }
  for (let i = 0; i < GAME_WIDTH; i += 120) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i, GAME_HEIGHT);
  }
  strokeWithCA("rgba(71, 68, 59, 0.15)", 1);

  if (state.isAnimating) {
    ctx.beginPath();
    for (let i = 0; i < 40; i++) {
      let ax = Math.random() * GAME_WIDTH;
      let ay = Math.random() * GAME_HEIGHT;
      let len = Math.random() * 300 + 100;
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - len, ay);
    }
    strokeWithCA("rgba(71, 68, 59, 0.2)", 1);
  }
}

function drawMainMenu() {
  drawBackground();
  ctx.font = "300 48px 'NewRodin', sans-serif";
  ctx.textAlign = "center";
  ctx.letterSpacing = "4px";
  drawTextWithCA(
    "HONKAI: STAR RAIL - 2D REIMAGINED",
    GAME_WIDTH / 2,
    140,
    NIER_DARK,
  );
  ctx.letterSpacing = "0px";
  ctx.font = "600 20px 'NewRodin', sans-serif";
  drawTextWithCA(
    `SELECT SQUAD [ ${party.length} / 4 ]`,
    GAME_WIDTH / 2,
    260,
    "rgba(71, 68, 59, 0.7)",
  );

  DATABASE_HEROES.forEach((hero, i) => {
    const rect = getMenuRect(i, DATABASE_HEROES.length, 300);
    drawMenuToggle(
      rect,
      hero.name,
      party.some((p) => p.id === hero.id),
    );
  });

  drawTextWithCA(
    `SELECT TARGETS [ ${enemies.length} / 5 ]`,
    GAME_WIDTH / 2,
    480,
    "rgba(71, 68, 59, 0.7)",
  );
  if (enemies.length > 0 && typeof btnClearEnemies !== "undefined") {
    btnClearEnemies.x = GAME_WIDTH / 2 + 160;
    btnClearEnemies.y = 458;
    drawButton(btnClearEnemies, btnClearEnemies.text, false);
  }

  DATABASE_ENEMIES.forEach((enemy, i) => {
    const rect = getMenuRect(i, DATABASE_ENEMIES.length, 520);
    drawMenuCounter(
      rect,
      enemy.name,
      enemies.filter((e) => e.name === enemy.name).length,
    );
  });

  if (party.length > 0 && enemies.length > 0) {
    drawButton(btnStartBattle, btnStartBattle.text, true);
  } else {
    ctx.save();
    ctx.fillStyle = "rgba(71, 68, 59, 0.1)";
    drawChamferedRect(
      btnStartBattle.x,
      btnStartBattle.y,
      btnStartBattle.w,
      btnStartBattle.h,
      20,
    );
    ctx.fill();
    strokeWithCA("rgba(71, 68, 59, 0.3)", 1);
    ctx.font = "400 24px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawTextWithCA(
      "AWAITING SELECTIONS",
      btnStartBattle.x + btnStartBattle.w / 2,
      btnStartBattle.y + btnStartBattle.h / 2,
      "rgba(71, 68, 59, 0.5)",
    );
    ctx.restore();
  }
}

function drawMenuToggle(rect, text, isSelected) {
  const hovered = isInside(mouse.x, mouse.y, rect);
  ctx.save();
  applyHardShadow();
  ctx.fillStyle = NIER_LIGHT;
  drawChamferedRect(rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  clearShadow();
  let textColor;
  if (isSelected) {
    ctx.fillStyle = NIER_DARK;
    ctx.fill();
    textColor = NIER_LIGHT;
  } else if (hovered) {
    ctx.fillStyle = "rgba(71, 68, 59, 0.1)";
    ctx.fill();
    strokeWithCA(NIER_DARK, 1);
    textColor = NIER_DARK;
  } else {
    strokeWithCA("rgba(71, 68, 59, 0.3)", 1);
    textColor = "rgba(71, 68, 59, 0.7)";
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const { lines, fontSize } = getWrappedText(ctx, text, rect.w - 20, 20, 500);
  const textY = rect.y + rect.h / 2;

  if (lines.length === 2) {
    drawTextWithCA(
      lines[0],
      rect.x + rect.w / 2,
      textY - fontSize / 2 + 2,
      textColor,
    );
    drawTextWithCA(
      lines[1],
      rect.x + rect.w / 2,
      textY + fontSize / 2 + 2,
      textColor,
    );
  } else {
    drawTextWithCA(lines[0], rect.x + rect.w / 2, textY, textColor);
  }
  ctx.restore();
}

function drawMenuCounter(rect, text, count) {
  const hovered = isInside(mouse.x, mouse.y, rect);
  ctx.save();
  applyHardShadow();
  ctx.fillStyle = NIER_LIGHT;
  drawChamferedRect(rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  clearShadow();
  let textColor;
  if (count > 0) {
    ctx.fillStyle = NIER_DARK;
    ctx.fill();
    textColor = NIER_LIGHT;
  } else if (hovered) {
    ctx.fillStyle = "rgba(71, 68, 59, 0.1)";
    ctx.fill();
    strokeWithCA(NIER_DARK, 1);
    textColor = NIER_DARK;
  } else {
    strokeWithCA("rgba(71, 68, 59, 0.3)", 1);
    textColor = "rgba(71, 68, 59, 0.7)";
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const { lines, fontSize } = getWrappedText(ctx, text, rect.w - 20, 20, 500);
  const textY = rect.y + rect.h / 2;

  if (lines.length === 2) {
    drawTextWithCA(
      lines[0],
      rect.x + rect.w / 2,
      textY - fontSize / 2 + 2,
      textColor,
    );
    drawTextWithCA(
      lines[1],
      rect.x + rect.w / 2,
      textY + fontSize / 2 + 2,
      textColor,
    );
  } else {
    drawTextWithCA(lines[0], rect.x + rect.w / 2, textY, textColor);
  }

  if (count > 0) {
    const bx = rect.x + rect.w - 12;
    const by = rect.y + 12;
    ctx.beginPath();
    ctx.arc(bx, by, 14, 0, Math.PI * 2);
    ctx.fillStyle = NIER_LIGHT;
    ctx.fill();
    ctx.font = "800 14px 'NewRodin', sans-serif";
    drawTextWithCA(count.toString(), bx, by + 1, NIER_DARK);
  }
  ctx.restore();
}

function drawCard(entity, base_x, base_y, isEnemy = false) {
  if (entity.targetOffsetX === undefined) entity.targetOffsetX = 0;
  if (entity.targetOffsetY === undefined) entity.targetOffsetY = 0;
  if (entity.targetScale === undefined) entity.targetScale = 1.0;
  if (entity.targetRotation === undefined) entity.targetRotation = 0.0;
  if (entity.offsetX === undefined) entity.offsetX = 0;
  if (entity.offsetY === undefined) entity.offsetY = 0;
  if (entity.scale === undefined) entity.scale = 1.0;
  if (entity.rotation === undefined) entity.rotation = 0.0;
  if (entity.animX === undefined) entity.animX = base_x;
  if (entity.animY === undefined) entity.animY = base_y;
  if (entity.displayEnergy === undefined)
    entity.displayEnergy = entity.energy || 0;

  entity.animX += (base_x - entity.animX) * 0.15;
  entity.animY += (base_y - entity.animY) * 0.15;

  if (entity.hp <= 0) {
    entity.targetOffsetY = 150;
    entity.targetScale = 0.0;
    entity.targetRotation = (entity.id.length % 2 === 0 ? 1 : -1) * 0.8;
  }

  entity.offsetX += (entity.targetOffsetX - entity.offsetX) * 0.25;
  entity.offsetY += (entity.targetOffsetY - entity.offsetY) * 0.25;
  entity.scale += (entity.targetScale - entity.scale) * 0.25;
  entity.rotation += (entity.targetRotation - entity.rotation) * 0.25;
  entity.renderX = entity.animX;
  entity.renderY = entity.animY;

  if (entity.catchupHp === undefined) entity.catchupHp = entity.hp;
  entity.displayHp += (entity.hp - entity.displayHp) * 0.25;
  entity.catchupHp += (entity.displayHp - entity.catchupHp) * 0.05;
  entity.displayEnergy += ((entity.energy || 0) - entity.displayEnergy) * 0.2;
  entity.flash = Math.max(0, entity.flash - 0.05);

  const time = performance.now();
  const floatY = Math.sin(time / 400 + entity.animX) * 6;
  const x = entity.animX + entity.offsetX;
  const y = entity.animY + entity.offsetY + (entity.hp > 0 ? floatY : 0);
  const cardHeight = CARD_SIZE + 100;
  const centerX = x + CARD_SIZE / 2;
  const centerY = y + cardHeight / 2;

  const isHovered =
    mouse.x > x &&
    mouse.x < x + CARD_SIZE &&
    mouse.y > y &&
    mouse.y < y + cardHeight;
  let isTargeted = isEnemy && state.selectedTargetId === entity.id;
  let isAdjacent = false;

  // Render outline logic relative to the ACTIVE character's queued attack
  if (
    isEnemy &&
    state.pendingAction &&
    state.current === STATES.PLAYER_TURN &&
    !state.isAnimating
  ) {
    const activeChar =
      party.find((p) => p.id === state.activeUnitId) || party[0];
    if (activeChar) {
      const logic = activeChar.combatLogic;
      let moveData;
      if (state.isEnhanced)
        moveData =
          state.pendingAction === "ATTACK"
            ? logic.ultimate.modes.blowoutBasic
            : logic.ultimate.modes.blowoutSkill;
      else
        moveData =
          state.pendingAction === "ATTACK"
            ? logic.basic
            : state.pendingAction === "SKILL"
              ? logic.skill
              : logic.ultimate;

      if (moveData && moveData.tag === "Blast") {
        const aliveEnemies = enemies.filter(
          (e) => e.hp > 0 || (e.scale !== undefined && e.scale >= 0.05),
        );
        const tIdx = aliveEnemies.findIndex(
          (e) => e.id === state.selectedTargetId,
        );
        const myIdx = aliveEnemies.findIndex((e) => e.id === entity.id);
        if (myIdx === tIdx - 1 || myIdx === tIdx + 1) isAdjacent = true;
      }
    }
  }

  const isDimmed =
    state.current === STATES.PLAYER_TURN &&
    isEnemy &&
    !isTargeted &&
    !isAdjacent &&
    state.pendingAction;

  ctx.save();
  if (isDimmed) ctx.globalAlpha = 0.3;
  if (entity.hp <= 0) ctx.globalAlpha = Math.max(0, entity.scale);

  ctx.translate(centerX, centerY);
  ctx.scale(entity.scale, entity.scale);
  ctx.rotate(entity.rotation);
  ctx.translate(-centerX, -centerY);

  applyHardShadow();
  ctx.fillStyle = NIER_LIGHT;
  drawChamferedRect(x, y, CARD_SIZE, cardHeight, 20);
  ctx.fill();
  clearShadow();

  if (
    (isHovered || isTargeted || isAdjacent) &&
    entity.hp > 0 &&
    !state.isAnimating
  ) {
    ctx.save();
    let bounce = isTargeted
      ? Math.sin(time / 150) * 6
      : Math.sin(time / 200) * 3;
    let chevronY = y - 20 + bounce;
    let chevronSize = isTargeted ? 16 : 10;
    let thickness = isTargeted ? 4 : 2;
    let alpha = isTargeted ? 1.0 : isAdjacent ? 0.6 : 0.3;

    ctx.translate(x + CARD_SIZE / 2, chevronY);
    ctx.beginPath();
    ctx.moveTo(-chevronSize, -chevronSize);
    ctx.lineTo(0, 0);
    ctx.lineTo(chevronSize, -chevronSize);
    strokeWithCA(`rgba(71, 68, 59, ${alpha})`, thickness);
    if (isTargeted) {
      ctx.beginPath();
      ctx.moveTo(-chevronSize + 4, -chevronSize - 10);
      ctx.lineTo(0, -10);
      ctx.lineTo(chevronSize - 4, -chevronSize - 10);
      strokeWithCA(`rgba(71, 68, 59, ${alpha})`, thickness - 1);
    }
    ctx.restore();
  }

  drawChamferedRect(x, y, CARD_SIZE, cardHeight, 20);
  let cardStrokeColor = "rgba(71, 68, 59, 0.3)";
  let cardStrokeWidth = 1;

  if (isTargeted) {
    cardStrokeColor = NIER_DARK;
    cardStrokeWidth = 3;
  } else if (isAdjacent) {
    cardStrokeColor = "rgba(71, 68, 59, 0.6)";
    cardStrokeWidth = 2;
  } else if (isHovered) {
    cardStrokeColor = "rgba(71, 68, 59, 0.5)";
    cardStrokeWidth = 2;
  }
  strokeWithCA(cardStrokeColor, cardStrokeWidth);

  if (spritePlaceholder.complete && spritePlaceholder.naturalHeight !== 0) {
    ctx.save();
    drawChamferedRect(x + 10, y + 10, CARD_SIZE - 20, CARD_SIZE - 20, 15);
    ctx.clip();
    ctx.drawImage(
      spritePlaceholder,
      x + 10,
      y + 10,
      CARD_SIZE - 20,
      CARD_SIZE - 20,
    );
    ctx.restore();
  }

  // --- SMART MULTILINE ANCHORING ---
  ctx.textAlign = "center";

  // Create a safe center anchor for the text (Higher for enemies to make room for icons)
  let nameY = isEnemy ? y + CARD_SIZE + 18 : y + CARD_SIZE + 28;
  const { lines, fontSize } = getWrappedText(
    ctx,
    entity.name.toUpperCase(),
    CARD_SIZE - 20,
    24,
    600,
  );

  if (lines.length === 2) {
    // If it wraps, push line 1 UP and line 2 DOWN from the center anchor
    drawTextWithCA(
      lines[0],
      x + CARD_SIZE / 2,
      nameY - fontSize / 2,
      NIER_DARK,
    );
    drawTextWithCA(
      lines[1],
      x + CARD_SIZE / 2,
      nameY + fontSize / 2,
      NIER_DARK,
    );
  } else {
    // Single line sits right perfectly on the center anchor
    drawTextWithCA(lines[0], x + CARD_SIZE / 2, nameY, NIER_DARK);
  }

  const barX = x + 20;
  const barW = CARD_SIZE - 40;
  let hpBarY = y + CARD_SIZE + 72; // Standardized HP bar Y for both

  if (entity.baseHp === undefined) entity.baseHp = entity.hp;
  if (entity.baseToughness === undefined)
    entity.baseToughness = entity.toughness;

  if (isEnemy) {
    if (entity.weaknesses && entity.weaknesses.length > 0) {
      const iconSize = 18;
      const gap = 6;
      const totalWidth =
        entity.weaknesses.length * iconSize +
        (entity.weaknesses.length - 1) * gap;
      let startX = x + CARD_SIZE / 2 - totalWidth / 2;
      let iconY = y + CARD_SIZE + 36;

      entity.weaknesses.forEach((weakness, idx) => {
        const ix = startX + idx * (iconSize + gap);
        ctx.fillStyle = "rgba(71, 68, 59, 0.8)";
        drawChamferedRect(ix, iconY, iconSize, iconSize, 4);
        ctx.fill();
        ctx.font = "800 12px 'NewRodin', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        drawTextWithCA(
          weakness.charAt(0).toUpperCase(),
          ix + iconSize / 2,
          iconY + iconSize / 2 + 1,
          NIER_LIGHT,
        );
      });
      ctx.textBaseline = "alphabetic";
    }

    if (entity.baseToughness !== undefined && entity.baseToughness > 0) {
      const toughY = hpBarY - 8;
      const toughPercent = Math.max(
        0,
        Math.min(1, entity.toughness / entity.baseToughness),
      );
      ctx.fillStyle = "rgba(71, 68, 59, 0.15)";
      ctx.fillRect(barX, toughY, barW, 4);
      if (!entity.isBroken) {
        ctx.fillStyle = "rgba(71, 68, 59, 0.5)";
        ctx.fillRect(barX, toughY, barW * toughPercent, 4);
      } else {
        ctx.font = "800 10px 'NewRodin', sans-serif";
        ctx.textAlign = "center";
        drawTextWithCA(
          "WEAKNESS BROKEN",
          x + CARD_SIZE / 2,
          toughY + 5,
          "#D32F2F",
        );
      }
    }
  } else {
    ctx.font = "400 16px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    const hpColor =
      entity.hp <= 0 ? "rgba(71, 68, 59, 0.4)" : "rgba(71, 68, 59, 0.8)";
    drawTextWithCA(
      `${Math.ceil(entity.hp)} / ${entity.baseHp} HP`,
      x + CARD_SIZE / 2,
      y + CARD_SIZE + 56,
      hpColor,
    );
  }

  const hpPercent = Math.max(0, Math.min(1, entity.hp / entity.baseHp));
  ctx.fillStyle = "rgba(71, 68, 59, 0.2)";
  ctx.fillRect(barX, hpBarY, barW, 4);
  ctx.fillStyle = NIER_DARK;
  ctx.fillRect(barX, hpBarY, barW * hpPercent, 4);

  if (!isEnemy) {
    const enPercent = Math.max(
      0,
      Math.min(1, entity.displayEnergy / (entity.maxEnergy || 120)),
    );
    const enBarY = hpBarY + 8;
    ctx.fillStyle = "rgba(71, 68, 59, 0.15)";
    ctx.fillRect(barX, enBarY, barW, 4);
    ctx.fillStyle = "rgba(71, 68, 59, 0.5)";
    ctx.fillRect(barX, enBarY, barW * enPercent, 4);
  }

  if (entity.flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${entity.flash})`;
    drawChamferedRect(x, y, CARD_SIZE, cardHeight, 20);
    ctx.fill();
  }
  ctx.restore();
}

function drawJuice() {
  // Purely reading state, no math or array splicing!
  for (let i = state.fx.shockwaves.length - 1; i >= 0; i--) {
    let sw = state.fx.shockwaves[i];
    ctx.globalAlpha = Math.max(0, sw.life);
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    strokeWithCA(sw.color, Math.max(0.1, sw.width * sw.life));
    ctx.globalAlpha = 1.0;
  }
  for (let i = state.fx.particles.length - 1; i >= 0; i--) {
    let p = state.fx.particles[i];
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
    ctx.lineWidth = Math.max(1, p.size * p.life);
    ctx.strokeStyle = p.color === "#FFF" ? NIER_DARK : p.color;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }
  for (let i = state.fx.dataStrings.length - 1; i >= 0; i--) {
    let d = state.fx.dataStrings[i];
    ctx.globalAlpha = Math.max(0, d.life);
    ctx.font = "400 14px 'NewRodin', monospace";
    ctx.fillStyle = NIER_DARK;
    ctx.fillText(d.text, d.x, d.y);
    ctx.globalAlpha = 1.0;
  }
  for (let i = state.fx.floatingTexts.length - 1; i >= 0; i--) {
    let t = state.fx.floatingTexts[i];
    ctx.save();
    ctx.translate(t.x, t.y);
    let scale = Math.min(1, (1.0 - t.life) * 8);
    if (t.isCrit) scale *= 1.3;
    ctx.scale(scale, scale);
    ctx.font = "800 48px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    ctx.globalAlpha = t.life;
    const sColor = t.isCrit ? NIER_DARK : NIER_LIGHT;
    const fColor = t.isCrit ? NIER_LIGHT : NIER_DARK;
    drawTextWithCA(t.text, 0, 0, fColor, sColor, 8);
    ctx.restore();
  }
}

// --- NEW: ACTION VALUE TIMELINE HUD ---
function drawActionBar() {
  const aliveEnemies = enemies.filter((e) => e.hp > 0);
  const aliveParty = party.filter((p) => p.hp > 0);
  let allUnits = [...aliveParty, ...aliveEnemies];
  if (allUnits.length === 0) return;

  // Sort dynamically for the visual queue
  allUnits.sort((a, b) => (a.av || 0) - (b.av || 0));

  const startX = 40;
  const startY = 80;

  ctx.save();
  ctx.font = "400 12px 'NewRodin', sans-serif";
  ctx.textAlign = "left";
  drawTextWithCA("ACTION ORDER", startX, startY - 20, "rgba(71, 68, 59, 0.7)");

  allUnits.forEach((u, i) => {
    // Only draw the top 8 in the queue to save screen space
    if (i > 7) return;

    const isPlayer = aliveParty.some((p) => p.id === u.id);
    const isActive = i === 0 && !state.isAnimating;

    // Shift active unit slightly to the right
    const xOffset = isActive ? 10 : 0;
    const yPos = startY + i * 55;

    applyHardShadow();
    ctx.fillStyle = NIER_LIGHT;
    drawChamferedRect(startX + xOffset, yPos, 160, 45, 8);
    ctx.fill();
    clearShadow();

    ctx.fillStyle = "rgba(71, 68, 59, 0.1)";
    ctx.fill();
    strokeWithCA(
      isActive ? NIER_DARK : "rgba(71, 68, 59, 0.4)",
      isActive ? 2 : 1,
    );

    // Initial Icon Box
    ctx.fillStyle = isPlayer ? NIER_DARK : "rgba(71, 68, 59, 0.5)";
    drawChamferedRect(startX + xOffset + 6, yPos + 6, 33, 33, 4);
    ctx.fill();

    ctx.fillStyle = NIER_LIGHT;
    ctx.font = "800 16px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawTextWithCA(
      u.name.charAt(0).toUpperCase(),
      startX + xOffset + 22,
      yPos + 24,
      NIER_LIGHT,
    );

    // AV Number & Name
    ctx.textAlign = "left";
    ctx.fillStyle = NIER_DARK;
    ctx.font = "600 14px 'NewRodin', sans-serif";

    // Truncate name if it's too long
    let displayName = u.name.toUpperCase();
    if (displayName.length > 8) displayName = displayName.substring(0, 8) + ".";

    drawTextWithCA(displayName, startX + xOffset + 48, yPos + 18, NIER_DARK);

    ctx.font = "400 12px 'NewRodin', sans-serif";
    drawTextWithCA(
      `AV: ${Math.ceil(u.av || 0)}`,
      startX + xOffset + 48,
      yPos + 34,
      "rgba(71, 68, 59, 0.8)",
    );
  });

  ctx.restore();
}

function drawUI() {
  ctx.save();
  applyHardShadow();
  ctx.fillStyle = NIER_LIGHT;
  drawChamferedRect(UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h, 30);
  ctx.fill();
  clearShadow();
  ctx.restore();
  drawChamferedRect(UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h, 30);
  strokeWithCA("rgba(71, 68, 59, 0.3)", 1);

  ctx.fillStyle = "rgba(71, 68, 59, 0.2)";
  for (let i = 0; i < 40; i++)
    ctx.fillRect(
      UI_PANEL.x + 40 + i * 6,
      UI_PANEL.y - 12,
      3,
      Math.random() * 8 + 4,
    );

  const coordX = mouse.x.toFixed(1);
  const coordY = mouse.y.toFixed(1);
  ctx.font = "400 12px 'NewRodin', sans-serif";
  ctx.textAlign = "center";
  drawTextWithCA(
    `SYS.OP // TACTICAL COMMAND OVERLAY   [ LAT: ${coordX} LON: ${coordY} ]`,
    GAME_WIDTH / 2,
    UI_PANEL.y - 15,
    "rgba(71, 68, 59, 0.7)",
  );
  ctx.textAlign = "left";

  if (state.current === STATES.PLAYER_TURN) {
    // IMPORTANT: Make sure the command bar pulls the logic for the ACTIVE character on the timeline!
    const activeChar =
      party.find((p) => p.id === state.activeUnitId) || party[0];

    if (activeChar && !state.isAnimating) {
      const logic = activeChar.combatLogic;
      let atkName = logic.basic.name;
      let skillName = logic.skill.name;
      let ultName = logic.ultimate.name;

      if (state.isEnhanced) {
        atkName = "[ Q ] " + logic.ultimate.modes.blowoutBasic.name;
        skillName = "[ E ] " + logic.ultimate.modes.blowoutSkill.name;
      } else {
        atkName = "[ Q ] " + logic.basic.name;
        skillName = "[ E ] " + logic.skill.name;
        ultName = "[ 1 ] " + logic.ultimate.name;
      }

      const atkActive = state.pendingAction === "ATTACK";
      const skillActive = state.pendingAction === "SKILL";
      const ultActive = state.pendingAction === "ULTIMATE";
      const ultCost = logic.ultimate.cost || 120;
      const canUlt = (activeChar.energy || 0) >= ultCost;

      drawButton(btnAttack, atkName, atkActive, state.isEnhanced);
      drawButton(btnSkill, skillName, skillActive, state.isEnhanced);
      if (!state.isEnhanced)
        drawButton(btnUltimate, ultName, ultActive, false, !canUlt);
    }
  }
}

function drawButton(
  btn,
  text,
  forceActive = false,
  isEnhancedUI = false,
  isDisabled = false,
) {
  const hovered = isInside(mouse.x, mouse.y, btn) && !isDisabled;
  const isPlayerTurn =
    state.current === STATES.PLAYER_TURN && !state.isAnimating;
  const isMenu = state.current === STATES.MAIN_MENU;
  const isActive = (forceActive || isMenu || isPlayerTurn) && !isDisabled;

  ctx.save();
  if (state.pendingAction !== null && !forceActive) ctx.globalAlpha = 0.3;
  if (isDisabled) ctx.globalAlpha = 0.25;

  const renderY = hovered && isActive && !forceActive ? btn.y - 4 : btn.y;
  let textColor;

  if ((hovered && isActive) || forceActive) {
    applyHardShadow();
    ctx.fillStyle = NIER_DARK;
    drawChamferedRect(btn.x, renderY, btn.w, btn.h, 15);
    ctx.fill();
    clearShadow();
    textColor = NIER_LIGHT;
  } else {
    ctx.fillStyle = isEnhancedUI ? "#FFF" : "rgba(215, 207, 184, 0.5)";
    drawChamferedRect(btn.x, renderY, btn.w, btn.h, 15);
    ctx.fill();
    strokeWithCA("rgba(71, 68, 59, 0.4)", 1);
    textColor = NIER_DARK;
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const { lines, fontSize } = getWrappedText(ctx, text, btn.w - 20, 20, 600);
  const textY = renderY + btn.h / 2;

  if (lines.length === 2) {
    drawTextWithCA(
      lines[0],
      btn.x + btn.w / 2,
      textY - fontSize / 2 + 2,
      textColor,
    );
    drawTextWithCA(
      lines[1],
      btn.x + btn.w / 2,
      textY + fontSize / 2 + 2,
      textColor,
    );
  } else {
    drawTextWithCA(lines[0], btn.x + btn.w / 2, textY, textColor);
  }
  ctx.restore();
}

let currentCinematic = 0;

function drawActiveSkillBanner() {
  if (!state.activeSkillName) return;

  ctx.save();
  const textY = 80; // Pushed higher to the top of the screen
  ctx.font = "800 24px 'NewRodin', sans-serif"; // Shrunk font size
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "6px";

  const textWidth = ctx.measureText(state.activeSkillName.toUpperCase()).width;
  const padding = 60;
  const boxW = textWidth + padding * 2;
  const boxX = GAME_WIDTH / 2 - boxW / 2;
  const boxY = textY - 25;

  applyHardShadow();
  ctx.fillStyle = "rgba(71, 68, 59, 0.85)";
  drawChamferedRect(boxX, boxY, boxW, 50, 12);
  ctx.fill();
  clearShadow();

  strokeWithCA(NIER_LIGHT, 2);

  drawTextWithCA(
    state.activeSkillName.toUpperCase(),
    GAME_WIDTH / 2,
    textY + 2,
    NIER_LIGHT,
  );

  ctx.letterSpacing = "0px";
  ctx.restore();
}

function render() {
  updateFXPhysics();

  ctx.save();

  // --- NEW: ROTATIONAL VIOLENT SCREEN SHAKE ---
  if (state.fx.shake > 0.5) {
    // Add rotational torque based on shake magnitude
    const dx = (Math.random() - 0.5) * state.fx.shake;
    const dy = (Math.random() - 0.5) * state.fx.shake;
    const dRot = (Math.random() - 0.5) * (state.fx.shake * 0.0015);

    // Move center, rotate, move back to create pivoting torque
    ctx.translate(GAME_WIDTH / 2 + dx, GAME_HEIGHT / 2 + dy);
    ctx.rotate(dRot);
    ctx.translate(-GAME_WIDTH / 2, -GAME_HEIGHT / 2);

    state.fx.shake *= 0.85; // Slower decay = longer rumble
  }

  if (state.current === STATES.MAIN_MENU) {
    drawMainMenu();
  } else {
    drawBackground();

    let cinematicTarget = state.fx.cinematic ? 1 : 0;
    currentCinematic += (cinematicTarget - currentCinematic) * 0.1;
    if (currentCinematic > 0.01) {
      ctx.fillStyle = NIER_DARK;
      ctx.fillRect(0, 0, GAME_WIDTH, 120 * currentCinematic);
      ctx.fillRect(
        0,
        GAME_HEIGHT - 120 * currentCinematic,
        GAME_WIDTH,
        120 * currentCinematic,
      );
    }

    const visibleEnemies = enemies.filter(
      (e) => e.hp > 0 || (e.scale !== undefined && e.scale >= 0.05),
    );
    const visibleParty = party.filter(
      (p) => p.hp > 0 || (p.scale !== undefined && p.scale >= 0.05),
    );

    if (
      state.pendingAction &&
      visibleParty[0] &&
      state.current === STATES.PLAYER_TURN
    ) {
      const activeChar =
        visibleParty.find((p) => p.id === state.activeUnitId) ||
        visibleParty[0];
      const targetEnemy = visibleEnemies.find(
        (e) => e.id === state.selectedTargetId,
      );

      if (activeChar.renderX && targetEnemy && targetEnemy.renderX) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(
          activeChar.renderX + CARD_SIZE / 2 + (activeChar.offsetX || 0),
          activeChar.renderY + (activeChar.offsetY || 0),
        );
        ctx.lineTo(
          targetEnemy.renderX + CARD_SIZE / 2 + (targetEnemy.offsetX || 0),
          targetEnemy.renderY + CARD_SIZE + 100,
        );
        ctx.setLineDash([10, 15]);
        ctx.lineDashOffset = -(performance.now() / 20);
        strokeWithCA("rgba(71, 68, 59, 0.5)", 2);
        ctx.restore();

        const logic = activeChar.combatLogic;
        let moveData;
        if (state.isEnhanced)
          moveData =
            state.pendingAction === "ATTACK"
              ? logic.ultimate.modes.blowoutBasic
              : logic.ultimate.modes.blowoutSkill;
        else
          moveData =
            state.pendingAction === "ATTACK"
              ? logic.basic
              : state.pendingAction === "SKILL"
                ? logic.skill
                : logic.ultimate;

        if (moveData && moveData.tag === "Blast") {
          const tIdx = visibleEnemies.findIndex(
            (e) => e.id === state.selectedTargetId,
          );
          const adjacents = [];
          if (tIdx > 0) adjacents.push(visibleEnemies[tIdx - 1]);
          if (tIdx < visibleEnemies.length - 1)
            adjacents.push(visibleEnemies[tIdx + 1]);
          adjacents.forEach((adj) => {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(
              activeChar.renderX + CARD_SIZE / 2 + (activeChar.offsetX || 0),
              activeChar.renderY + (activeChar.offsetY || 0),
            );
            ctx.lineTo(
              adj.renderX + CARD_SIZE / 2 + (adj.offsetX || 0),
              adj.renderY + CARD_SIZE + 100,
            );
            ctx.setLineDash([5, 20]);
            ctx.lineDashOffset = -(performance.now() / 30);
            strokeWithCA("rgba(71, 68, 59, 0.3)", 1);
            ctx.restore();
          });
        }
      }
    }

    visibleEnemies.forEach((entity, index) => {
      const dynamicX = calculateXPosition(
        index,
        visibleEnemies.length,
        CARD_SIZE,
        GAME_WIDTH,
      );
      drawCard(entity, dynamicX, 140, true); // Pushed down from 100
    });

    visibleParty.forEach((entity, index) => {
      const dynamicX = calculateXPosition(
        index,
        visibleParty.length,
        CARD_SIZE,
        GAME_WIDTH,
      );
      drawCard(entity, dynamicX, 520, false); // Pushed down from 480
    });

    drawJuice();
    drawActionBar(); // Render timeline HUD
    drawUI();
    drawActiveSkillBanner();

    if (state.fx.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.fx.flash})`;
      ctx.fillRect(-50, -50, GAME_WIDTH + 100, GAME_HEIGHT + 100);
      state.fx.flash -= 0.05;
    }
    if (state.fx.invert > 0) {
      ctx.globalCompositeOperation = "difference";
      ctx.fillStyle = "#FFF";
      ctx.fillRect(-50, -50, GAME_WIDTH + 100, GAME_HEIGHT + 100);
      ctx.globalCompositeOperation = "source-over";
      state.fx.invert -= 1;
    }
  }

  ctx.restore();
  requestAnimationFrame(render);
}
