import { state } from "../core/state.js";
import { party } from "../data/characters/index.js";
import {
  executeTalentFollowUp,
  queueReactiveTalentFollowUps,
} from "./talent_registry.js";

export function queueReactiveFollowUps({ attacker, defender, shieldSourceId }) {
  if (!attacker || !defender || !shieldSourceId) return;

  const sourceUnit = party.find((unit) => unit.id === shieldSourceId && unit.hp > 0);
  if (!sourceUnit) return;

  state.followUpQueue = state.followUpQueue || [];
  queueReactiveTalentFollowUps({
    sourceUnit,
    attacker,
    defender,
    queue: state.followUpQueue,
  });
}

export async function resolveQueuedFollowUps() {
  if (!state.followUpQueue || state.followUpQueue.length === 0) return;

  while (state.followUpQueue.length > 0) {
    const followUp = state.followUpQueue.shift();
    await executeTalentFollowUp(followUp);
  }
}
