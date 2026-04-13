import { STATES, state } from "./state.js";
import { party } from "../data/hero_db.js";
import { enemies } from "../data/enemy_db.js";
import { initInputs } from "../systems/input.js";
import { advanceTimeline, checkWinLossState } from "../systems/timeline.js";
import {
  executeCombatSequence,
  enemyAction,
  processTurnStart,
} from "../systems/combat.js"; // <--- NEW IMPORT

// --- THE CENTRAL GAME LOOP COORDINATOR ---
function processGameFlow() {
  const status = checkWinLossState();
  if (status !== "CONTINUE") return;

  if (!state.isAnimating) {
    // Only fetch the next unit if we aren't currently waiting for player input
    if (state.current !== STATES.PLAYER_TURN) {
      const nextUnit = advanceTimeline();

      if (nextUnit) {
        state.isAnimating = true;

        // --- NEW: Intercept turn start to process DoTs and Freeze ---
        processTurnStart(nextUnit).then((canAct) => {
          state.isAnimating = false;

          if (!canAct) {
            // Turn was skipped (Freeze or Death). Reset state to force the timeline to keep moving.
            if (nextUnit.hp > 0 && nextUnit.av <= 0)
              nextUnit.av = 10000 / (nextUnit.spd || 100);
            state.current = null;
            processGameFlow();
          } else {
            // Unit survived! Let them act.
            if (state.current === STATES.ENEMY_TURN) {
              state.isAnimating = true;
              setTimeout(() => {
                enemyAction(nextUnit).then(() => {
                  processGameFlow();
                });
              }, 800);
            }
            // If it's the PLAYER_TURN, the engine gracefully stops here and waits for your button clicks!
          }
        });
      }
    }
  }
}

export function initEngine() {
  initInputs(
    () => {
      party.forEach((p) => (p.av = 10000 / (p.spd || 100)));
      enemies.forEach((e) => (e.av = 10000 / (e.spd || 100)));
      state.selectedTargetId = enemies[0].id;
      processGameFlow();
    },
    (actionName, attackerData) => {
      executeCombatSequence(actionName, attackerData).then(() => {
        state.current = null;
        processGameFlow();
      });
    },
  );
}
