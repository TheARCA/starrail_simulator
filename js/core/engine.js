import { STATES, state } from "./state.js";
import { party } from "../data/hero_db.js";
import { enemies } from "../data/enemy_db.js";
import { initInputs } from "../systems/input.js";
import { advanceTimeline, checkWinLossState } from "../systems/timeline.js";
import { executeCombatSequence, enemyAction } from "../systems/combat.js";

function processGameFlow() {
  const status = checkWinLossState();
  if (status !== "CONTINUE") return;

  if (!state.isAnimating) {
    const nextUnit = advanceTimeline();

    if (state.current === STATES.ENEMY_TURN && nextUnit) {
      state.isAnimating = true;

      setTimeout(() => {
        enemyAction(nextUnit).then(() => {
          processGameFlow();
        });
      }, 800);
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
        processGameFlow();
      });
    },
  );
}
