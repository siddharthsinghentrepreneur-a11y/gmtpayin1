import "dotenv/config";

import fs from "node:fs";
import { Client } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
    ssl: {
      ca: fs.readFileSync("aws-rds-global-bundle.pem", "utf8"),
      rejectUnauthorized: true,
    },
  });

  const startedAt = Date.now();

  try {
    await client.connect();
    await client.query("select 1");

    console.log(
      JSON.stringify(
        {
          ok: true,
          latencyMs: Date.now() - startedAt,
          message: "Database reachable",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";

    console.error(
      JSON.stringify(
        {
          ok: false,
          latencyMs: Date.now() - startedAt,
          message,
        },
        null,
        2,
      ),
    );

    process.exit(1);
  } finally {
    await client.end().catch(() => undefined);
  }
}

void main();