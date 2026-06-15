import type { AppState } from "@accreditation/shared";

export type Store = {
  get(): Promise<AppState>;
  set(state: AppState): Promise<void>;
  mutate(mutator: (state: AppState) => void | AppState): Promise<AppState>;
};
