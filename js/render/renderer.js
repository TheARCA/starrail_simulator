import {
  STATES,
  state,
  mouse,
  GAME_WIDTH,
  GAME_HEIGHT,
  CARD_SIZE,
} from "../core/state.js";
import { party } from "../data/characters/index.js";
import { enemies } from "../data/enemies/index.js";
import { updateFXPhysics } from "./fx_manager.js";
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
  drawTotalDamage,
} from "./ui.js";

const imageCache = {};
// Removed the PLACEHOLDER_SRC constant completely!

function getPendingMoveData(activeChar) {
  if (!activeChar || !state.pendingAction) return null;

  const logic = activeChar.combatLogic;
  if (state.isEnhanced) {
    return state.pendingAction === "ATTACK"
      ? logic.ultimate.modes.blowoutBasic
      : logic.ultimate.modes.blowoutSkill;
  }

  if (state.pendingAction === "ATTACK") return logic.basic;
  if (state.pendingAction === "SKILL") return logic.skill;
  if (state.pendingAction === "ULTIMATE") return logic.ultimate;
  return null;
}

function getEntityImage(entity, isEnemy) {
  if (imageCache[entity.id]) return imageCache[entity.id];

  const img = new Image();
  const folder = isEnemy ? "enemies" : "characters";

  // --- THE FIX: Strip the unique spawn ID suffix to get the base filename ---
  // This turns "e_baryon_1776105780056_605" back into "e_baryon"
  const baseImageId = entity.id.replace(/_\d+_\d+$/, "");

  // Put 'webp' first since trailblazer_destruction uses it!
  const extensions = ["webp", "png", "jpg", "jpeg"];
  let currentExtIndex = 0;

  // Use baseImageId here instead of entity.id
  img.src = `assets/img/${folder}/${baseImageId}.${extensions[currentExtIndex]}`;

  img.onerror = () => {
    currentExtIndex++;

    if (currentExtIndex < extensions.length) {
      // Use baseImageId here too!
      img.src = `assets/img/${folder}/${baseImageId}.${extensions[currentExtIndex]}`;
    } else {
      img.isPlaceholder = true;
    }
  };

  imageCache[entity.id] = img;
  return img;
}

export function initVisuals() {
  initGraphics();
  document.fonts.ready.then(() => requestAnimationFrame(render));
}

function calculateXPosition(index, totalCards, cardSize, screenWidth) {
  // --- FIXED: Increased gap from 30 to 80 to fit the debuff data streams! ---
  const gap = 80;

  const totalGroupWidth = totalCards * cardSize + (totalCards - 1) * gap;
  let startX = (screenWidth - totalGroupWidth) / 2;

  // Keep the left-side constraint so it doesn't overlap the Action Bar
  startX = Math.max(260, startX);

  return startX + index * (cardSize + gap);
}

