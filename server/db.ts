import ws from "ws";
import { Pool as PgPool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isLocalConnection = (() => {
  try {
    const { hostname, protocol } = new URL(databaseUrl);
    if (process.env.DATABASE_DRIVER === "pg") {
      return true;
    }
    return (
      protocol.startsWith("postgres") &&
      (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1")
    );
  } catch {
    return false;
  }
})();

let pool: PgPool | NeonPool;
let db: ReturnType<typeof drizzlePg> | ReturnType<typeof drizzleNeon>;

if (isLocalConnection) {
  const localPool = new PgPool({ connectionString: databaseUrl });
  pool = localPool;
  db = drizzlePg(localPool, { schema });
} else {
  neonConfig.webSocketConstructor = ws;

  const neonPool = new NeonPool({ connectionString: databaseUrl });
  pool = neonPool;
  db = drizzleNeon(neonPool, { schema });
}

export { pool, db };
