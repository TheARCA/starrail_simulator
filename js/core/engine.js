import { STATES, state } from "./state.js";
import { party } from "../data/hero_db.js";
import { enemies } from "../data/enemy_db.js";
import { initInputs } from "../systems/input.js";
import { advanceTimeline, checkWinLossState } from "../systems/timeline.js";
import { executeCombatSequence, enemyAction } from "../systems/combat.js";

// --- THE CENTRAL GAME LOOP COORDINATOR ---
function processGameFlow() {
  const status = checkWinLossState();
  if (status !== "CONTINUE") return; // Game over (Victory or Defeat)

  // If no one is acting, advance time on the timeline
  if (!state.isAnimating && state.current !== STATES.PLAYER_TURN) {
    const nextUnit = advanceTimeline();

    if (state.current === STATES.ENEMY_TURN && nextUnit) {
      // It's the enemy's turn. Let the engine pause slightly, then tell combat.js to act
      setTimeout(() => {
        enemyAction(nextUnit).then(() => {
          processGameFlow(); // Loop back after the attack finishes!
        });
      }, 800);
    }
  }
}

export function initEngine() {
  initInputs(
    // Input Callback 1: User clicked "INITIALIZE COMBAT"
    () => {
      party.forEach((p) => (p.av = 10000 / (p.spd || 100)));
      enemies.forEach((e) => (e.av = 10000 / (e.spd || 100)));
      state.selectedTargetId = enemies[0].id;
      processGameFlow(); // Kick off the main loop!
    },
    // Input Callback 2: User successfully issued a Combat Command
    (actionName, attackerData) => {
      executeCombatSequence(actionName, attackerData).then(() => {
        processGameFlow(); // Resume the main loop after the player acts!
      });
    },
  );
}
