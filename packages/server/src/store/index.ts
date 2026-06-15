import { createMemoryStore } from "./memory.ts";
import { createPostgresStore } from "./postgres.ts";
import type { Store } from "./types.ts";

export async function createStore(databaseUrl?: string): Promise<Store> {
  if (databaseUrl) {
    return createPostgresStore(databaseUrl);
  }
  console.warn("DATABASE_URL is not set; using in-memory state for this process.");
  return createMemoryStore();
}

export type { Store } from "./types.ts";
