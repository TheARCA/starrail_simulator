import { STATES, state, mouse } from "./state.js";
import { party } from "../data/characters/index.js";
import { enemies } from "../data/enemies/index.js";
import { initInputs } from "../systems/input.js";

// --- UPDATED IMPORTS: Point to the new combat folder ---
import { advanceTimeline, checkWinLossState } from "../combat/timeline.js";
import {
  executeCombatSequence,
  enemyAction,
  processTurnStart,
} from "../combat/combat_manager.js";

// (Keep your EventBus and Mechanics imports here)
import { EventBus } from "./event_bus.js";
import { initMechanics } from "../mechanics/status_manager.js";
import { initBreakSystem } from "../mechanics/break_system.js";
import { initializeSpeedState, resetActionValue } from "../utils/speed.js";

function clearPendingEnemyActionTimer() {
  if (state.pendingEnemyActionTimer) {
    clearTimeout(state.pendingEnemyActionTimer);
    state.pendingEnemyActionTimer = null;
  }
}

// Main loop that controls battle flow and turn progression
function processGameFlow() {
  const status = checkWinLossState();
  if (status !== "CONTINUE") return;

  if (!state.isAnimating) {
    if (state.current !== STATES.PLAYER_TURN) {
      const nextUnit = advanceTimeline();

      if (nextUnit) {
        state.isAnimating = true;

        processTurnStart(nextUnit).then((canAct) => {
          state.isAnimating = false;

          if (!canAct) {
            if (nextUnit.hp > 0 && nextUnit.av <= 0) resetActionValue(nextUnit);
            state.current = null;
            processGameFlow();
          } else {
            // If it's enemy turn, perform enemy action
            if (state.current === STATES.ENEMY_TURN) {
              clearPendingEnemyActionTimer();

              // Small delay before enemy acts (for pacing / interrupt window)
              state.pendingEnemyActionTimer = setTimeout(() => {
                state.pendingEnemyActionTimer = null;
                state.isAnimating = true;
                enemyAction(nextUnit).then(() => {
                  processGameFlow();
                });
              }, 800);
            }
          }
        });
      }
    }
  }
}

// Loads all images required for the current battle before starting
function preloadBattleAssets(partyList, enemyList) {
  const assetsToLoad = [];

  // Collect all party image paths
  partyList.forEach((p) => {
    if (p.img) assetsToLoad.push(p.img);
  });

  // Collect all enemy image paths
  enemyList.forEach((e) => {
    if (e.img) assetsToLoad.push(e.img);
  });

  // Load all assets asynchronously
  return Promise.all(
    assetsToLoad.map((src) => {
      return new Promise((resolve) => {
        const img = new Image();

        if (src.startsWith("http")) {
          img.crossOrigin = "anonymous";
        }

        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.warn(`Battle asset failed to load: ${src}`);
          resolve(null);
        };
      });
    }),
  );
}

// Initializes the engine and binds input handlers
export function initEngine() {
  initMechanics();
  initBreakSystem();

  initInputs(
    () => {
      const loader = document.createElement("div");
      loader.id = "battleLoadingScreen";
      loader.innerHTML = `<div class="loader-text">ENTERING COMBAT...</div>`;
      document.body.appendChild(loader);

      // Ensure loading screen stays visible for at least 2 seconds
      const minimumLoadingTime = new Promise((resolve) =>
        setTimeout(resolve, 2000),
      );

      // Wait for assets AND minimum loading time
      Promise.all([
        preloadBattleAssets(party, enemies),
        minimumLoadingTime,
      ]).then(() => {
        state.pendingAction = null;
        state.activeSkillName = null;
        state.selectedTargetId = null;
        state.selectedAllyId = null;
        state.activeUnitId = null;
        state.extraTurnUnitId = null;
        state.followUpQueue = [];
        state.isEnhanced = false;
        clearPendingEnemyActionTimer();
        mouse.heldAction = null;
        mouse.holdStart = 0;

        party.forEach((p) => {
          initializeSpeedState(p);
          resetActionValue(p);
        });
        enemies.forEach((e) => {
          initializeSpeedState(e);
          resetActionValue(e);
        });

        EventBus.emit("onBattleStart", { party, enemies });

        processGameFlow();

        // Small delay to ensure first frame renders before removing loader
        setTimeout(() => {
          loader.style.opacity = "0";

          // Remove loader after fade-out transition
          setTimeout(() => {
            loader.remove();
          }, 300);
        }, 200);
      });
    },

    // Called when player performs an action
    (actionName, attackerData, options = {}) => {
      const isInterruptUltimate =
        options.interruptUltimate &&
        actionName === "ULTIMATE" &&
        (state.current !== STATES.PLAYER_TURN ||
          attackerData.id !== state.activeUnitId);
      const isResolvingExtraTurnAction =
        state.extraTurnUnitId === attackerData.id && actionName !== "ULTIMATE";

      if (options.interruptUltimate) {
        clearPendingEnemyActionTimer();
      }

      executeCombatSequence(actionName, attackerData).then(() => {
        if (checkWinLossState() !== "CONTINUE") {
          state.extraTurnUnitId = null;
          return;
        }

        if (isInterruptUltimate) {
          state.current = STATES.PLAYER_TURN;
          state.activeUnitId = attackerData.id;
          state.extraTurnUnitId = attackerData.id;
          state.pendingAction = null;
          state.selectedTargetId = null;
          state.selectedAllyId = attackerData.id;
          return;
        }

        if (isResolvingExtraTurnAction) {
          state.extraTurnUnitId = null;
        }

        // Reset turn and continue flow
        state.current = null;
        processGameFlow();
      });
    },
  );
}