function drawBackground() {
  ctx.fillStyle = NIER_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const bgGrad = ctx.createRadialGradient(
    GAME_WIDTH * 0.5,
    GAME_HEIGHT * 0.35,
    80,
    GAME_WIDTH * 0.5,
    GAME_HEIGHT * 0.35,
    GAME_HEIGHT * 0.75,
  );
  bgGrad.addColorStop(0, "rgba(215, 207, 184, 0.28)");
  bgGrad.addColorStop(1, "rgba(71, 68, 59, 0)");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

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

  ctx.fillStyle = "rgba(71, 68, 59, 0.045)";
  ctx.fillRect(180, 0, 1, GAME_HEIGHT);
  ctx.fillRect(GAME_WIDTH - 180, 0, 1, GAME_HEIGHT);

  ctx.font = "700 12px 'NewRodin', sans-serif";
  ctx.textAlign = "left";
  drawTextWithCA("SECTOR // FRONTLINE", 72, 48, "rgba(71, 68, 59, 0.55)");
  ctx.textAlign = "right";
  drawTextWithCA(
    `FRAME ${Math.floor(performance.now() / 16).toString().padStart(5, "0")}`,
    GAME_WIDTH - 72,
    48,
    "rgba(71, 68, 59, 0.45)",
  );

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
  // --- PHYSICS & TWEENING (Unchanged) ---
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
  entity.shieldFlash = Math.max(0, (entity.shieldFlash || 0) - 0.04);
  entity.flash = Math.max(0, entity.flash - 0.05);

  const time = performance.now();
  const floatY = Math.sin(time / 400 + entity.animX) * 6;
  const x = entity.animX + entity.offsetX;
  const y = entity.animY + entity.offsetY + (entity.hp > 0 ? floatY : 0);

  // --- REDESIGN: Sleeker, tighter card height ---
  const cardWidth = CARD_SIZE;
  const cardHeight = CARD_SIZE + 60; // INCREASED: from 40 to 60
  const centerX = x + cardWidth / 2;
  const centerY = y + cardHeight / 2;

  // --- INTERACTION LOGIC ---
  const isHovered =
    mouse.x > x &&
    mouse.x < x + cardWidth &&
    mouse.y > y &&
    mouse.y < y + cardHeight;
  const activeChar = party.find((p) => p.id === state.activeUnitId) || party[0];
  const pendingMove = getPendingMoveData(activeChar);
  const isSupportTargeting = pendingMove?.targetType === "Ally";
  const isPlayerActionPreview =
    state.current === STATES.PLAYER_TURN &&
    !state.isAnimating &&
    !!pendingMove;
  const canTargetEnemies = isPlayerActionPreview && !isSupportTargeting;
  const canTargetAllies = isPlayerActionPreview && isSupportTargeting;
  const isTargetableSide = !isPlayerActionPreview
    ? true
    : isEnemy
      ? canTargetEnemies
      : canTargetAllies || state.activeUnitId === entity.id;
  const hasInteractiveHover = isHovered && isTargetableSide;
  const isCurrentTurnUnit =
    state.activeUnitId === entity.id &&
    (state.current === STATES.PLAYER_TURN ||
      state.current === STATES.ENEMY_TURN);
  let isTargeted =
    state.current === STATES.PLAYER_TURN &&
    !state.isAnimating &&
    ((isEnemy && !isSupportTargeting && state.selectedTargetId === entity.id) ||
      (!isEnemy && isSupportTargeting && state.selectedAllyId === entity.id));
  let isAdjacent = false;

  if (
    isEnemy &&
    pendingMove &&
    state.current === STATES.PLAYER_TURN &&
    !state.isAnimating
  ) {
    if (pendingMove.tag === "Blast") {
      const aliveEnemies = enemies.filter(
        (e) => e.hp > 0 || (e.scale !== undefined && e.scale >= 0.05),
      );
      const tIdx = aliveEnemies.findIndex((e) => e.id === state.selectedTargetId);
      const myIdx = aliveEnemies.findIndex((e) => e.id === entity.id);
      if (myIdx === tIdx - 1 || myIdx === tIdx + 1) isAdjacent = true;
    }
  }

  const isDimmed =
    isPlayerActionPreview &&
    !isTargetableSide &&
    !isCurrentTurnUnit;

  // === NEW JUICE: INTERACTIVE HOVER TILT ===
  if (entity.hp > 0) {
    // THE FIX: The entire hover engine goes to sleep during attack animations
    if (!state.isAnimating) {
      if (hasInteractiveHover) {
        // 1. Pop the card forward slightly
        entity.targetScale = 1.06;

        // 2. Calculate tilt based on where the cursor is touching the card
        const torque = (mouse.x - centerX) / (cardWidth / 2); // -1.0 to 1.0
        entity.targetRotation = torque * 0.08; // Maximum 0.08 radians tilt
        entity.targetOffsetY = -5; // Lift it slightly off the ground
      } else {
        // Reset smoothly when mouse leaves
        entity.targetScale = 1.0;
        entity.targetRotation = 0.0;
        entity.targetOffsetY = 0;
      }
    }
  }
  // =========================================

  // --- RENDER TRANSFORM ---
  ctx.save();
  if (isDimmed) ctx.globalAlpha = 0.3;
  if (entity.hp <= 0) ctx.globalAlpha = Math.max(0, entity.scale);
  const cardAlpha = ctx.globalAlpha;

  ctx.translate(centerX, centerY);
  ctx.scale(entity.scale, entity.scale);
  ctx.rotate(entity.rotation);
  ctx.translate(-centerX, -centerY);

  // --- 1. BASE CARD BACKGROUND ---
  applyHardShadow();
  ctx.fillStyle = NIER_LIGHT;
  drawChamferedRect(x, y, cardWidth, cardHeight, 12);
  ctx.fill();
  clearShadow();

  if (isCurrentTurnUnit && entity.hp > 0) {
    const pulse = 0.45 + Math.abs(Math.sin(time / 160)) * 0.4;

    ctx.fillStyle = `rgba(215, 207, 184, ${0.08 + pulse * 0.12})`;
    drawChamferedRect(x - 6, y - 6, cardWidth + 12, cardHeight + 12, 16);
    ctx.fill();

    strokeWithCA(`rgba(71, 68, 59, ${0.75 + pulse * 0.2})`, 4);

    ctx.fillStyle = NIER_DARK;
    drawChamferedRect(x + 18, y - 26, cardWidth - 36, 18, 6);
    ctx.fill();

    ctx.font = "800 10px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawTextWithCA("CURRENT TURN", x + cardWidth / 2, y - 16, NIER_LIGHT);
  }

  // --- 2. TARGET CHEVRONS ---
  if (
    (hasInteractiveHover || isTargeted || isAdjacent) &&
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

    ctx.translate(x + cardWidth / 2, chevronY);
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

  // --- 3. BORDER STROKE ---
  let cardStrokeColor = isTargeted
    ? NIER_DARK
    : isCurrentTurnUnit
      ? "rgba(71, 68, 59, 0.9)"
    : isAdjacent
      ? "rgba(71, 68, 59, 0.6)"
      : hasInteractiveHover
        ? "rgba(71, 68, 59, 0.5)"
        : "rgba(71, 68, 59, 0.3)";
  let cardStrokeWidth = isTargeted
    ? 3
    : isCurrentTurnUnit
      ? 4
      : isAdjacent || hasInteractiveHover
        ? 2
        : 1;
  strokeWithCA(cardStrokeColor, cardStrokeWidth);

  // --- 4. PORTRAIT ---
  const portraitImg = getEntityImage(entity, isEnemy);

  const px = x + 4;
  const py = y + 4;
  const pw = cardWidth - 8;
  const ph = cardWidth - 8;
  const cut = 8;

  ctx.save();

  ctx.beginPath();
  ctx.moveTo(px + cut, py);
  ctx.lineTo(px + pw, py);
  ctx.lineTo(px + pw, py + ph);
  ctx.lineTo(px, py + ph);
  ctx.lineTo(px, py + cut);
  ctx.closePath();
  ctx.clip();

  // --- DRAW CONTENT INSIDE CLIP ---
  if (
    portraitImg.complete &&
    portraitImg.naturalHeight !== 0 &&
    !portraitImg.isPlaceholder
  ) {
    // === NEW JUICE: CHROMATIC IMPACT GLITCH ===
    if (entity.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      // Fade the glitch out as the flash decays
      ctx.globalAlpha = entity.flash * 0.8;

      // The harder the hit, the wider the colors split
      let split = entity.flash * 15;

      // Draw Red Shifted left
      ctx.drawImage(portraitImg, px - split, py, pw, ph);
      // Draw the offset light pass shifted right
      ctx.drawImage(portraitImg, px + split, py, pw, ph);

      ctx.restore();
    }
    // ==========================================

    // Draw standard portrait image over top
    ctx.globalAlpha = cardAlpha * 0.95;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(portraitImg, px, py, pw, ph);
  } else {
    // THE FIX: Draw placeholder background as BOTH the "Loading" state and "Missing" state!
    ctx.fillStyle = "#47443b";
    ctx.fillRect(px, py, pw, ph);

    ctx.fillStyle = "#d7cfb8";
    ctx.font = "800 14px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DATA", px + pw / 2, py + ph / 2);
  }

  ctx.restore();

  // --- 5. ENEMY WEAKNESSES (Docked Top-Right) ---
  if (isEnemy && entity.weaknesses && entity.weaknesses.length > 0) {
    const wSize = 16;

    // Check if we are currently previewing an attack
    const isPreviewing =
      state.current === STATES.PLAYER_TURN &&
      !state.isAnimating &&
      state.pendingAction;
    const activeChar =
      party.find((p) => p.id === state.activeUnitId) || party[0];

    entity.weaknesses.forEach((w, i) => {
      const wx = x + cardWidth - 6 - wSize;
      const wy = y + 8 + i * (wSize + 4);

      // Determine if this specific weakness matches the active character during a preview
      let isMatching = false;
      if (isPreviewing && activeChar && activeChar.element === w) {
        // Only pulse if the enemy is in the line of fire (targeted or adjacent to the blast)
        if (isTargeted || isAdjacent) {
          isMatching = true;
        }
      }

      if (isMatching) {
        // --- JUICE: Matching Weakness Pulse ---
        const pulse = 0.5 + Math.abs(Math.sin(performance.now() / 200)) * 0.5;
        ctx.fillStyle = `rgba(215, 207, 184, ${pulse})`; // Light flashing background
        drawChamferedRect(wx, wy, wSize, wSize, 3);
        ctx.fill();
        strokeWithCA("rgba(71, 68, 59, 0.8)", 1); // Dark border

        ctx.font = "800 10px 'NewRodin', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        drawTextWithCA(
          w.charAt(0).toUpperCase(),
          wx + wSize / 2,
          wy + wSize / 2 + 1,
          NIER_DARK,
        );
      } else {
        // Standard Dark Background for non-matching or idle weaknesses
        ctx.fillStyle = "rgba(71, 68, 59, 0.9)";
        drawChamferedRect(wx, wy, wSize, wSize, 3);
        ctx.fill();

        ctx.font = "800 10px 'NewRodin', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        drawTextWithCA(
          w.charAt(0).toUpperCase(),
          wx + wSize / 2,
          wy + wSize / 2 + 1,
          NIER_LIGHT,
        );
      }
    });
  }

  // --- 6. NAME BANNER (Solid Band) ---
  const bannerY = y + CARD_SIZE - 2; // MOVED: Now sits directly below the portrait
  ctx.fillStyle = NIER_DARK;
  ctx.fillRect(x, bannerY, cardWidth, 22);
  ctx.font = "700 11px 'NewRodin', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let shortName = entity.name.toUpperCase();
  if (ctx.measureText(shortName).width > cardWidth - 10)
    shortName = shortName.substring(0, 14) + ".";
  drawTextWithCA(shortName, x + cardWidth / 2, bannerY + 11, NIER_LIGHT);

  // --- 7. COMPACT STAT BARS ---
  if (entity.baseHp === undefined) entity.baseHp = entity.hp;
  if (entity.baseToughness === undefined)
    entity.baseToughness = entity.toughness;

  const barX = x + 10;
  const barW = cardWidth - 20;

  if (isEnemy) {
    // Enemy Toughness Bar
    let toughY = bannerY + 28;
    let toughPct = Math.max(
      0,
      Math.min(1, entity.toughness / entity.baseToughness),
    );

    // Draw Background & Thicker Border
    ctx.fillStyle = "rgba(71, 68, 59, 0.1)";
    ctx.fillRect(barX, toughY, barW, 4);
    ctx.strokeStyle = "rgba(71, 68, 59, 0.6)"; // Darkened for better visibility
    ctx.lineWidth = 2; // Increased from 1 to 2
    ctx.strokeRect(barX, toughY, barW, 4);

    if (!entity.isBroken) {
      // --- WEAKNESS BREAK PREVIEW ---
      let previewDamage = 0;

      // Check if player is targeting and not currently attacking
      if (
        state.current === STATES.PLAYER_TURN &&
        !state.isAnimating &&
        state.pendingAction
      ) {
        const activeChar =
          party.find((p) => p.id === state.activeUnitId) || party[0];

        // Ensure the attacker's element matches the enemy's weakness!
        if (
          activeChar &&
          entity.weaknesses &&
          entity.weaknesses.includes(activeChar.element)
        ) {
          const logic = activeChar.combatLogic;
          let moveData;

          if (state.isEnhanced) {
            moveData =
              state.pendingAction === "ATTACK"
                ? logic.ultimate.modes.blowoutBasic
                : logic.ultimate.modes.blowoutSkill;
          } else {
            moveData =
              state.pendingAction === "ATTACK"
                ? logic.basic
                : state.pendingAction === "SKILL"
                  ? logic.skill
                  : logic.ultimate;
          }

          if (moveData) {
            if (isTargeted) previewDamage = moveData.toughnessDamage || 10;
            else if (isAdjacent)
              previewDamage = moveData.toughnessDamageAdj || 10;
          }
        }
      }

      if (previewDamage > 0) {
        // Calculate ONLY the depleted portion
        const remainingToughness = Math.max(
          0,
          entity.toughness - previewDamage,
        );
        const remainPercent = remainingToughness / entity.baseToughness;
        const depleteW = barW * (toughPct - remainPercent);

        // Solid bar for what will remain
        ctx.fillStyle = "rgba(71, 68, 59, 0.6)";
        ctx.fillRect(barX, toughY, barW * remainPercent, 4);

        // Flashing bar ONLY for the chunk being destroyed
        // Slower pulse (/300) and higher minimum opacity (0.55 to 0.95) so it doesn't vanish
        const pulse = 0.55 + Math.abs(Math.sin(performance.now() / 300)) * 0.4;

        // Slightly brighter base color to make it pop more
        ctx.fillStyle = `rgba(235, 227, 204, ${pulse})`;
        ctx.fillRect(barX + barW * remainPercent, toughY, depleteW, 4);
      } else {
        // Normal drawing if there is no preview active
        ctx.fillStyle = "rgba(71, 68, 59, 0.6)";
        ctx.fillRect(barX, toughY, barW * toughPct, 4);
      }
    } else {
      ctx.font = "800 8px 'NewRodin', sans-serif";
      ctx.textAlign = "center";
      drawTextWithCA("BROKEN", x + cardWidth / 2, toughY + 3, "#47443b");
    }

    // Enemy HP Bar
    let hpY = toughY + 10;
    let hpPct = Math.max(0, Math.min(1, entity.hp / entity.baseHp));

    // Draw Background & Thicker Border
    ctx.fillStyle = "rgba(71, 68, 59, 0.1)";
    ctx.fillRect(barX, hpY, barW, 6);
    ctx.strokeStyle = "rgba(71, 68, 59, 0.6)"; // Darkened
    ctx.lineWidth = 2; // Increased to 2
    ctx.strokeRect(barX, hpY, barW, 6);

    // Fill Current HP
    ctx.fillStyle = NIER_DARK;
    ctx.fillRect(barX, hpY, barW * hpPct, 6);

  } else {
    // Player HP Bar
    let hpY = bannerY + 28;
    let hpPct = Math.max(0, Math.min(1, entity.hp / entity.baseHp));

    // Draw Background & Thicker Border
    ctx.fillStyle = "rgba(71, 68, 59, 0.1)";
    ctx.fillRect(barX, hpY, barW, 8);
    ctx.strokeStyle = "rgba(71, 68, 59, 0.6)"; // Darkened
    ctx.lineWidth = 2; // Increased to 2
    ctx.strokeRect(barX, hpY, barW, 8);

    // Fill Current HP
    ctx.fillStyle = NIER_DARK;
    ctx.fillRect(barX, hpY, barW * hpPct, 8);

    if (entity.shield) {
      const shieldValue = Math.max(0, entity.shield.value || 0);
      const shieldMax = Math.max(1, entity.shield.maxValue || shieldValue || 1);
      const shieldPct = Math.max(0, Math.min(1, shieldValue / shieldMax));
      const shieldPulse =
        0.35 +
        Math.abs(Math.sin(performance.now() / 180)) * 0.25 +
        (entity.shieldFlash || 0) * 0.35;

      ctx.fillStyle = `rgba(215, 207, 184, ${0.18 + shieldPulse * 0.16})`;
      ctx.fillRect(barX, hpY - 2, barW, 12);

      ctx.fillStyle = `rgba(71, 68, 59, ${0.35 + shieldPulse * 0.25})`;
      ctx.fillRect(barX, hpY, barW * shieldPct, 8);

      ctx.fillStyle = `rgba(215, 207, 184, ${0.35 + shieldPulse * 0.25})`;
      ctx.fillRect(barX, hpY, barW * shieldPct, 2);

      ctx.strokeStyle = `rgba(71, 68, 59, ${0.45 + shieldPulse * 0.25})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(barX - 1, hpY - 1, barW + 2, 10);
    }

    // Player Energy Bar
    let enY = hpY + 12;
    let enPct = Math.max(
      0,
      Math.min(1, entity.displayEnergy / (entity.maxEnergy || 120)),
    );

    // Draw Background & Thicker Border
    ctx.fillStyle = "rgba(71, 68, 59, 0.05)";
    ctx.fillRect(barX, enY, barW, 4);
    ctx.strokeStyle = "rgba(71, 68, 59, 0.4)"; // Darkened
    ctx.lineWidth = 2; // Increased to 2
    ctx.strokeRect(barX, enY, barW, 4);

    // Fill Current Energy
    ctx.fillStyle = "rgba(71, 68, 59, 0.5)";
    ctx.fillRect(barX, enY, barW * enPct, 4);

    // Sharp HP text inside the bar bounds
    ctx.font = "700 9px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const hpColor = entity.hp <= 0 ? "rgba(71, 68, 59, 0.4)" : NIER_LIGHT;
    drawTextWithCA(
      `${Math.ceil(entity.hp)} / ${entity.baseHp}`,
      x + cardWidth / 2,
      hpY + 5,
      hpColor,
    );
  }

  if (entity.debuffs && entity.debuffs.length > 0) {
    entity.debuffs.forEach((d, i) => {
      const dy = y + 20 + i * 18;
      const dx = x + cardWidth + 4;
      const label = `${d.name} ${d.duration}`;

      ctx.font = "800 10px 'NewRodin', sans-serif";
      const textW = ctx.measureText(label).width;

      ctx.fillStyle = "rgba(215, 207, 184, 0.95)";
      ctx.fillRect(dx, dy, textW + 12, 14);

      ctx.fillStyle = NIER_DARK;
      ctx.fillRect(dx, dy, 2, 14);

      ctx.fillStyle = NIER_DARK;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, dx + 6, dy + 7);
    });
  }

  if (!isEnemy && entity.statusBadges && entity.statusBadges.length > 0) {
    entity.statusBadges.slice(0, 2).forEach((badge, index) => {
      const indicatorW = 64;
      const indicatorH = 18;
      const indicatorX = x + cardWidth - indicatorW - 8;
      const indicatorY = y + 8 + index * 22;
      const pipCount = badge.maxValue || 0;
      const pipGap = 3;
      const pipW = 8;
      const pipH = 5;
      const pipsTotalW =
        pipCount > 0 ? pipCount * pipW + (pipCount - 1) * pipGap : 0;
      const pipsX = indicatorX + indicatorW - pipsTotalW - 6;
      const pipsY = indicatorY + 6;

      ctx.fillStyle = "rgba(71, 68, 59, 0.9)";
      drawChamferedRect(indicatorX, indicatorY, indicatorW, indicatorH, 4);
      ctx.fill();
      strokeWithCA("rgba(215, 207, 184, 0.28)", 1);

      ctx.font = "800 8px 'NewRodin', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      drawTextWithCA(
        badge.shortLabel || badge.name,
        indicatorX + 6,
        indicatorY + indicatorH / 2 + 1,
        NIER_LIGHT,
      );

      for (let i = 0; i < pipCount; i++) {
        ctx.fillStyle =
          i < (badge.displayValue || 0) ? NIER_LIGHT : "rgba(215, 207, 184, 0.22)";
        drawChamferedRect(pipsX + i * (pipW + pipGap), pipsY, pipW, pipH, 2);
        ctx.fill();
      }
    });
  }

  if (entity.flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${entity.flash})`;
    drawChamferedRect(x, y, cardWidth, cardHeight, 15);
    ctx.fill();
  }

  ctx.restore();
}

