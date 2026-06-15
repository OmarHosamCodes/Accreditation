import { freshDB, normalizeState } from "@accreditation/shared";
import type { AppState } from "@accreditation/shared";
import type { Store } from "./types.ts";

export function createMemoryStore(): Store {
  let state = freshDB();
  let queue = Promise.resolve();

  return {
    async get() {
      return structuredClone(normalizeState(state));
    },
    async set(nextState) {
      state = structuredClone(normalizeState(nextState));
    },
    async mutate(mutator) {
      const task = queue.then(async () => {
        const working = structuredClone(normalizeState(state));
        const result = mutator(working);
        state = structuredClone(normalizeState(result || working));
        return structuredClone(state);
      });
      queue = task.then(() => undefined, () => undefined);
      return task;
    },
  };
}
