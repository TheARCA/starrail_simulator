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
  drawTotalDamage,
} from "./ui.js";

const imageCache = {};
// Removed the PLACEHOLDER_SRC constant completely!

function getEntityImage(entity, isEnemy) {
  if (imageCache[entity.id]) return imageCache[entity.id];

  const img = new Image();
  const folder = isEnemy ? "enemies" : "characters";

  const extensions = ["png", "webp", "jpg", "jpeg"];
  let currentExtIndex = 0;

  img.src = `assets/img/${folder}/${entity.id}.${extensions[currentExtIndex]}`;

  img.onerror = () => {
    currentExtIndex++;

    if (currentExtIndex < extensions.length) {
      img.src = `assets/img/${folder}/${entity.id}.${extensions[currentExtIndex]}`;
    } else {
      // NEW: Instead of a gray box URL, we flag it so the renderer knows to draw it natively
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
  entity.flash = Math.max(0, entity.flash - 0.05);

  const time = performance.now();
  const floatY = Math.sin(time / 400 + entity.animX) * 6;
  const x = entity.animX + entity.offsetX;
  const y = entity.animY + entity.offsetY + (entity.hp > 0 ? floatY : 0);

  // --- REDESIGN: Sleeker, tighter card height ---
  const cardWidth = CARD_SIZE;
  const cardHeight = CARD_SIZE + 40;
  const centerX = x + cardWidth / 2;
  const centerY = y + cardHeight / 2;

  // --- INTERACTION LOGIC ---
  const isHovered =
    mouse.x > x &&
    mouse.x < x + cardWidth &&
    mouse.y > y &&
    mouse.y < y + cardHeight;
  let isTargeted =
    isEnemy &&
    state.selectedTargetId === entity.id &&
    state.current === STATES.PLAYER_TURN &&
    !state.isAnimating;
  let isAdjacent = false;

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

  // --- RENDER TRANSFORM ---
  ctx.save();
  if (isDimmed) ctx.globalAlpha = 0.3;
  if (entity.hp <= 0) ctx.globalAlpha = Math.max(0, entity.scale);

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

  // --- 2. TARGET CHEVRONS ---
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
    : isAdjacent
      ? "rgba(71, 68, 59, 0.6)"
      : isHovered
        ? "rgba(71, 68, 59, 0.5)"
        : "rgba(71, 68, 59, 0.3)";
  let cardStrokeWidth = isTargeted ? 3 : isAdjacent || isHovered ? 2 : 1;
  strokeWithCA(cardStrokeColor, cardStrokeWidth);

  // --- 4. PORTRAIT ---
  const portraitImg = getEntityImage(entity, isEnemy);

  // Calculate portrait box dimensions and chamfer cut
  const px = x + 4;
  const py = y + 4;
  const pw = cardWidth - 8;
  const ph = cardWidth - 8;
  const cut = 8;

  // Save canvas state before clipping
  ctx.save();

  // Create chamfered clipping path for portrait
  ctx.beginPath();
  ctx.moveTo(px + cut, py);
  ctx.lineTo(px + pw, py);
  ctx.lineTo(px + pw, py + ph);
  ctx.lineTo(px, py + ph);
  ctx.lineTo(px, py + cut);
  ctx.closePath();
  ctx.clip();

  // --- DRAW CONTENT INSIDE CLIP ---
  if (portraitImg.isPlaceholder) {
    // Draw placeholder background
    ctx.fillStyle = "#47443b";
    ctx.fillRect(px, py, pw, ph);

    // Draw centered placeholder text
    ctx.fillStyle = "#d7cfb8";
    ctx.font = "800 14px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DATA", px + pw / 2, py + ph / 2);
  } else if (portraitImg.complete && portraitImg.naturalHeight !== 0) {
    // Draw portrait image
    ctx.globalAlpha = 0.95;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(portraitImg, px, py, pw, ph);
  }

  // Restore canvas state after drawing
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
  const bannerY = y + CARD_SIZE - 24;
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

    // --- 8. SIDE-DOCKED DEBUFFS ---
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

  if (entity.flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${entity.flash})`;
    drawChamferedRect(x, y, cardWidth, cardHeight, 15);
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
          targetEnemy.renderY + CARD_SIZE + 40,
        );

        // --- JUICE: High-Contrast Main Target Line ---
        ctx.setLineDash([15, 12]); // Tighter, more aggressive dashes
        ctx.lineDashOffset = -(performance.now() / 20);

        // 1. Draw a thick dark outer stroke
        strokeWithCA("rgba(71, 68, 59, 0.85)", 5);
        // 2. Draw a bright inner core stroke
        strokeWithCA("rgba(215, 207, 184, 0.95)", 2);

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
              adj.renderY + CARD_SIZE + 40,
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

  ctx.restore();
  requestAnimationFrame(render);
}