function drawJuice() {
  for (let i = 0; i < state.fx.slashes.length; i++) {
    let slash = state.fx.slashes[i];
    if (!slash || slash.life <= 0) continue;

    ctx.save();
    ctx.globalAlpha = Math.max(0, slash.life * 0.7);
    ctx.translate(slash.x, slash.y);
    ctx.rotate(slash.angle);

    const grad = ctx.createLinearGradient(
      -slash.length / 2,
      0,
      slash.length / 2,
      0,
    );
    grad.addColorStop(0, "rgba(215, 207, 184, 0)");
    grad.addColorStop(0.2, slash.color);
    grad.addColorStop(0.8, slash.color);
    grad.addColorStop(1, "rgba(215, 207, 184, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-slash.length / 2, 0);
    ctx.lineTo(-slash.length / 2 + 18, -slash.width / 2);
    ctx.lineTo(slash.length / 2, -slash.width / 6);
    ctx.lineTo(slash.length / 2 - 20, slash.width / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

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

    ctx.globalAlpha = Math.min(1, t.life);
    const sColor = t.isCrit ? NIER_DARK : NIER_LIGHT;
    const fColor = t.isCrit ? NIER_LIGHT : NIER_DARK;

    // --- NEW JUICE: The Hex Data Subtitle ---
    // Try to parse the floating text into an actual number
    const dmgValue = parseInt(t.text);

    // If it's a valid number (and not text like "MISS" or "RESIST")
    if (!isNaN(dmgValue)) {
      // Convert the number to a base-16 hex string and pad it to always be 4 digits
      // e.g., 150 becomes "0x0096"
      const hexString =
        "0x" + dmgValue.toString(16).toUpperCase().padStart(4, "0");

      ctx.save();

      // Secondary Animation: Make it drift up and away from the main number as it dies
      const floatOffset = (1.0 - Math.min(1, t.life)) * -15;

      ctx.font = "800 12px 'NewRodin', monospace";
      ctx.textAlign = "center";

      // Make it slightly transparent so it's a subtle background detail
      ctx.globalAlpha = Math.min(1, t.life) * 0.6;

      // Color match the Nier theme (light for crits, dark for normal hits)
      ctx.fillStyle = t.isCrit
        ? "rgba(215, 207, 184, 1)"
        : "rgba(71, 68, 59, 1)";

      // Draw it 28 pixels above the center, minus the upward float offset
      ctx.fillText(hexString, 0, -28 + floatOffset);

      ctx.restore();
    }

    // --- MAIN DAMAGE NUMBER ---
    ctx.font = "800 48px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    drawTextWithCA(t.text, 0, 0, fColor, sColor, 8);

    ctx.restore();
  }
}

let currentCinematic = 0;
let currentVignette = 0.3;

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
      const moveData = getPendingMoveData(activeChar);

      if (activeChar.renderX && moveData?.tag === "AoE") {
        visibleEnemies.forEach((enemy, index) => {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(
            activeChar.renderX + CARD_SIZE / 2 + (activeChar.offsetX || 0),
            activeChar.renderY + (activeChar.offsetY || 0),
          );
          ctx.lineTo(
            enemy.renderX + CARD_SIZE / 2 + (enemy.offsetX || 0),
            enemy.renderY + CARD_SIZE + 60,
          );
          ctx.setLineDash([10, 14]);
          ctx.lineDashOffset = -(performance.now() / 30) - index * 6;
          strokeWithCA("rgba(71, 68, 59, 0.6)", 3);
          ctx.restore();
        });
      } else {
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
            targetEnemy.renderY + CARD_SIZE + 60, // UPDATED to 60
          );

          // --- JUICE: High-Contrast Main Target Line ---
          ctx.setLineDash([15, 12]); // Tighter, more aggressive dashes
          ctx.lineDashOffset = -(performance.now() / 20);

          // 1. Draw a thick dark outer stroke
          strokeWithCA("rgba(71, 68, 59, 0.85)", 5);
          // 2. Draw a bright inner core stroke
          strokeWithCA("rgba(215, 207, 184, 0.95)", 2);

          ctx.restore();

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
                adj.renderY + CARD_SIZE + 60, // UPDATED to 60
              );

              // --- JUICE: Stronger Adjacent Target Lines ---
              ctx.setLineDash([8, 16]);
              ctx.lineDashOffset = -(performance.now() / 30);
              strokeWithCA("rgba(71, 68, 59, 0.6)", 3); // Thicker and darker

              ctx.restore();
            });
          }
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
    drawTotalDamage();

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

  // === NEW JUICE: CRT SCANLINES & ACTION VIGNETTE ===
  ctx.save();
  // Reset transform so the overlay perfectly covers the screen despite camera shakes
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Scrolling Scanlines
  ctx.fillStyle = "rgba(71, 68, 59, 0.04)";
  const scanOffset = (performance.now() / 40) % 4;
  for (let i = 0; i < canvas.height; i += 4) {
    ctx.fillRect(0, i + scanOffset, canvas.width, 1);
  }

  // 2. Dynamic Action Vignette
  // Darkens significantly when an attack animation is playing to build focus
  let vigTarget = state.isAnimating ? 0.75 : 0.3;
  currentVignette += (vigTarget - currentVignette) * 0.05;

  let grad = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    canvas.height * 0.4,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.8,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)"); // Transparent center
  grad.addColorStop(1, `rgba(20, 18, 15, ${currentVignette})`); // Dark edges

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  // ==================================================

  ctx.restore();
  requestAnimationFrame(render);
}
