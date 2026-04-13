import { STATES, state } from "./state.js";
import { party } from "../data/hero_db.js";
import { enemies } from "../data/enemy_db.js";
import { initInputs } from "../systems/input.js";
import { advanceTimeline, checkWinLossState } from "../systems/timeline.js";
import {
  executeCombatSequence,
  enemyAction,
  processTurnStart,
} from "../systems/combat.js";

// Main loop that controls battle flow and turn progression
function processGameFlow() {
  const status = checkWinLossState();

  // Stop processing if game already ended
  if (status !== "CONTINUE") return;

  // Only proceed if no animation is currently playing
  if (!state.isAnimating) {
    // Only advance timeline if it's not player's turn
    if (state.current !== STATES.PLAYER_TURN) {
      const nextUnit = advanceTimeline();

      // If a unit is ready to act
      if (nextUnit) {
        state.isAnimating = true;

        // Handle effects that occur at the start of a unit's turn
        processTurnStart(nextUnit).then((canAct) => {
          state.isAnimating = false;

          // If unit cannot act (stunned, dead, etc.)
          if (!canAct) {
            // Reset action value if still alive and ready
            if (nextUnit.hp > 0 && nextUnit.av <= 0) {
              nextUnit.av = 10000 / (nextUnit.spd || 100);
            }

            // Clear turn and continue flow
            state.current = null;
            processGameFlow();
          } else {
            // If it's enemy turn, perform enemy action
            if (state.current === STATES.ENEMY_TURN) {
              state.isAnimating = true;

              // Small delay before enemy acts (for pacing)
              setTimeout(() => {
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
  initInputs(
    // Called when "Start Battle" is triggered
    () => {
      // Create loading screen overlay
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
        // Initialize action values for all units
        party.forEach((p) => (p.av = 10000 / (p.spd || 100)));
        enemies.forEach((e) => (e.av = 10000 / (e.spd || 100)));

        // Set default target to first enemy
        state.selectedTargetId = enemies[0].id;

        // Start battle loop (renders first frame in background)
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
    (actionName, attackerData) => {
      executeCombatSequence(actionName, attackerData).then(() => {
        // Reset turn and continue flow
        state.current = null;
        processGameFlow();
      });
    },
  );
}
