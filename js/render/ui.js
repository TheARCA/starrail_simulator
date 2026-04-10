import {
  STATES,
  state,
  mouse,
  GAME_WIDTH,
  UI_PANEL,
  btnAttack,
  btnSkill,
  btnUltimate,
  btnStartBattle,
  btnClearEnemies,
} from "../core/state.js";
import { DATABASE_HEROES, party } from "../data/hero_db.js";
import { DATABASE_ENEMIES, enemies } from "../data/enemy_db.js";
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

// Exported so input.js can reuse them!
export function isInside(x, y, rect) {
  return x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h;
}
export function getMenuRect(index, total, startY) {
  const w = 240;
  const h = 70;
  const spacing = 30;
  const totalW = total * w + (total - 1) * spacing;
  const startX = (GAME_WIDTH - totalW) / 2;
  return { x: startX + index * (w + spacing), y: startY, w, h };
}

export function drawMainMenu() {
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
  allUnits.sort((a, b) => (a.av || 0) - (b.av || 0));

  const startX = 40;
  const startY = 80;
  ctx.save();
  ctx.font = "400 12px 'NewRodin', sans-serif";
  ctx.textAlign = "left";
  drawTextWithCA("ACTION ORDER", startX, startY - 20, "rgba(71, 68, 59, 0.7)");

  allUnits.forEach((u, i) => {
    if (i > 7) return;
    const isPlayer = aliveParty.some((p) => p.id === u.id);
    const isActive = i === 0 && !state.isAnimating;
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
      `AV: ${Math.ceil(u.av || 0)}`,
      startX + xOffset + 48,
      yPos + 34,
      "rgba(71, 68, 59, 0.8)",
    );
  });
  ctx.restore();
}

function drawSkillPoints() {
  const spW = 35;
  const spH = 12;
  const gap = 8;
  const totalW = state.maxSp * spW + (state.maxSp - 1) * gap;

  // Fit perfectly above the right side of the main action panel
  const startX = UI_PANEL.x + UI_PANEL.w - totalW - 50;
  const startY = UI_PANEL.y - 25;

  ctx.save();
  ctx.font = "800 16px 'NewRodin', sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  drawTextWithCA(
    "SKILL POINTS",
    startX - 20,
    startY + spH / 2 + 1,
    "rgba(71, 68, 59, 0.8)",
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
      applyHardShadow();
      ctx.fillStyle = NIER_LIGHT;
      drawChamferedRect(px, startY, spW, spH, 3);
      ctx.fill();
      clearShadow();
      strokeWithCA(NIER_DARK, 1);
    } else {
      // --- NORMAL EMPTY SP ---
      strokeWithCA("rgba(71, 68, 59, 0.4)", 1);
    }
  }
  ctx.restore();
}

export function drawUI() {
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

  if (state.current === STATES.PLAYER_TURN) {
    drawSkillPoints();

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

      const canUlt = (activeChar.energy || 0) >= (logic.ultimate.cost || 120);
      const canSkill = state.sp > 0;

      drawButton(btnAttack, atkName, atkActive, state.isEnhanced);
      drawButton(btnSkill, skillName, skillActive, state.isEnhanced, !canSkill);
      if (!state.isEnhanced)
        drawButton(btnUltimate, ultName, ultActive, false, !canUlt);
    }
  }
}

export function drawButton(
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
  } else drawTextWithCA(lines[0], btn.x + btn.w / 2, textY, textColor);
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
  drawTextWithCA(
    state.activeSkillName.toUpperCase(),
    GAME_WIDTH / 2,
    textY + 2,
    NIER_LIGHT,
  );
  ctx.letterSpacing = "0px";
  ctx.restore();
}
