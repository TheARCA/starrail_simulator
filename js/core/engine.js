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

// --- THE CENTRAL GAME LOOP COORDINATOR ---
function processGameFlow() {
  // ... (Your existing processGameFlow code remains exactly the same) ...
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
            if (nextUnit.hp > 0 && nextUnit.av <= 0)
              nextUnit.av = 10000 / (nextUnit.spd || 100);
            state.current = null;
            processGameFlow();
          } else {
            if (state.current === STATES.ENEMY_TURN) {
              state.isAnimating = true;
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

// --- NEW: Dynamic Asset Loader for Battles ---
function preloadBattleAssets(partyList, enemyList) {
  const assetsToLoad = [];
  const CARD_SIZE = 64; // Adjust to match your constants

  // Extract image paths from the current party and enemy database objects
  // Change '.img' to match your actual database property names if different
  partyList.forEach((p) => {
    if (p.img) assetsToLoad.push(p.img);
  });
  enemyList.forEach((e) => {
    if (e.img) assetsToLoad.push(e.img);
  });

  // Guarantee the placeholder data cards are re-cached
  assetsToLoad.push(
    `https://placehold.co/${CARD_SIZE}x${CARD_SIZE}/47443b/d7cfb8/png?text=DATA`,
  );

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
          resolve(null); // Resolve anyway so the battle doesn't soft-lock
        };
      });
    }),
  );
}

export function initEngine() {
  initInputs(
    // Triggered when "Start Battle" is clicked/invoked
    () => {
      // 1. Generate and attach the loading screen dynamically
      const loader = document.createElement("div");
      loader.id = "battleLoadingScreen";
      loader.innerHTML = `<div class="loader-text">ENTERING COMBAT...</div>`;
      document.body.appendChild(loader);

      // 2. Create a forced minimum delay (2000 milliseconds = 2 seconds)
      const minimumLoadingTime = new Promise((resolve) =>
        setTimeout(resolve, 2000),
      );

      // 3. Wait for BOTH the assets to load AND the 2 seconds to pass
      Promise.all([
        preloadBattleAssets(party, enemies),
        minimumLoadingTime,
      ]).then(() => {
        // 4. Fade out the screen
        loader.style.opacity = "0";
        setTimeout(() => {
          loader.remove(); // Cleanup the DOM

          // 5. Initialize action values and start the engine
          party.forEach((p) => (p.av = 10000 / (p.spd || 100)));
          enemies.forEach((e) => (e.av = 10000 / (e.spd || 100)));
          state.selectedTargetId = enemies[0].id;
          processGameFlow();
        }, 300); // 300ms matches the CSS transition time
      });
    },
    (actionName, attackerData) => {
      executeCombatSequence(actionName, attackerData).then(() => {
        state.current = null;
        processGameFlow();
      });
    },
  );
}
