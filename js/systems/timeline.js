import { STATES, state } from "../core/state.js";
import { party } from "../data/hero_db.js";
import { enemies } from "../data/enemy_db.js";

export function advanceTimeline() {
  const aliveEnemies = enemies.filter((e) => e.hp > 0);
  const aliveParty = party.filter((p) => p.hp > 0);
  const allUnits = [...aliveParty, ...aliveEnemies];

  if (allUnits.length === 0) return null;

  // Sort by lowest Action Value
  allUnits.sort((a, b) => a.av - b.av);

  const nextUnit = allUnits[0];
  const timeToPass = nextUnit.av;

  // Subtract elapsed time from everyone's AV
  allUnits.forEach((u) => {
    u.av = Math.max(0, u.av - timeToPass);
  });

  state.activeUnitId = nextUnit.id;

  // Set game state based on who reached 0 AV
  if (aliveParty.some((p) => p.id === nextUnit.id)) {
    state.current = STATES.PLAYER_TURN;
  } else {
    state.current = STATES.ENEMY_TURN;
  }
  return nextUnit;
}

export function checkWinLossState() {
  const aliveEnemies = enemies.filter((e) => e.hp > 0);
  const aliveParty = party.filter((p) => p.hp > 0);

  // Auto-target correction if the current target dies
  if (state.selectedTargetId) {
    const targetStillAlive = aliveEnemies.find(
      (e) => e.id === state.selectedTargetId,
    );
    if (!targetStillAlive && aliveEnemies.length > 0)
      state.selectedTargetId = aliveEnemies[0].id;
  }

  if (aliveEnemies.length === 0) {
    state.current = STATES.GAME_OVER;
    return "VICTORY";
  } else if (aliveParty.length === 0) {
    state.current = STATES.GAME_OVER;
    return "DEFEAT";
  }
  return "CONTINUE";
}
