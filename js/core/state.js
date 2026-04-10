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

  activeUnitId: null,
  pendingAction: null,
  activeSkillName: null,

  fx: {
    shake: 0,
    flash: 0,
    invert: 0,
    cinematic: false,
    particles: [],
    floatingTexts: [],
    dataStrings: [],
    shockwaves: [],
  },
};

export const mouse = { x: 0, y: 0 };

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const CARD_SIZE = 180;

// --- HORIZONTAL BATTLE COMMAND INTERFACE REDESIGN ---
export const UI_PANEL = { x: 420, y: 880, w: 1080, h: 120 }; // Pushed down from 840

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
