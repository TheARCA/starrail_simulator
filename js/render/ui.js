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
  btnHeroPrev,
  btnHeroNext,
  btnEnemyPrev,
  btnEnemyNext,
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
import {
  getCurrentActionValue,
  getEffectiveSpd,
  syncActionValue,
} from "../utils/speed.js";
import { analyser, dataArray } from "../core/audio_manager.js";

const menuImageCache = {};

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

function drawFittedLine(
  text,
  x,
  y,
  maxWidth,
  initialFontSize,
  fontWeight,
  color,
) {
  let fontSize = initialFontSize;
  while (fontSize > 8) {
    ctx.font = `${fontWeight} ${fontSize}px 'NewRodin', sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 1;
  }
  drawTextWithCA(text, x, y, color);
}

function getMenuEntityImage(entity, isEnemy) {
  if (!entity) return null;
  if (menuImageCache[entity.id]) return menuImageCache[entity.id];

  const img = new Image();
  const folder = isEnemy ? "enemies" : "characters";
  const baseImageId = entity.id.replace(/_\d+_\d+$/, "");
  const extensions = ["webp", "png", "jpg", "jpeg"];
  let currentExtIndex = 0;

  img.src = `assets/img/${folder}/${baseImageId}.${extensions[currentExtIndex]}`;
  img.onerror = () => {
    currentExtIndex++;
    if (currentExtIndex < extensions.length) {
      img.src = `assets/img/${folder}/${baseImageId}.${extensions[currentExtIndex]}`;
    } else {
      img.isPlaceholder = true;
    }
  };

  menuImageCache[entity.id] = img;
  return img;
}

export const HERO_MENU_PAGE_SIZE = 4;
export const ENEMY_MENU_PAGE_SIZE = 4;

function clampMenuPage(page, total, pageSize) {
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  return Math.max(0, Math.min(page, maxPage));
}

function getStackedMenuRect(index, total, x, areaY, areaH, w, h, gap) {
  return { x, y: areaY + index * (h + gap), w, h };
}

export function getVisibleHeroEntries() {
  state.menu.heroPage = clampMenuPage(
    state.menu.heroPage,
    DATABASE_HEROES.length,
    HERO_MENU_PAGE_SIZE,
  );
  const start = state.menu.heroPage * HERO_MENU_PAGE_SIZE;
  const visibleHeroes = DATABASE_HEROES.slice(
    start,
    start + HERO_MENU_PAGE_SIZE,
  );
  return visibleHeroes.map((hero, index) => ({
    hero,
    absoluteIndex: start + index,
    rect: getStackedMenuRect(
      index,
      visibleHeroes.length,
      118,
      338,
      468,
      420,
      108,
      22,
    ),
  }));
}

export function getVisibleEnemyEntries() {
  state.menu.enemyPage = clampMenuPage(
    state.menu.enemyPage,
    DATABASE_ENEMIES.length,
    ENEMY_MENU_PAGE_SIZE,
  );
  const start = state.menu.enemyPage * ENEMY_MENU_PAGE_SIZE;
  const visibleEnemies = DATABASE_ENEMIES.slice(
    start,
    start + ENEMY_MENU_PAGE_SIZE,
  );
  return visibleEnemies.map((enemy, index) => ({
    enemy,
    absoluteIndex: start + index,
    rect: getStackedMenuRect(
      index,
      visibleEnemies.length,
      GAME_WIDTH - 538,
      338,
      468,
      420,
      108,
      22,
    ),
  }));
}

function drawMenuSectionHeading(x, y, w, label, meta, align = "left") {
  const tabW = 144;
  const tabX = align === "left" ? x : x + w - tabW;
  const lineY = y + 26;

  ctx.save();
  ctx.fillStyle = NIER_DARK;
  drawChamferedRect(tabX, y, tabW, 22, 6);
  ctx.fill();

  ctx.textBaseline = "middle";
  ctx.font = "800 11px 'NewRodin', sans-serif";

  ctx.textAlign = "left";
  drawTextWithCA(label.toUpperCase(), tabX + 18, y + 11, NIER_LIGHT);

  ctx.fillStyle = "rgba(71, 68, 59, 0.2)";
  ctx.fillRect(x, lineY, w, 1);

  ctx.font = "700 11px 'NewRodin', sans-serif";
  ctx.fillStyle = "rgba(71, 68, 59, 0.58)";
  ctx.textAlign = align === "left" ? "right" : "left";
  drawTextWithCA(
    meta.toUpperCase(),
    align === "left" ? x + w : x,
    y + 11,
    "rgba(71, 68, 59, 0.58)",
  );
  ctx.restore();
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
    drawTextWithCA(
      meta.toUpperCase(),
      x + w - 20,
      y + 16,
      "rgba(71, 68, 59, 0.58)",
    );
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
  const visibleHeroes = getVisibleHeroEntries();
  const visibleEnemies = getVisibleEnemyEntries();
  const heroColumn = { x: 118, y: 264, w: 420 };
  const enemyColumn = { x: GAME_WIDTH - 538, y: 264, w: 420 };
  const deployPanel = { x: 624, y: 266, w: 672, h: 404 };
  const readiness = {
    squadReady: party.length > 0,
    enemyReady: enemies.length > 0,
  };
  const heroPages = Math.max(
    1,
    Math.ceil(DATABASE_HEROES.length / HERO_MENU_PAGE_SIZE),
  );
  const enemyPages = Math.max(
    1,
    Math.ceil(DATABASE_ENEMIES.length / ENEMY_MENU_PAGE_SIZE),
  );

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "300 34px 'NewRodin', sans-serif";
  drawTextWithCA(
    "HONKAI: STAR RAIL - 2D REIMAGINED",
    GAME_WIDTH / 2,
    100,
    NIER_DARK,
  );
  ctx.font = "700 11px 'NewRodin', sans-serif";
  drawTextWithCA(
    "Assemble a squad. Lock a target group. Open the combat instance.",
    GAME_WIDTH / 2,
    130,
    "rgba(71, 68, 59, 0.6)",
  );
  ctx.fillStyle = "rgba(71, 68, 59, 0.16)";
  ctx.fillRect(596, 156, 728, 1);
  ctx.fillRect(596, 164, 728, 1);
  ctx.restore();

  btnHeroPrev.x = heroColumn.x;
  btnHeroPrev.y = 794;
  btnHeroPrev.w = 44;
  btnHeroPrev.h = 44;
  btnHeroNext.x = heroColumn.x + heroColumn.w - 44;
  btnHeroNext.y = 794;
  btnHeroNext.w = 44;
  btnHeroNext.h = 44;

  btnEnemyPrev.x = enemyColumn.x;
  btnEnemyPrev.y = 794;
  btnEnemyPrev.w = 44;
  btnEnemyPrev.h = 44;
  btnEnemyNext.x = enemyColumn.x + enemyColumn.w - 44;
  btnEnemyNext.y = 794;
  btnEnemyNext.w = 44;
  btnEnemyNext.h = 44;

  drawMenuSectionHeading(
    heroColumn.x,
    heroColumn.y,
    heroColumn.w,
    "Allies",
    `${party.length}/4 Ready`,
    "left",
  );
  drawMenuSectionHeading(
    enemyColumn.x,
    enemyColumn.y,
    enemyColumn.w,
    "Enemies",
    `${enemies.length}/5 Loaded`,
    "right",
  );

  visibleHeroes.forEach(({ hero, absoluteIndex, rect }) => {
    drawMenuToggle(
      rect,
      hero,
      party.some((p) => p.id === hero.id),
      absoluteIndex + 1,
    );
  });

  if (heroPages > 1) {
    drawMenuPageButton(btnHeroPrev, "<", state.menu.heroPage > 0);
    drawMenuPageButton(btnHeroNext, ">", state.menu.heroPage < heroPages - 1);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
      ctx.font = "700 11px 'NewRodin', sans-serif";
      drawTextWithCA(
        `${state.menu.heroPage + 1}/${heroPages}`,
        heroColumn.x + heroColumn.w / 2,
        816,
        "rgba(71, 68, 59, 0.56)",
      );
      ctx.restore();
  }

  visibleEnemies.forEach(({ enemy, absoluteIndex, rect }) => {
    drawMenuCounter(
      rect,
      enemy,
      enemies.filter((e) => e.name === enemy.name).length,
      absoluteIndex + 1,
    );
  });

  if (enemyPages > 1) {
    drawMenuPageButton(btnEnemyPrev, "<", state.menu.enemyPage > 0);
    drawMenuPageButton(
      btnEnemyNext,
      ">",
      state.menu.enemyPage < enemyPages - 1,
    );
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
      ctx.font = "700 11px 'NewRodin', sans-serif";
      drawTextWithCA(
        `${state.menu.enemyPage + 1}/${enemyPages}`,
        enemyColumn.x + enemyColumn.w / 2,
        816,
        "rgba(71, 68, 59, 0.56)",
      );
      ctx.restore();
    }

  btnClearEnemies.x = deployPanel.x + 30;
  btnClearEnemies.y = deployPanel.y + deployPanel.h - 70;
  btnClearEnemies.w = 158;
  btnClearEnemies.h = 34;

  ctx.save();
  applyHardShadow();
  ctx.fillStyle = "rgba(207, 198, 174, 0.88)";
  drawChamferedRect(
    deployPanel.x,
    deployPanel.y,
    deployPanel.w,
    deployPanel.h,
    18,
  );
  ctx.fill();
  clearShadow();
  strokeWithCA("rgba(71, 68, 59, 0.24)", 1);

  ctx.save();
  ctx.beginPath();
  drawChamferedRect(
    deployPanel.x,
    deployPanel.y,
    deployPanel.w,
    deployPanel.h,
    18,
  );
  ctx.clip();
  const panelGradient = ctx.createLinearGradient(
    deployPanel.x,
    deployPanel.y,
    deployPanel.x + deployPanel.w,
    deployPanel.y + deployPanel.h,
  );
  panelGradient.addColorStop(0, "rgba(220, 211, 188, 0.18)");
  panelGradient.addColorStop(1, "rgba(71, 68, 59, 0.06)");
  ctx.fillStyle = panelGradient;
  ctx.fillRect(deployPanel.x, deployPanel.y, deployPanel.w, deployPanel.h);

  ctx.fillStyle = "rgba(71, 68, 59, 0.035)";
  for (let i = 0; i < deployPanel.h; i += 8) {
    ctx.fillRect(deployPanel.x, deployPanel.y + i, deployPanel.w, 1);
  }
  for (let i = 40; i < deployPanel.w; i += 54) {
    ctx.fillRect(deployPanel.x + i, deployPanel.y + 24, 1, deployPanel.h - 48);
  }
  ctx.restore();

  strokeWithCA("rgba(71, 68, 59, 0.15)", 1);
  drawChamferedRect(
    deployPanel.x + 20,
    deployPanel.y + 20,
    deployPanel.w - 40,
    deployPanel.h - 40,
    14,
  );

  ctx.fillStyle = NIER_DARK;
  drawChamferedRect(deployPanel.x + 24, deployPanel.y - 12, 160, 20, 5);
  ctx.fill();
  ctx.font = "800 10px 'NewRodin', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  drawTextWithCA("DEPLOY", deployPanel.x + 38, deployPanel.y - 1, NIER_LIGHT);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "300 64px 'NewRodin', sans-serif";
  drawTextWithCA(
    "VS",
    GAME_WIDTH / 2,
    deployPanel.y + 112,
    "rgba(71, 68, 59, 0.12)",
  );
  ctx.fillStyle = "rgba(71, 68, 59, 0.12)";
  ctx.fillRect(GAME_WIDTH / 2 - 110, deployPanel.y + 132, 220, 1);

  ctx.font = "800 32px 'NewRodin', sans-serif";
  drawTextWithCA(
    readiness.squadReady && readiness.enemyReady
      ? "COMBAT READY"
      : "STANDBY",
    GAME_WIDTH / 2,
    deployPanel.y + 182,
    NIER_DARK,
  );
  ctx.font = "700 12px 'NewRodin', sans-serif";
  drawTextWithCA(
    readiness.squadReady && readiness.enemyReady
      ? "Launch the encounter whenever you are ready."
      : "Lock at least one ally and one enemy to proceed.",
    GAME_WIDTH / 2,
    deployPanel.y + 214,
    "rgba(71, 68, 59, 0.62)",
  );

  ctx.font = "800 12px 'NewRodin', sans-serif";
  ctx.textAlign = "left";
  drawTextWithCA(
    `${String(party.length).padStart(2, "0")}  ALLIES`,
    deployPanel.x + 42,
    deployPanel.y + deployPanel.h - 110,
    "rgba(71, 68, 59, 0.68)",
  );
  ctx.textAlign = "right";
  drawTextWithCA(
    `${String(enemies.length).padStart(2, "0")}  HOSTILES`,
    deployPanel.x + deployPanel.w - 42,
    deployPanel.y + deployPanel.h - 110,
    "rgba(71, 68, 59, 0.68)",
  );
  ctx.restore();

  btnStartBattle.x = GAME_WIDTH / 2 - 212;
  btnStartBattle.y = deployPanel.y + deployPanel.h - 128;
  btnStartBattle.w = 424;
  btnStartBattle.h = 72;

  ctx.save();
  applyHardShadow();
  ctx.fillStyle =
    readiness.squadReady && readiness.enemyReady
      ? "rgba(71, 68, 59, 0.94)"
      : "rgba(71, 68, 59, 0.12)";
  drawChamferedRect(
    btnStartBattle.x,
    btnStartBattle.y,
    btnStartBattle.w,
    btnStartBattle.h,
    18,
  );
  ctx.fill();
  clearShadow();
  strokeWithCA(
    readiness.squadReady && readiness.enemyReady
      ? "rgba(215, 207, 184, 0.2)"
      : "rgba(71, 68, 59, 0.28)",
    1,
  );
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = readiness.squadReady && readiness.enemyReady
    ? "800 24px 'NewRodin', sans-serif"
    : "400 22px 'NewRodin', sans-serif";
  drawTextWithCA(
    readiness.squadReady && readiness.enemyReady
      ? "BEGIN SIMULATION"
      : "AWAITING SELECTIONS",
    btnStartBattle.x + btnStartBattle.w / 2,
    btnStartBattle.y + btnStartBattle.h / 2 + 1,
    readiness.squadReady && readiness.enemyReady
      ? NIER_LIGHT
      : "rgba(71, 68, 59, 0.52)",
  );
  ctx.restore();

  if (enemies.length > 0) {
    ctx.save();
    const hovered = isInside(mouse.x, mouse.y, btnClearEnemies);
    ctx.fillStyle = hovered
      ? "rgba(71, 68, 59, 0.9)"
      : "rgba(71, 68, 59, 0.14)";
    drawChamferedRect(
      btnClearEnemies.x,
      btnClearEnemies.y,
      btnClearEnemies.w,
      btnClearEnemies.h,
      8,
    );
    ctx.fill();
    strokeWithCA(
      hovered ? "rgba(215, 207, 184, 0.2)" : "rgba(71, 68, 59, 0.22)",
      1,
    );
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 11px 'NewRodin', sans-serif";
    drawTextWithCA(
      "RESET HOSTILES",
      btnClearEnemies.x + btnClearEnemies.w / 2,
      btnClearEnemies.y + btnClearEnemies.h / 2 + 1,
      hovered ? NIER_LIGHT : NIER_DARK,
    );
    ctx.restore();
  }
}

function drawMenuToggle(rect, hero, isSelected, slotIndex) {
  drawMenuSelectionCard({
    rect,
    hovered: isInside(mouse.x, mouse.y, rect),
    isActive: isSelected,
    entity: hero,
    isEnemy: false,
    indexLabel: `${slotIndex}`,
    monogram: hero.name.charAt(0).toUpperCase(),
    title: compactLabel(hero.name, 18),
    subtitle: `${hero.path.toUpperCase()} / ${hero.element.toUpperCase()}`,
    badgeText: null,
  });
}

function drawMenuCounter(rect, enemy, count, slotIndex) {
  const weaknessText = (enemy.weaknesses || [])
    .map((w) => w.charAt(0).toUpperCase())
    .join(" / ");
  drawMenuSelectionCard({
    rect,
    hovered: isInside(mouse.x, mouse.y, rect),
    isActive: count > 0,
    entity: enemy,
    isEnemy: true,
    indexLabel: `${slotIndex}`,
    monogram: enemy.name.charAt(0).toUpperCase(),
    title: compactLabel(enemy.name, 18),
    subtitle: `WEAK ${weaknessText || "NONE"}`,
    badgeText: count > 0 ? `${count}` : null,
  });
}

function drawMenuSelectionCard({
  rect,
  hovered,
  isActive,
  entity,
  isEnemy,
  indexLabel,
  monogram,
  title,
  subtitle,
  badgeText = null,
}) {
  ctx.save();

  const bodyColor = isActive
    ? "rgba(71, 68, 59, 0.94)"
    : hovered
      ? "rgba(215, 207, 184, 0.94)"
      : "rgba(215, 207, 184, 0.82)";
  const titleColor = isActive ? NIER_LIGHT : NIER_DARK;
  const subtitleColor = isActive
    ? "rgba(215, 207, 184, 0.76)"
    : "rgba(71, 68, 59, 0.54)";
  const portraitTextColor = isActive ? NIER_LIGHT : NIER_DARK;
  const portraitRect = {
    x: rect.x + rect.w - 132,
    y: rect.y + 10,
    w: 112,
    h: rect.h - 20,
  };
  const portraitImg = getMenuEntityImage(entity, isEnemy);

  applyHardShadow();
  ctx.fillStyle = bodyColor;
  drawChamferedRect(rect.x, rect.y, rect.w, rect.h, 14);
  ctx.fill();
  clearShadow();
  strokeWithCA(
    isActive
      ? "rgba(215, 207, 184, 0.22)"
      : hovered
        ? "rgba(71, 68, 59, 0.46)"
        : "rgba(71, 68, 59, 0.18)",
    hovered && !isActive ? 2 : 1,
  );

  ctx.save();
  ctx.beginPath();
  drawChamferedRect(rect.x, rect.y, rect.w, rect.h, 14);
  ctx.clip();
  const overlay = ctx.createLinearGradient(
    rect.x,
    rect.y,
    rect.x + rect.w,
    rect.y,
  );
  overlay.addColorStop(
    0,
    isActive ? "rgba(215, 207, 184, 0.03)" : "rgba(71, 68, 59, 0.02)",
  );
  overlay.addColorStop(
    1,
    isActive ? "rgba(215, 207, 184, 0.12)" : "rgba(71, 68, 59, 0.08)",
  );
  ctx.fillStyle = overlay;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.fillStyle = isActive
    ? "rgba(215, 207, 184, 0.06)"
    : "rgba(71, 68, 59, 0.05)";
  for (let i = 0; i < rect.h; i += 8) {
    ctx.fillRect(rect.x, rect.y + i, rect.w, 1);
  }
  ctx.restore();

  ctx.fillStyle = isActive
    ? "rgba(215, 207, 184, 0.14)"
    : "rgba(71, 68, 59, 0.08)";
  drawChamferedRect(rect.x + 14, rect.y + 12, 5, rect.h - 24, 2);
  ctx.fill();

  ctx.fillStyle = isActive
    ? "rgba(215, 207, 184, 0.12)"
    : "rgba(71, 68, 59, 0.08)";
  drawChamferedRect(
    portraitRect.x,
    portraitRect.y,
    portraitRect.w,
    portraitRect.h,
    8,
  );
  ctx.fill();
  strokeWithCA(
    isActive ? "rgba(215, 207, 184, 0.18)" : "rgba(71, 68, 59, 0.16)",
    1,
  );

  ctx.save();
  ctx.beginPath();
  drawChamferedRect(
    portraitRect.x,
    portraitRect.y,
    portraitRect.w,
    portraitRect.h,
    8,
  );
  ctx.clip();
  if (
    portraitImg &&
    portraitImg.complete &&
    portraitImg.naturalHeight !== 0 &&
    !portraitImg.isPlaceholder
  ) {
    ctx.globalAlpha = isActive ? 0.44 : 0.26;
    ctx.drawImage(
      portraitImg,
      portraitRect.x,
      portraitRect.y,
      portraitRect.w,
      portraitRect.h,
    );
    const portraitFade = ctx.createLinearGradient(
      portraitRect.x - 26,
      portraitRect.x,
      portraitRect.y,
      portraitRect.x + portraitRect.w,
      portraitRect.y,
    );
    portraitFade.addColorStop(
      0,
      isActive ? "rgba(71, 68, 59, 0.78)" : "rgba(215, 207, 184, 0.82)",
    );
    portraitFade.addColorStop(
      0.48,
      isActive ? "rgba(71, 68, 59, 0.22)" : "rgba(215, 207, 184, 0.18)",
    );
    portraitFade.addColorStop(
      1,
      isActive ? "rgba(71, 68, 59, 0.05)" : "rgba(215, 207, 184, 0.05)",
    );
    ctx.fillStyle = portraitFade;
    ctx.fillRect(
      portraitRect.x,
      portraitRect.y,
      portraitRect.w,
      portraitRect.h,
    );
  } else {
    ctx.fillStyle = isActive
      ? "rgba(215, 207, 184, 0.09)"
      : "rgba(71, 68, 59, 0.05)";
    for (let i = -portraitRect.h; i < portraitRect.w; i += 18) {
      ctx.fillRect(
        portraitRect.x + i,
        portraitRect.y,
        1,
        portraitRect.h * 2,
      );
    }
    ctx.fillStyle = isActive
      ? "rgba(215, 207, 184, 0.14)"
      : "rgba(71, 68, 59, 0.1)";
    ctx.font = "800 34px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawTextWithCA(
      monogram,
      portraitRect.x + portraitRect.w / 2,
      portraitRect.y + portraitRect.h / 2 + 3,
      portraitTextColor,
    );
  }

  if (!isEnemy && portraitImg && !portraitImg.isPlaceholder && portraitImg.complete) {
    ctx.fillStyle = isActive
      ? "rgba(71, 68, 59, 0.22)"
      : "rgba(215, 207, 184, 0.16)";
    ctx.fillRect(portraitRect.x, portraitRect.y, 4, portraitRect.h);
  } else {
    ctx.fillStyle = isActive
      ? "rgba(215, 207, 184, 0.08)"
      : "rgba(71, 68, 59, 0.06)";
    ctx.fillRect(portraitRect.x + 14, portraitRect.y + 14, portraitRect.w - 28, 1);
    ctx.fillRect(
      portraitRect.x + 14,
      portraitRect.y + portraitRect.h - 15,
      portraitRect.w - 28,
      1,
    );
  }
  ctx.restore();

  const indexW = 34;
  const indexH = 24;
  ctx.fillStyle = isActive
    ? "rgba(215, 207, 184, 0.12)"
    : "rgba(71, 68, 59, 0.08)";
  drawChamferedRect(rect.x + 14, rect.y + 12, indexW, indexH, 6);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 11px 'NewRodin', sans-serif";
  drawTextWithCA(
    indexLabel,
    rect.x + 14 + indexW / 2,
    rect.y + 12 + indexH / 2 + 1,
    titleColor,
  );

  const textX = rect.x + 34;
  const textW = rect.w - 188;

  ctx.textAlign = "left";
  ctx.font = "800 19px 'NewRodin', sans-serif";
  drawFittedLine(
    title,
    textX,
    rect.y + 38,
    textW,
    19,
    800,
    titleColor,
  );

  ctx.fillStyle = isActive
    ? "rgba(215, 207, 184, 0.14)"
    : "rgba(71, 68, 59, 0.12)";
  ctx.fillRect(textX, rect.y + 53, textW, 1);

  ctx.font = "700 11px 'NewRodin', sans-serif";
  drawTextWithCA(
    subtitle,
    textX,
    rect.y + 76,
    subtitleColor,
  );

  if (isActive) {
    ctx.fillStyle = "rgba(215, 207, 184, 0.14)";
    ctx.fillRect(rect.x + rect.w - 12, rect.y + 20, 3, rect.h - 40);
  }

  if (badgeText) {
    const badgeW = 30;
    const badgeH = 22;
    const badgeX = rect.x + rect.w - badgeW - 16;
    const badgeY = rect.y + rect.h - badgeH - 14;
    ctx.fillStyle = isActive ? NIER_LIGHT : "rgba(71, 68, 59, 0.12)";
    drawChamferedRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.font = "800 11px 'NewRodin', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawTextWithCA(
      badgeText,
      badgeX + badgeW / 2,
      badgeY + badgeH / 2 + 1,
      NIER_DARK,
    );
  }
  ctx.restore();
}

function drawMenuPageButton(btn, label, isEnabled) {
  ctx.save();
  const hovered = isInside(mouse.x, mouse.y, btn) && isEnabled;
  ctx.globalAlpha = isEnabled ? 1 : 0.28;

  ctx.fillStyle = hovered
    ? "rgba(71, 68, 59, 0.92)"
    : "rgba(215, 207, 184, 0.7)";
  drawChamferedRect(btn.x, btn.y, btn.w, btn.h, 8);
  ctx.fill();
  strokeWithCA("rgba(71, 68, 59, 0.24)", 1);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 18px 'NewRodin', sans-serif";
  drawTextWithCA(
    label,
    btn.x + btn.w / 2,
    btn.y + btn.h / 2 + 1,
    hovered ? NIER_LIGHT : NIER_DARK,
  );
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
  ctx.fillRect(
    labelX + 12,
    labelY + labelH + 5,
    labelW + countW + headerGap - 24,
    1,
  );

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
  const targetEnemy = enemies.find(
    (enemy) => enemy.id === state.selectedTargetId,
  );
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
      ? `${(activeUnit.path || "PATH").toUpperCase()} | ${(activeUnit.element || "N/A").toUpperCase()} | EN ${Math.floor(activeUnit.energy || 0)}/${activeUnit.maxEnergy || 120} | SPD ${Math.floor(getEffectiveSpd(activeUnit))}`
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
    `MODE ${modeLabel} | ${focusMeta}`,
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
