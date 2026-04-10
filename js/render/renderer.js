import {
  STATES,
  state,
  mouse,
  GAME_WIDTH,
  GAME_HEIGHT,
  CARD_SIZE,
} from "../core/state.js";
import { party } from "../data/hero_db.js";
import { enemies } from "../data/enemy_db.js";
import { updateFXPhysics } from "../systems/fx_manager.js";
import {
  canvas,
  ctx,
  initGraphics,
  NIER_BG,
  NIER_DARK,
  NIER_LIGHT,
  strokeWithCA,
  drawChamferedRect,
  drawTextWithCA,
  applyHardShadow,
  clearShadow,
  getWrappedText,
} from "./graphics.js";
import {
  drawMainMenu,
  drawActionBar,
  drawUI,
  drawActiveSkillBanner,
} from "./ui.js";

const spritePlaceholder = new Image();
spritePlaceholder.src = `https://placehold.co/${CARD_SIZE}x${CARD_SIZE}/47443b/d7cfb8/png?text=DATA`;

export function initVisuals() {
  initGraphics();
  document.fonts.ready.then(() => requestAnimationFrame(render));
}

function calculateXPosition(index, totalCards, cardSize, screenWidth) {
  const gap = 30;
  const totalGroupWidth = totalCards * cardSize + (totalCards - 1) * gap;
  let startX = (screenWidth - totalGroupWidth) / 2;
  startX = Math.max(260, startX);
  return startX + index * (cardSize + gap);
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
  for (let i = 0; i < state.fx.shockwaves.length; i++) {
    let sw = state.fx.shockwaves[i];
    if (sw.life <= 0) continue; // Skip dead ring buffer slots
    ctx.globalAlpha = Math.max(0, sw.life);
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    strokeWithCA(sw.color, Math.max(0.1, sw.width * sw.life));
    ctx.globalAlpha = 1.0;
  }

  for (let i = 0; i < state.fx.particles.length; i++) {
    let p = state.fx.particles[i];
    if (p.life <= 0) continue;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
    ctx.lineWidth = Math.max(1, p.size * p.life);
    ctx.strokeStyle = p.color === "#FFF" ? NIER_DARK : p.color;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  for (let i = 0; i < state.fx.dataStrings.length; i++) {
    let d = state.fx.dataStrings[i];
    if (d.life <= 0) continue;
    ctx.globalAlpha = Math.max(0, d.life);
    ctx.font = "400 14px 'NewRodin', monospace";
    ctx.fillStyle = NIER_DARK;
    ctx.fillText(d.text, d.x, d.y);
    ctx.globalAlpha = 1.0;
  }

  for (let i = 0; i < state.fx.floatingTexts.length; i++) {
    let t = state.fx.floatingTexts[i];
    if (t.life <= 0) continue;
    ctx.save();
    ctx.translate(t.x, t.y);
    let startingLife = t.life > 1.0 ? 1.5 : 1.0;
    let scale = Math.max(0, Math.min(1, (startingLife - t.life) * 8));
    if (t.isCrit) scale *= 1.3;
    ctx.scale(scale, scale);
    ctx.font = "800 48px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    ctx.globalAlpha = Math.min(1, t.life);
    const sColor = t.isCrit ? NIER_DARK : NIER_LIGHT;
    const fColor = t.isCrit ? NIER_LIGHT : NIER_DARK;
    drawTextWithCA(t.text, 0, 0, fColor, sColor, 8);
    ctx.restore();
  }
}

let currentCinematic = 0;

function render() {
  updateFXPhysics();
  ctx.save();

  if (state.fx.shake > 0.5) {
    const dx = (Math.random() - 0.5) * state.fx.shake;
    const dy = (Math.random() - 0.5) * state.fx.shake;
    const dRot = (Math.random() - 0.5) * (state.fx.shake * 0.0015);
    ctx.translate(GAME_WIDTH / 2 + dx, GAME_HEIGHT / 2 + dy);
    ctx.rotate(dRot);
    ctx.translate(-GAME_WIDTH / 2, -GAME_HEIGHT / 2);
    state.fx.shake *= 0.85;
  }

  if (state.current === STATES.MAIN_MENU) {
    drawBackground(); // Background draws first
    drawMainMenu(); // Menu draws on top
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
        let moveData = state.isEnhanced
          ? state.pendingAction === "ATTACK"
            ? logic.ultimate.modes.blowoutBasic
            : logic.ultimate.modes.blowoutSkill
          : state.pendingAction === "ATTACK"
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
      drawCard(entity, dynamicX, 140, true);
    });

    visibleParty.forEach((entity, index) => {
      const dynamicX = calculateXPosition(
        index,
        visibleParty.length,
        CARD_SIZE,
        GAME_WIDTH,
      );
      drawCard(entity, dynamicX, 520, false);
    });

    drawJuice();
    drawActionBar();
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
