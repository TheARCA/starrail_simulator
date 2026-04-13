import {
  STATES,
  state,
  mouse,
  CARD_SIZE,
  btnAttack,
  btnSkill,
  btnUltimate,
  btnStartBattle,
  btnClearEnemies,
} from "../core/state.js";
import { DATABASE_HEROES, party } from "../data/hero_db.js";
import { DATABASE_ENEMIES, enemies } from "../data/enemy_db.js";
import { initAudio, playUIClick } from "./sound.js";
import { isInside, getMenuRect } from "../render/ui.js";

let isInitialized = false;

export function initInputs(onStartBattle, onExecuteCombat) {
  if (isInitialized) return;
  isInitialized = true;

  const canvas = document.getElementById("gameCanvas");

  // Track Mouse Position
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
  });

  // Handle Mouse Clicks
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;

    initAudio();
    playUIClick();

    if (state.current === STATES.MAIN_MENU) {
      DATABASE_HEROES.forEach((hero, i) => {
        const menuRect = getMenuRect(i, DATABASE_HEROES.length, 300);
        if (isInside(mouse.x, mouse.y, menuRect)) {
          const existingIndex = party.findIndex((p) => p.id === hero.id);
          if (existingIndex > -1) party.splice(existingIndex, 1);
          else if (party.length < 4)
            party.push(JSON.parse(JSON.stringify(hero)));
        }
      });

      DATABASE_ENEMIES.forEach((enemy, i) => {
        const menuRect = getMenuRect(i, DATABASE_ENEMIES.length, 520);
        if (isInside(mouse.x, mouse.y, menuRect)) {
          if (enemies.length < 5) {
            let clone = JSON.parse(JSON.stringify(enemy));
            clone.id =
              clone.id +
              "_" +
              Date.now() +
              "_" +
              Math.floor(Math.random() * 1000);
            enemies.push(clone);
          }
        }
      });

      if (enemies.length > 0 && isInside(mouse.x, mouse.y, btnClearEnemies))
        enemies.length = 0;

      // Trigger the engine's Battle Start callback
      if (
        party.length > 0 &&
        enemies.length > 0 &&
        isInside(mouse.x, mouse.y, btnStartBattle)
      ) {
        onStartBattle();
      }
      return;
    }

    if (state.current !== STATES.PLAYER_TURN || state.isAnimating) return;

    const activeChar =
      party.find((p) => p.id === state.activeUnitId) || party[0];
    if (!activeChar) return;

    const aliveEnemies = enemies.filter((e) => e.hp > 0);
    let clickedEnemyId = null;

    aliveEnemies.forEach((enemy) => {
      if (enemy.renderX !== undefined) {
        const cardRect = {
          x: enemy.renderX,
          y: enemy.renderY,
          w: CARD_SIZE,
          h: CARD_SIZE + 100,
        };
        if (isInside(mouse.x, mouse.y, cardRect)) clickedEnemyId = enemy.id;
      }
    });

    if (clickedEnemyId) {
      if (state.selectedTargetId === clickedEnemyId && state.pendingAction) {
        // Double-click on target triggers combat!
        onExecuteCombat(state.pendingAction, activeChar);
      } else {
        state.selectedTargetId = clickedEnemyId;
      }
      return;
    }

    // --- NEW: HOLD LOGIC FOR BUTTONS (Starts the timer) ---
    if (isInside(mouse.x, mouse.y, btnAttack)) {
      mouse.heldAction = "ATTACK";
      mouse.holdStart = performance.now();
    } else if (isInside(mouse.x, mouse.y, btnSkill)) {
      if (state.sp > 0) {
        mouse.heldAction = "SKILL";
        mouse.holdStart = performance.now();
      }
    } else if (isInside(mouse.x, mouse.y, btnUltimate) && !state.isEnhanced) {
      const ultCost = activeChar.combatLogic.ultimate.cost || 120;
      if (activeChar.energy >= ultCost) {
        mouse.heldAction = "ULTIMATE";
        mouse.holdStart = performance.now();
      }
    }
  });

  // --- NEW: MOUSE UP HANDLER (Executes action if tapped quickly) ---
  canvas.addEventListener("mouseup", (e) => {
    mouse.isDown = false;

    if (mouse.heldAction) {
      const holdDuration = performance.now() - mouse.holdStart;
      if (holdDuration < 300) {
        const activeChar =
          party.find((p) => p.id === state.activeUnitId) || party[0];

        if (mouse.heldAction === "ATTACK") {
          state.pendingAction = "ATTACK";
        } else if (mouse.heldAction === "SKILL") {
          state.pendingAction = "SKILL";
        } else if (mouse.heldAction === "ULTIMATE") {
          const ultCost = activeChar.combatLogic.ultimate.cost || 120;
          if (activeChar.combatLogic.ultimate.tag === "Enhance") {
            state.isEnhanced = true;
            activeChar.energy -= ultCost;
            state.fx.flash = 0.4;
          } else {
            state.pendingAction = "ULTIMATE";
          }
        }
      }
      mouse.heldAction = null;
    }
  });

  // Handle Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    initAudio();

    if (state.current !== STATES.PLAYER_TURN || state.isAnimating) return;

    playUIClick(); // Play beep for valid combat hotkeys

    const key = e.key.toLowerCase();
    const aliveEnemies = enemies.filter((en) => en.hp > 0);
    if (aliveEnemies.length === 0) return;

    // Target selection
    if (key === "a" || key === "d") {
      let currentIndex = aliveEnemies.findIndex(
        (en) => en.id === state.selectedTargetId,
      );
      if (currentIndex === -1) currentIndex = 0;
      if (key === "a")
        currentIndex =
          (currentIndex - 1 + aliveEnemies.length) % aliveEnemies.length;
      else if (key === "d")
        currentIndex = (currentIndex + 1) % aliveEnemies.length;
      state.selectedTargetId = aliveEnemies[currentIndex].id;
    }

    if (key === "q") {
      state.pendingAction = "ATTACK";
    } else if (key === "e") {
      // --- FIXED: Keyboard restriction
      if (state.sp > 0) state.pendingAction = "SKILL";
    }

    // Ultimate Hijack System
    if (["1", "2", "3", "4"].includes(key)) {
      const partyIndex = parseInt(key) - 1;
      const char = party[partyIndex];
      if (char && char.hp > 0) {
        const ultCost = char.combatLogic.ultimate.cost || 120;
        if (char.energy >= ultCost) {
          if (
            char.combatLogic.ultimate.tag === "Enhance" &&
            !state.isEnhanced
          ) {
            state.isEnhanced = true;
            char.energy -= ultCost;
            state.fx.flash = 0.4;
          } else if (!state.isEnhanced) {
            state.pendingAction = "ULTIMATE";
            // Trigger Ultimate Free Action immediately!
            onExecuteCombat("ULTIMATE", char);
          }
        }
      }
    }

    // Spacebar to execute
    if (e.code === "Space" || key === " ") {
      e.preventDefault();
      const activeChar =
        party.find((p) => p.id === state.activeUnitId) || party[0];
      if (state.pendingAction) onExecuteCombat(state.pendingAction, activeChar);
    }
  });
}
