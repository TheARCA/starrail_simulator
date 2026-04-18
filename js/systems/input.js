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
import { DATABASE_HEROES, party } from "../data/characters/index.js";
import { DATABASE_ENEMIES, enemies } from "../data/enemies/index.js";
import { initAudio, playUIClick } from "../core/audio_manager.js";
import { isInside, getMenuRect } from "../render/ui.js";

let isInitialized = false;

function skillTargetsAlly(activeChar) {
  return activeChar?.combatLogic?.skill?.targetType === "Ally";
}

function setPendingAction(action, activeChar) {
  state.pendingAction = action;
  state.selectedTargetId = null;
  state.selectedAllyId = null;

  if (action === "SKILL" && skillTargetsAlly(activeChar)) {
    state.selectedAllyId = activeChar?.id || null;
  }
}

function armOrExecuteAction(action, activeChar, onExecuteCombat) {
  if (state.pendingAction === action) {
    onExecuteCombat(action, activeChar);
    return;
  }

  setPendingAction(action, activeChar);
}

function canUseUltimate(char) {
  if (!char || char.hp <= 0) return false;
  const ultCost = char.combatLogic?.ultimate?.cost || 120;
  return (char.energy || 0) >= ultCost;
}

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
    const isAllySkillTargeting =
      state.pendingAction === "SKILL" && skillTargetsAlly(activeChar);

    const aliveEnemies = enemies.filter((e) => e.hp > 0);
    const aliveParty = party.filter((p) => p.hp > 0);
    let clickedEnemyId = null;
    let clickedAllyId = null;

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

    if (isAllySkillTargeting) {
      aliveParty.forEach((hero) => {
        if (hero.renderX !== undefined) {
          const cardRect = {
            x: hero.renderX,
            y: hero.renderY,
            w: CARD_SIZE,
            h: CARD_SIZE + 100,
          };
          if (isInside(mouse.x, mouse.y, cardRect)) clickedAllyId = hero.id;
        }
      });
    }

    if (clickedAllyId) {
      if (state.selectedAllyId === clickedAllyId) {
        onExecuteCombat(state.pendingAction, activeChar);
      } else {
        state.selectedAllyId = clickedAllyId;
      }
      return;
    }

    if (clickedEnemyId && !isAllySkillTargeting) {
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

    if (state.current !== STATES.PLAYER_TURN || state.isAnimating) {
      mouse.heldAction = null;
      return;
    }

    if (mouse.heldAction) {
      const holdDuration = performance.now() - mouse.holdStart;
      if (holdDuration < 300) {
        const activeChar =
          party.find((p) => p.id === state.activeUnitId) || party[0];

        if (mouse.heldAction === "ATTACK") {
          armOrExecuteAction("ATTACK", activeChar, onExecuteCombat);
        } else if (mouse.heldAction === "SKILL") {
          armOrExecuteAction("SKILL", activeChar, onExecuteCombat);
        } else if (mouse.heldAction === "ULTIMATE") {
          const ultCost = activeChar.combatLogic.ultimate.cost || 120;
          if (activeChar.combatLogic.ultimate.tag === "Enhance") {
            state.isEnhanced = true;
            activeChar.energy -= ultCost;
            state.fx.flash = 0.4;
          } else {
            armOrExecuteAction("ULTIMATE", activeChar, onExecuteCombat);
          }
        }
      }
      mouse.heldAction = null;
    }
  });

  // Handle Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    initAudio();

    const key = e.key.toLowerCase();

    if (
      ["1", "2", "3", "4"].includes(key) &&
      state.current !== STATES.MAIN_MENU &&
      state.current !== STATES.GAME_OVER &&
      !state.isAnimating
    ) {
      const partyIndex = parseInt(key) - 1;
      const char = party[partyIndex];
      if (canUseUltimate(char)) {
        playUIClick();
        if (
          char.combatLogic.ultimate.tag === "Enhance" &&
          !state.isEnhanced
        ) {
          state.isEnhanced = true;
          char.energy -= char.combatLogic.ultimate.cost || 120;
          state.fx.flash = 0.4;
        } else if (!state.isEnhanced) {
          setPendingAction("ULTIMATE", char);
          onExecuteCombat("ULTIMATE", char, { interruptUltimate: true });
        }
      }
      return;
    }

    if (state.current !== STATES.PLAYER_TURN || state.isAnimating) return;

    playUIClick(); // Play beep for valid combat hotkeys

    const aliveEnemies = enemies.filter((en) => en.hp > 0);
    const aliveParty = party.filter((hero) => hero.hp > 0);
    const isAllySkillTargeting =
      state.pendingAction === "SKILL" && skillTargetsAlly(party.find((p) => p.id === state.activeUnitId));
    if (aliveEnemies.length === 0 && !isAllySkillTargeting) return;

    // Target selection
    if (key === "a" || key === "d") {
      if (isAllySkillTargeting && aliveParty.length > 0) {
        let currentIndex = aliveParty.findIndex(
          (hero) => hero.id === state.selectedAllyId,
        );
        if (currentIndex === -1) currentIndex = 0;
        if (key === "a") {
          currentIndex = (currentIndex - 1 + aliveParty.length) % aliveParty.length;
        } else {
          currentIndex = (currentIndex + 1) % aliveParty.length;
        }
        state.selectedAllyId = aliveParty[currentIndex].id;
      } else {
        let currentIndex = aliveEnemies.findIndex(
          (en) => en.id === state.selectedTargetId,
        );
        if (currentIndex === -1) currentIndex = 0;
        if (key === "a") {
          currentIndex =
            (currentIndex - 1 + aliveEnemies.length) % aliveEnemies.length;
        } else {
          currentIndex = (currentIndex + 1) % aliveEnemies.length;
        }
        state.selectedTargetId = aliveEnemies[currentIndex].id;
      }
    }

    if (key === "q") {
      const activeChar =
        party.find((p) => p.id === state.activeUnitId) || party[0];
      armOrExecuteAction("ATTACK", activeChar, onExecuteCombat);
    } else if (key === "e") {
      // --- FIXED: Keyboard restriction
      if (state.sp > 0) {
        const activeChar =
          party.find((p) => p.id === state.activeUnitId) || party[0];
        armOrExecuteAction("SKILL", activeChar, onExecuteCombat);
      }
    } else if (key === "w") {
      state.pendingAction = null;
      state.selectedTargetId = null;
      state.selectedAllyId = null;
      mouse.heldAction = null;
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
