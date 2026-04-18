import {
  STATES,
  state,
  mouse,
  GAME_WIDTH,
  GAME_HEIGHT,
  UI_PANEL,
  btnAttack,
  btnSkill,
  btnUltimate,
  btnStartBattle,
  btnClearEnemies,
} from "../core/state.js";
import { DATABASE_HEROES, party } from "../data/characters/index.js";
import { DATABASE_ENEMIES, enemies } from "../data/enemies/index.js";
import {
  ctx,
  NIER_DARK,
  NIER_LIGHT,
  drawTextWithCA,
  strokeWithCA,
  applyHardShadow,
  clearShadow,
  getWrappedText,
  drawChamferedRect,
} from "./graphics.js";
import { getCurrentActionValue, getEffectiveSpd, syncActionValue } from "../utils/speed.js";
import { analyser, dataArray } from "../core/audio_manager.js";

// Exported so input.js can reuse them!
export function isInside(x, y, rect) {
  return x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h;
}

function compactLabel(text, maxLength) {
  if (!text) return "NONE";
  const normalized = text.toUpperCase();
  return normalized.length > maxLength
    ? `${normalized.substring(0, maxLength - 1)}.`
    : normalized;
}

function drawFittedLine(text, x, y, maxWidth, initialFontSize, fontWeight, color) {
  let fontSize = initialFontSize;
  while (fontSize > 8) {
    ctx.font = `${fontWeight} ${fontSize}px 'NewRodin', sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 1;
  }
  drawTextWithCA(text, x, y, color);
}

export function getMenuRect(index, total, startY) {
  const w = 240;
  const h = 70;
  const spacing = 30;
  const totalW = total * w + (total - 1) * spacing;
  const startX = (GAME_WIDTH - totalW) / 2;
  return { x: startX + index * (w + spacing), y: startY, w, h };
}

function drawTechPanel(x, y, w, h, label, meta = null) {
  ctx.save();
  applyHardShadow();
  ctx.fillStyle = "rgba(215, 207, 184, 0.92)";
  drawChamferedRect(x, y, w, h, 14);
  ctx.fill();
  clearShadow();

  strokeWithCA("rgba(71, 68, 59, 0.28)", 1);

  ctx.save();
  ctx.beginPath();
  drawChamferedRect(x, y, w, h, 14);
  ctx.clip();
  ctx.fillStyle = "rgba(71, 68, 59, 0.05)";
  for (let i = 0; i < h; i += 8) {
    ctx.fillRect(x, y + i, w, 1);
  }
  ctx.restore();

  ctx.fillStyle = NIER_DARK;
  drawChamferedRect(x + 18, y - 10, Math.min(180, w - 36), 20, 5);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "800 10px 'NewRodin', sans-serif";
  drawTextWithCA(label.toUpperCase(), x + 30, y + 1, NIER_LIGHT);

  if (meta) {
    ctx.textAlign = "right";
    ctx.font = "700 10px 'NewRodin', sans-serif";
    drawTextWithCA(meta.toUpperCase(), x + w - 20, y + 16, "rgba(71, 68, 59, 0.58)");
  }
  ctx.restore();
}

function layoutBattleHud() {
  const buttonWidth = 250;
  const buttonHeight = 58;
  const buttonGap = 26;
  const totalWidth = buttonWidth * 3 + buttonGap * 2;
  const startX = UI_PANEL.x + (UI_PANEL.w - totalWidth) / 2;
  const buttonY = UI_PANEL.y + UI_PANEL.h - buttonHeight - 18;

  btnAttack.x = startX;
  btnAttack.y = buttonY;
  btnAttack.w = buttonWidth;
  btnAttack.h = buttonHeight;

  btnSkill.x = startX + buttonWidth + buttonGap;
  btnSkill.y = buttonY;
  btnSkill.w = buttonWidth;
  btnSkill.h = buttonHeight;

  btnUltimate.x = startX + (buttonWidth + buttonGap) * 2;
  btnUltimate.y = buttonY;
  btnUltimate.w = buttonWidth;
  btnUltimate.h = buttonHeight;
}

export function drawMainMenu() {
  const titlePanelX = 300;
  const titlePanelY = 58;
  const titlePanelW = GAME_WIDTH - 600;
  const titlePanelH = 96;
  drawTechPanel(titlePanelX, titlePanelY, titlePanelW, titlePanelH, "SYSTEM MENU", "SIMULATION LOBBY");

  if (DATABASE_HEROES.length > 0) {
    const firstHero = getMenuRect(0, DATABASE_HEROES.length, 300);
    const lastHero = getMenuRect(
      DATABASE_HEROES.length - 1,
      DATABASE_HEROES.length,
      300,
    );
    drawTechPanel(
      firstHero.x - 30,
      282,
      lastHero.x + lastHero.w - firstHero.x + 60,
      98,
      "Squad Assembly",
      `${party.length}/4 READY`,
    );
  }

  if (DATABASE_ENEMIES.length > 0) {
    const firstEnemy = getMenuRect(0, DATABASE_ENEMIES.length, 520);
    const lastEnemy = getMenuRect(
      DATABASE_ENEMIES.length - 1,
      DATABASE_ENEMIES.length,
      520,
    );
    drawTechPanel(
      firstEnemy.x - 30,
      502,
      lastEnemy.x + lastEnemy.w - firstEnemy.x + 60,
      98,
      "Target Simulation",
      `${enemies.length}/5 LOADED`,
    );
  }

  ctx.font = "300 48px 'NewRodin', sans-serif";
  ctx.textAlign = "center";
  ctx.letterSpacing = "4px";
  drawTextWithCA(
    "HONKAI: STAR RAIL - 2D REIMAGINED",
    GAME_WIDTH / 2,
    110,
    NIER_DARK,
  );
  ctx.letterSpacing = "0px";
  ctx.font = "700 12px 'NewRodin', sans-serif";
  drawTextWithCA(
    "SELECT A SQUAD PROFILE, LOAD HOSTILES, THEN INITIALIZE THE ENCOUNTER.",
    GAME_WIDTH / 2,
    138,
    "rgba(71, 68, 59, 0.68)",
  );
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

  ctx.font = "800 11px 'NewRodin', sans-serif";
  ctx.textAlign = "center";
  drawTextWithCA(
    "LMB // TOGGLE UNITS    CLEAR // RESET TARGET LIST    INITIALIZE COMBAT // ENTER BATTLE",
    GAME_WIDTH / 2,
    GAME_HEIGHT - 54,
    "rgba(71, 68, 59, 0.58)",
  );
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
  } else drawTextWithCA(lines[0], rect.x + rect.w / 2, textY, textColor);
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
  } else drawTextWithCA(lines[0], rect.x + rect.w / 2, textY, textColor);
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

export function drawActionBar() {
  const aliveEnemies = enemies.filter((e) => e.hp > 0);
  const aliveParty = party.filter((p) => p.hp > 0);
  let allUnits = [...aliveParty, ...aliveEnemies];
  if (allUnits.length === 0) return;
  allUnits.forEach((u) => syncActionValue(u));
  allUnits.sort((a, b) => getCurrentActionValue(a) - getCurrentActionValue(b));

  const startX = 60; // Pushed right to make room for the spine
  const startY = 100;
  ctx.save();
  ctx.font = "400 12px 'NewRodin', sans-serif";
  ctx.textAlign = "left";

  // --- NIER JUICE: System Text ---
  drawTextWithCA(
    "SYS // TACTICAL_ORDER",
    startX - 20,
    startY - 30,
    "rgba(71, 68, 59, 0.7)",
  );
  ctx.fillStyle = NIER_DARK;
  ctx.fillRect(startX - 20, startY - 20, 160, 2); // Header underline

  // --- NIER JUICE: The Vertical Timeline Spine ---
  const spineX = startX - 20;
  const maxItems = Math.min(allUnits.length, 8);
  ctx.fillStyle = "rgba(71, 68, 59, 0.3)";
  ctx.fillRect(spineX, startY, 2, maxItems * 55 - 10);

  allUnits.forEach((u, i) => {
    if (i > 7) return;
    const isPlayer = aliveParty.some((p) => p.id === u.id);
    const isActive = state.activeUnitId === u.id;
    const xOffset = isActive ? 15 : 0;
    const yPos = startY + i * 55;

    // --- NIER JUICE: Spine Connectors ---
    ctx.fillStyle = isActive ? NIER_DARK : "rgba(71, 68, 59, 0.3)";
    ctx.fillRect(spineX, yPos + 22, 20 + xOffset, isActive ? 2 : 1);

    applyHardShadow();
    ctx.fillStyle = NIER_LIGHT;
    drawChamferedRect(startX + xOffset, yPos, 160, 45, 8);
    ctx.fill();
    clearShadow();
    ctx.fillStyle = "rgba(71, 68, 59, 0.1)";
    ctx.fill();

    // --- NIER JUICE: Active Unit Diamond Anchor ---
    if (isActive) {
      const pulse = 0.5 + Math.abs(Math.sin(performance.now() / 200)) * 0.5;
      strokeWithCA(NIER_DARK, 1 + pulse * 2);

      ctx.save();
      ctx.translate(spineX, yPos + 23);
      ctx.rotate(performance.now() / 500); // Slowly rotating anchor
      ctx.fillStyle = NIER_DARK;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    } else {
      strokeWithCA("rgba(71, 68, 59, 0.4)", 1);
      // Small static anchor dot
      ctx.fillStyle = "rgba(71, 68, 59, 0.5)";
      ctx.fillRect(spineX - 2, yPos + 21, 4, 4);
    }

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

    ctx.textAlign = "left";
    ctx.fillStyle = NIER_DARK;
    ctx.font = "600 14px 'NewRodin', sans-serif";

    let displayName = u.name.toUpperCase();
    if (displayName.length > 8) displayName = displayName.substring(0, 8) + ".";
    drawTextWithCA(displayName, startX + xOffset + 48, yPos + 18, NIER_DARK);

    ctx.font = "400 12px 'NewRodin', sans-serif";
    drawTextWithCA(
      `AV: ${Math.ceil(getCurrentActionValue(u))}`,
      startX + xOffset + 48,
      yPos + 34,
      "rgba(71, 68, 59, 0.8)",
    );

    if (isActive) {
      const pulse = 0.45 + Math.abs(Math.sin(performance.now() / 200)) * 0.35;
      ctx.fillStyle = `rgba(71, 68, 59, ${0.55 + pulse * 0.3})`;
      drawChamferedRect(startX + xOffset + 148, yPos + 6, 6, 33, 2);
      ctx.fill();

      ctx.fillStyle = `rgba(215, 207, 184, ${0.25 + pulse * 0.2})`;
      ctx.fillRect(startX + xOffset + 140, yPos + 21, 8, 2);

      if (state.followUpQueue && state.followUpQueue.length > 0) {
        const followUp = state.followUpQueue[0];
        const chipX = startX + xOffset + 172;
        const chipY = yPos + 9;
        const chipW = 76;
        const chipH = 28;

        ctx.fillStyle = "rgba(71, 68, 59, 0.92)";
        drawChamferedRect(chipX, chipY, chipW, chipH, 5);
        ctx.fill();
        strokeWithCA("rgba(215, 207, 184, 0.45)", 1);

        ctx.font = "800 10px 'NewRodin', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        drawTextWithCA(
          followUp.label || "FOLLOW",
          chipX + chipW / 2,
          chipY + 10,
          NIER_LIGHT,
        );

        if (state.followUpQueue.length > 1) {
          ctx.font = "700 9px 'NewRodin', sans-serif";
          drawTextWithCA(
            `x${state.followUpQueue.length}`,
            chipX + chipW / 2,
            chipY + 20,
            "rgba(215, 207, 184, 0.75)",
          );
        }
      }
    }
  });
  ctx.restore();
}

function drawSkillPoints() {
  layoutBattleHud();

  const spW = 35;
  const spH = 12;
  const gap = 8;
  const totalW = state.maxSp * spW + (state.maxSp - 1) * gap;

  // Center the SP lane in its own band above the action buttons
  const startX = UI_PANEL.x + UI_PANEL.w / 2 - totalW / 2;
  const startY = UI_PANEL.y + 94;
  const headerCenterX = UI_PANEL.x + UI_PANEL.w / 2;
  const labelW = 156;
  const labelH = 20;
  const countW = 34;
  const countH = 24;
  const headerGap = 12;
  const labelX = headerCenterX - (labelW + headerGap + countW) / 2;
  const labelY = startY - 28;
  const countX = labelX + labelW + headerGap;
  const countY = startY - 30;

  ctx.save();
  ctx.fillStyle = NIER_DARK;
  drawChamferedRect(labelX, labelY, labelW, labelH, 5);
  ctx.fill();

  ctx.fillStyle = "rgba(215, 207, 184, 0.92)";
  drawChamferedRect(countX, countY, countW, countH, 6);
  ctx.fill();
  strokeWithCA("rgba(71, 68, 59, 0.35)", 1);

  ctx.fillStyle = "rgba(71, 68, 59, 0.22)";
  ctx.fillRect(labelX + 12, labelY + labelH + 5, labelW + countW + headerGap - 24, 1);

  ctx.font = "800 11px 'NewRodin', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawTextWithCA(
    "SKILL POINTS",
    labelX + labelW / 2,
    labelY + labelH / 2 + 1,
    NIER_LIGHT,
  );

  ctx.font = "800 14px 'NewRodin', sans-serif";
  drawTextWithCA(
    `${state.sp}`,
    countX + countW / 2,
    countY + countH / 2 + 1,
    NIER_DARK,
  );

  // --- NEW: DETERMINE PREVIEW STATE ---
  let previewAction = null;
  // Only preview if it's the player's turn, not animating, and we aren't in a special Enhanced state
  if (
    state.current === STATES.PLAYER_TURN &&
    !state.isAnimating &&
    !state.isEnhanced
  ) {
    if (
      isInside(mouse.x, mouse.y, btnAttack) ||
      state.pendingAction === "ATTACK"
    )
      previewAction = "ATTACK";
    else if (
      isInside(mouse.x, mouse.y, btnSkill) ||
      state.pendingAction === "SKILL"
    )
      previewAction = "SKILL";
  }

  // Create a smooth, pulsing alpha value for the previews
  const pulseAlpha = 0.4 + Math.abs(Math.sin(performance.now() / 150)) * 0.6;

  for (let i = 0; i < state.maxSp; i++) {
    const px = startX + i * (spW + gap);

    // Logic to find which specific slot to animate
    let isPreviewGain = previewAction === "ATTACK" && i === state.sp; // The empty slot that will be filled
    let isPreviewSpend = previewAction === "SKILL" && i === state.sp - 1; // The filled slot that will be emptied

    // Draw recessed base slot
    ctx.fillStyle = "rgba(71, 68, 59, 0.2)";
    drawChamferedRect(px, startY, spW, spH, 3);
    ctx.fill();

    if (isPreviewGain) {
      // --- PURGED: SP Gain is now pulsing Light Beige ---
      ctx.fillStyle = `rgba(215, 207, 184, ${pulseAlpha * 0.4})`;
      drawChamferedRect(px, startY, spW, spH, 3);
      ctx.fill();
      strokeWithCA(`rgba(215, 207, 184, ${pulseAlpha})`, 2);
    } else if (isPreviewSpend) {
      // --- PURGED: SP Spend is now pulsing Dark Brown ---
      ctx.fillStyle = `rgba(71, 68, 59, ${pulseAlpha * 0.6})`;
      drawChamferedRect(px, startY, spW, spH, 3);
      ctx.fill();
      strokeWithCA(`rgba(71, 68, 59, 1)`, 2);
    } else if (i < state.sp) {
      // --- NORMAL FILLED SP ---
      ctx.save();
      // Custom tight shadow instead of the global deep shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowOffsetY = 2;
      ctx.shadowOffsetX = 0;
      ctx.shadowBlur = 0;

      ctx.fillStyle = NIER_LIGHT;
      drawChamferedRect(px, startY, spW, spH, 3);
      ctx.fill();
      ctx.restore(); // Clears the custom shadow

      strokeWithCA(NIER_DARK, 1);
    } else {
      // --- NORMAL EMPTY SP ---
      strokeWithCA("rgba(71, 68, 59, 0.4)", 1);
    }
  }
  ctx.restore();
}

export function drawTotalDamage() {
  if (state.fx.totalDamage.life <= 0 || state.fx.totalDamage.value <= 0) return;

  ctx.save();
  const life = state.fx.totalDamage.life;
  ctx.globalAlpha = Math.min(1, life * 2); // Smooth fade out

  const boxW = 240;
  const boxH = 85;

  // --- JUICE 1: Sharp kinetic slide-in from the right edge ---
  const slideOffset = life > 2.3 ? Math.pow((life - 2.3) * 5, 2) * 20 : 0;
  const startX = GAME_WIDTH - boxW - 50 + slideOffset;
  const startY = GAME_HEIGHT / 2 - 80;

  // Heavy impact scale bounce
  let scale = 1.0;
  if (life > 2.3) scale = 1.0 + (life - 2.3) * 0.2;

  ctx.translate(startX + boxW / 2, startY + boxH / 2);
  ctx.scale(scale, scale);
  ctx.translate(-(startX + boxW / 2), -(startY + boxH / 2));

  // The base dark box
  applyHardShadow();
  ctx.fillStyle = "rgba(71, 68, 59, 0.85)";
  drawChamferedRect(startX, startY, boxW, boxH, 15);
  ctx.fill();
  clearShadow();
  strokeWithCA(NIER_LIGHT, 2);

  // --- JUICE 2: The "Processing Impact" Flash ---
  // Briefly inverts the box color when a new hit lands
  if (life > 2.4) {
    ctx.fillStyle = "rgba(215, 207, 184, 0.85)";
    drawChamferedRect(startX, startY, boxW, boxH, 15);
    ctx.fill();
  }

  // --- JUICE 3: Geometric Target Brackets ---
  ctx.beginPath();
  // Top Left Bracket
  ctx.moveTo(startX - 8, startY + 20);
  ctx.lineTo(startX - 8, startY - 8);
  ctx.lineTo(startX + 20, startY - 8);
  // Bottom Right Bracket
  ctx.moveTo(startX + boxW + 8, startY + boxH - 20);
  ctx.lineTo(startX + boxW + 8, startY + boxH + 8);
  ctx.lineTo(startX + boxW - 20, startY + boxH + 8);
  strokeWithCA(NIER_DARK, 3);

  // --- JUICE 4: Scanning Data Line ---
  const scanY = startY + ((performance.now() / 15) % boxH);
  ctx.fillStyle = "rgba(215, 207, 184, 0.15)";
  ctx.fillRect(startX, scanY, boxW, 4);

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  // If the box is flashing, we must invert the text colors too!
  const titleColor = life > 2.4 ? NIER_DARK : "rgba(215, 207, 184, 0.7)";
  const dmgColor = life > 2.4 ? NIER_DARK : NIER_LIGHT;

  ctx.font = "800 16px 'NewRodin', sans-serif";
  ctx.letterSpacing = "2px";
  drawTextWithCA("TOTAL DMG", startX + boxW - 20, startY + 25, titleColor);
  ctx.letterSpacing = "0px";

  ctx.font = "800 46px 'NewRodin', sans-serif";
  const formattedDmg = Math.floor(state.fx.totalDamage.value).toLocaleString();
  drawTextWithCA(formattedDmg, startX + boxW - 20, startY + 60, dmgColor);

  ctx.restore();
}

export function drawUI() {
  ctx.save();
  layoutBattleHud();

  // 1. The Base Shadowed Panel
  applyHardShadow();
  ctx.fillStyle = NIER_LIGHT;
  ctx.beginPath();
  drawChamferedRect(UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h, 30);
  ctx.fill();
  clearShadow();

  // 2. The Dark Stroke Border
  ctx.beginPath();
  drawChamferedRect(UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h, 30);
  strokeWithCA("rgba(71, 68, 59, 0.3)", 1);

  // --- NIER JUICE: Internal Technical Grid ---
  ctx.save();
  ctx.beginPath();
  drawChamferedRect(UI_PANEL.x, UI_PANEL.y, UI_PANEL.w, UI_PANEL.h, 30);
  ctx.clip();

  ctx.beginPath();
  ctx.strokeStyle = "rgba(71, 68, 59, 0.04)";
  ctx.lineWidth = 1;
  const gridSize = 15;
  for (let i = 0; i <= UI_PANEL.w; i += gridSize) {
    ctx.moveTo(UI_PANEL.x + i, UI_PANEL.y);
    ctx.lineTo(UI_PANEL.x + i, UI_PANEL.y + UI_PANEL.h);
  }
  for (let i = 0; i <= UI_PANEL.h; i += gridSize) {
    ctx.moveTo(UI_PANEL.x, UI_PANEL.y + i);
    ctx.lineTo(UI_PANEL.x + UI_PANEL.w, UI_PANEL.y + i);
  }
  ctx.stroke();
  ctx.restore();

  // --- NIER JUICE: Audio Waveform Restored ---
  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
  }

  ctx.fillStyle = "rgba(71, 68, 59, 0.3)";
  for (let i = 0; i < 40; i++) {
    // Start with a static, flat 4px baseline
    let h = 4;

    if (analyser && dataArray) {
      let audioSpike = (dataArray[i] / 255) * 55;
      h += audioSpike;
    }

    ctx.fillRect(UI_PANEL.x + 40 + i * 6, UI_PANEL.y - 12 - h + 8, 3, h);
  }

  drawCommandReadout();

  // --- The Core Buttons ---
  if (state.current === STATES.PLAYER_TURN) {
    drawSkillPoints();

    const activeChar =
      party.find((p) => p.id === state.activeUnitId) || party[0];
    if (activeChar && !state.isAnimating) {
      const logic = activeChar.combatLogic;

      // Clean names without the messy "[ Q ]" baked in!
      let atkName = logic.basic.name;
      let skillName = logic.skill.name;
      let ultName = logic.ultimate.name;

      // Define the keys separately to pass to the badge renderer
      let atkKey = "Q";
      let skillKey = "E";
      let ultKey = "1";

      if (state.isEnhanced) {
        atkName = logic.ultimate.modes.blowoutBasic.name;
        skillName = logic.ultimate.modes.blowoutSkill.name;
      }

      const atkActive = state.pendingAction === "ATTACK";
      const skillActive = state.pendingAction === "SKILL";
      const ultActive = state.pendingAction === "ULTIMATE";

      const canUlt = (activeChar.energy || 0) >= (logic.ultimate.cost || 120);
      const canSkill = state.sp > 0;

      // Pass the shortcut key as the new 6th parameter
      drawButton(
        btnAttack,
        atkName,
        atkActive,
        state.isEnhanced,
        false,
        atkKey,
      );
      drawButton(
        btnSkill,
        skillName,
        skillActive,
        state.isEnhanced,
        !canSkill,
        skillKey,
      );
      if (!state.isEnhanced)
        drawButton(btnUltimate, ultName, ultActive, false, !canUlt, ultKey);
    }
  }

  drawTooltip();
  ctx.restore();
}

function drawCommandReadout() {
  const activeUnit = party.find((p) => p.id === state.activeUnitId);
  const targetEnemy = enemies.find((enemy) => enemy.id === state.selectedTargetId);
  const targetAlly = party.find((hero) => hero.id === state.selectedAllyId);

  const leftPodX = UI_PANEL.x + 26;
  const leftPodY = UI_PANEL.y + 18;
  const leftPodW = 332;
  const leftPodH = 56;
  const rightPodX = UI_PANEL.x + UI_PANEL.w - 358;
  const rightPodY = leftPodY;
  const rightPodW = 332;
  const rightPodH = 56;

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const modeLabel =
    state.pendingAction === "ATTACK"
      ? "BASIC"
      : state.pendingAction === "SKILL"
        ? "SKILL"
        : state.pendingAction === "ULTIMATE"
          ? "ULTIMATE"
          : "IDLE";
  const focusLabel =
    state.pendingAction === "SKILL" && targetAlly
      ? `ALLY ${compactLabel(targetAlly.name, 8)}`
      : targetEnemy
        ? `TARGET ${compactLabel(targetEnemy.name, 8)}`
        : "TARGET NONE";

  drawTechPanel(leftPodX, leftPodY, leftPodW, leftPodH, "Operator");
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  drawFittedLine(
    activeUnit ? compactLabel(activeUnit.name, 18) : "NO UNIT",
    leftPodX + 18,
    leftPodY + 28,
    leftPodW - 36,
    14,
    800,
    NIER_DARK,
  );
  drawFittedLine(
    activeUnit
      ? `${activeUnit.element?.toUpperCase() || "N/A"} | EN ${Math.floor(activeUnit.energy || 0)}/${activeUnit.maxEnergy || 120} | SPD ${Math.floor(getEffectiveSpd(activeUnit))}`
      : "AWAITING TIMELINE",
    leftPodX + 18,
    leftPodY + 45,
    leftPodW - 36,
    9,
    700,
    "rgba(71, 68, 59, 0.72)",
  );

  const focusTitle =
    state.pendingAction === "SKILL" ? "Support Focus" : "Target Focus";
  const focusName =
    state.pendingAction === "SKILL" && targetAlly
      ? compactLabel(targetAlly.name, 20)
      : targetEnemy
        ? compactLabel(targetEnemy.name, 20)
        : "NO LOCK";
  const focusMeta =
    state.pendingAction === "SKILL" && targetAlly
      ? `HP ${Math.floor(targetAlly.hp || 0)}/${targetAlly.baseHp || 0}`
      : targetEnemy
        ? `HP ${Math.floor(targetEnemy.hp || 0)}/${targetEnemy.baseHp || 0}`
        : "SELECT A FOCUS";

  drawTechPanel(rightPodX, rightPodY, rightPodW, rightPodH, focusTitle);
  ctx.textAlign = "left";
  drawFittedLine(
    compactLabel(focusName, 18),
    rightPodX + 18,
    rightPodY + 28,
    rightPodW - 36,
    14,
    800,
    NIER_DARK,
  );
  drawFittedLine(
    `${focusLabel} | ${focusMeta} | ${modeLabel}`,
    rightPodX + 18,
    rightPodY + 45,
    rightPodW - 36,
    9,
    700,
    "rgba(71, 68, 59, 0.72)",
  );
  ctx.restore();
}

export function drawButton(
  btn,
  text,
  forceActive = false,
  isEnhancedUI = false,
  isDisabled = false,
  shortcutKey = null, // NEW: Optional shortcut badge
) {
  layoutBattleHud();
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
    // REMOVED SHADOWS HERE
    ctx.fillStyle = NIER_DARK;
    drawChamferedRect(btn.x, renderY, btn.w, btn.h, 15);
    ctx.fill();
    textColor = NIER_LIGHT;
  } else {
    ctx.fillStyle = isEnhancedUI ? "#FFF" : "rgba(215, 207, 184, 0.5)";
    drawChamferedRect(btn.x, renderY, btn.w, btn.h, 15);
    ctx.fill();
    strokeWithCA("rgba(71, 68, 59, 0.4)", 1);
    textColor = NIER_DARK;
  }

  const sweepWidth = btn.w * 0.22;
  const sweepX =
    btn.x - sweepWidth + ((performance.now() / 10) % (btn.w + sweepWidth * 2));
  ctx.save();
  ctx.beginPath();
  drawChamferedRect(btn.x, renderY, btn.w, btn.h, 15);
  ctx.clip();
  const sweepGrad = ctx.createLinearGradient(
    sweepX,
    renderY,
    sweepX + sweepWidth,
    renderY,
  );
  sweepGrad.addColorStop(0, "rgba(215, 207, 184, 0)");
  sweepGrad.addColorStop(
    0.5,
    (hovered && isActive) || forceActive
      ? "rgba(215, 207, 184, 0.18)"
      : "rgba(71, 68, 59, 0.08)",
  );
  sweepGrad.addColorStop(1, "rgba(215, 207, 184, 0)");
  ctx.fillStyle = sweepGrad;
  ctx.fillRect(sweepX, renderY, sweepWidth, btn.h);
  ctx.restore();

  // --- JUICE: Kinetic Target Brackets ---
  if ((hovered && isActive && !isDisabled && !forceActive) || forceActive) {
    const offset = 10 + Math.abs(Math.sin(performance.now() / 150)) * 3;
    ctx.fillStyle = NIER_DARK;

    ctx.beginPath();
    ctx.moveTo(btn.x - offset, renderY + btn.h / 2);
    ctx.lineTo(btn.x - (offset + 6), renderY + btn.h / 2 - 6);
    ctx.lineTo(btn.x - (offset + 6), renderY + btn.h / 2 + 6);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(btn.x + btn.w + offset, renderY + btn.h / 2);
    ctx.lineTo(btn.x + btn.w + (offset + 6), renderY + btn.h / 2 - 6);
    ctx.lineTo(btn.x + btn.w + (offset + 6), renderY + btn.h / 2 + 6);
    ctx.fill();
  }

  // --- TEXT RENDERING ---
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

  // === NEW JUICE: CORNER SHORTCUT BADGE ===
  if (shortcutKey) {
    const bW = 22;
    const bH = 22;
    const bX = btn.x - 8;
    const bY = renderY - 8;

    const isHighlight = (hovered && isActive) || forceActive;
    const badgeBg = isHighlight ? NIER_LIGHT : NIER_DARK;
    const badgeFg = isHighlight ? NIER_DARK : NIER_LIGHT;

    // REMOVED SHADOWS HERE
    ctx.fillStyle = badgeBg;
    drawChamferedRect(bX, bY, bW, bH, 4);
    ctx.fill();

    strokeWithCA(isHighlight ? NIER_DARK : "rgba(71, 68, 59, 0.6)", 1);

    ctx.fillStyle = badgeFg;
    ctx.font = "800 12px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawTextWithCA(shortcutKey, bX + bW / 2, bY + bH / 2 + 1, badgeFg);
  }

  ctx.restore();
}

export function drawActiveSkillBanner() {
  if (!state.activeSkillName) return;
  ctx.save();
  const textY = 80;
  ctx.font = "800 24px 'NewRodin', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "6px";
  const textWidth = ctx.measureText(state.activeSkillName.toUpperCase()).width;
  const boxW = textWidth + 120;
  const boxX = GAME_WIDTH / 2 - boxW / 2;
  const boxY = textY - 25;

  applyHardShadow();
  ctx.fillStyle = "rgba(71, 68, 59, 0.85)";
  drawChamferedRect(boxX, boxY, boxW, 50, 12);
  ctx.fill();
  clearShadow();
  strokeWithCA(NIER_LIGHT, 2);
  ctx.fillStyle = "rgba(215, 207, 184, 0.18)";
  ctx.fillRect(boxX + 18, boxY + 12, boxW - 36, 2);
  ctx.fillRect(boxX + 18, boxY + 36, boxW - 36, 2);
  drawTextWithCA(
    state.activeSkillName.toUpperCase(),
    GAME_WIDTH / 2,
    textY + 2,
    NIER_LIGHT,
  );
  ctx.letterSpacing = "0px";
  ctx.restore();
}

// --- NEW: TOOLTIP RENDERER ---
function drawTooltip() {
  if (!mouse.heldAction) return;
  const holdTime = performance.now() - mouse.holdStart;
  if (holdTime < 300) return;

  const activeChar = party.find((p) => p.id === state.activeUnitId) || party[0];
  if (!activeChar) return;

  const logic = activeChar.combatLogic;
  let moveData;

  if (state.isEnhanced) {
    if (mouse.heldAction === "ATTACK")
      moveData = logic.ultimate.modes.blowoutBasic;
    else if (mouse.heldAction === "SKILL")
      moveData = logic.ultimate.modes.blowoutSkill;
  } else {
    if (mouse.heldAction === "ATTACK") moveData = logic.basic;
    else if (mouse.heldAction === "SKILL") moveData = logic.skill;
    else if (mouse.heldAction === "ULTIMATE") moveData = logic.ultimate;
  }

  if (!moveData || !moveData.description) return;

  // 1. Force description into an array so we can process paragraphs
  let paragraphs = Array.isArray(moveData.description)
    ? moveData.description
    : [moveData.description];

  // 2. Swap out the placeholder tokens for EVERY paragraph
  paragraphs = paragraphs.map((text) => {
    text = text.replace(/%element%/g, activeChar.element || "Physical");

    // Standard attacks
    if (moveData.multiplier)
      text = text.replace(
        /%mult%/g,
        Math.round(moveData.multiplier * 100) + "%",
      );
    if (moveData.multiplierAdj)
      text = text.replace(
        /%multAdj%/g,
        Math.round(moveData.multiplierAdj * 100) + "%",
      );

    // Ultimate sub-mode fetching (so the main ultimate desc can read its sub-attacks)
    if (logic.ultimate && logic.ultimate.modes) {
      text = text.replace(
        /%multBasic%/g,
        Math.round(logic.ultimate.modes.blowoutBasic.multiplier * 100) + "%",
      );
      text = text.replace(
        /%multSkill%/g,
        Math.round(logic.ultimate.modes.blowoutSkill.multiplier * 100) + "%",
      );
      text = text.replace(
        /%multSkillAdj%/g,
        Math.round(logic.ultimate.modes.blowoutSkill.multiplierAdj * 100) + "%",
      );
    }
    return text;
  });

  let targetBtn = btnAttack;
  if (mouse.heldAction === "SKILL") targetBtn = btnSkill;
  if (mouse.heldAction === "ULTIMATE") targetBtn = btnUltimate;

  const boxW = 540;
  const boxX = targetBtn.x + targetBtn.w / 2 - boxW / 2;

  ctx.save();
  ctx.font = "600 18px 'NewRodin', sans-serif";

  // 3. Measure all paragraphs and stitch them together with blank lines
  let allLines = [];
  paragraphs.forEach((p) => {
    const { lines } = getWrappedText(ctx, p, boxW - 40, 18, 500);
    allLines.push(...lines);
    allLines.push(""); // Add an empty line for spacing between paragraphs!
  });
  allLines.pop(); // Remove the very last empty line

  const lineHeight = 26;
  const paddingY = 40;
  const boxH = paddingY + allLines.length * lineHeight;
  const boxY = targetBtn.y - boxH - 20;

  const alpha = Math.min(1, (holdTime - 300) / 150);
  ctx.globalAlpha = alpha;

  applyHardShadow();
  ctx.fillStyle = NIER_LIGHT;
  drawChamferedRect(boxX, boxY, boxW, boxH, 15);
  ctx.fill();
  clearShadow();
  strokeWithCA(NIER_DARK, 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  allLines.forEach((line, i) => {
    // Skip drawing if it's our artificial paragraph break
    if (line !== "") {
      const startY = boxY + 20 + lineHeight / 2;
      drawTextWithCA(line, boxX + boxW / 2, startY + i * lineHeight, NIER_DARK);
    }
  });

  ctx.restore();
}
