import postgres from "postgres";
import { freshDB, normalizeState } from "@accreditation/shared";
import type { AppState } from "@accreditation/shared";
import type { Store } from "./types.ts";

export async function createPostgresStore(databaseUrl: string): Promise<Store> {
  const sql = postgres(databaseUrl, { max: 4 });
  await sql`
    create table if not exists app_state (
      id integer primary key check (id = 1),
      data jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;

  const existing = await sql<Array<{ count: string }>>`select count(*)::text as count from app_state where id = 1`;
  if (existing[0]?.count !== "1") {
    await sql`insert into app_state (id, data) values (1, ${sql.json(freshDB())})`;
  }

  let queue = Promise.resolve();

  return {
    async get() {
      const rows = await sql<Array<{ data: AppState }>>`select data from app_state where id = 1`;
      return normalizeState(rows[0]?.data || freshDB());
    },
    async set(state) {
      normalizeState(state);
      await sql`
        insert into app_state (id, data, updated_at)
        values (1, ${sql.json(state)}, now())
        on conflict (id) do update set data = excluded.data, updated_at = now()
      `;
    },
    async mutate(mutator) {
      const task = queue.then(async () => {
        const rows = await sql<Array<{ data: AppState }>>`select data from app_state where id = 1`;
        const working = normalizeState(rows[0]?.data || freshDB());
        const result = mutator(working);
        const nextState = normalizeState(result || working);
        await sql`
          update app_state
          set data = ${sql.json(nextState)}, updated_at = now()
          where id = 1
        `;
        return nextState;
      });
      queue = task.then(() => undefined, () => undefined);
      return task;
    },
  };
}
