import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Satu koneksi per proses (dev hot-reload membuat modul ulang; simpan di globalThis supaya pool tidak bocor).
const g = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
// prepare:false wajib untuk pooler Supabase mode transaction (:6543).
const client = g.pg ?? postgres(process.env.DATABASE_URL!, { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") g.pg = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
