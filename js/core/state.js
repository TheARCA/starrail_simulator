export const STATES = {
  MAIN_MENU: "MAIN_MENU",
  PLAYER_TURN: "PLAYER_TURN",
  ENEMY_TURN: "ENEMY_TURN",
  GAME_OVER: "GAME_OVER",
};

export const state = {
  current: STATES.MAIN_MENU,
  isAnimating: false,
  isEnhanced: false,
  selectedTargetId: null,
  selectedAllyId: null,
  menu: {
    heroPage: 0,
    enemyPage: 0,
  },

  activeUnitId: null,
  extraTurnUnitId: null,
  pendingAction: null,
  activeSkillName: null,
  pendingEnemyActionTimer: null,
  followUpQueue: [],

  sp: 3,
  maxSp: 5,

  fx: {
    shake: 0,
    flash: 0,
    invert: 0,
    cinematic: false,
    particles: [],
    slashes: [],
    floatingTexts: [],
    dataStrings: [],
    shockwaves: [],
    totalDamage: { value: 0, life: 0 },
  },
};

export const mouse = {
  x: 0,
  y: 0,
  isDown: false,
  heldAction: null,
  holdStart: 0,
};
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const CARD_SIZE = 180;
export const UI_PANEL = { x: 300, y: 826, w: 1320, h: 198 };
export const btnAttack = { x: 460, y: 910, w: 300, h: 60 };
export const btnSkill = { x: 810, y: 910, w: 300, h: 60 };
export const btnUltimate = { x: 1160, y: 910, w: 300, h: 60 };
export const btnStartBattle = {
  x: 760,
  y: 900,
  w: 400,
  h: 80,
  text: "INITIALIZE COMBAT",
};
export const btnClearEnemies = {
  x: 1105,
  y: 455,
  w: 100,
  h: 32,
  text: "CLEAR",
};
export const btnHeroPrev = { x: 0, y: 0, w: 44, h: 44, text: "<" };
export const btnHeroNext = { x: 0, y: 0, w: 44, h: 44, text: ">" };
export const btnEnemyPrev = { x: 0, y: 0, w: 44, h: 44, text: "<" };
export const btnEnemyNext = { x: 0, y: 0, w: 44, h: 44, text: ">" };
