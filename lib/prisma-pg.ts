import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

function getPoolConfig(connectionString: string): PoolConfig {
  const databaseUrl = new URL(connectionString);
  const poolConfig: PoolConfig = {
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 5432),
    database: databaseUrl.pathname.replace(/^\//, ""),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 5,
  };

  if (databaseUrl.hostname.includes("amazonaws.com")) {
    const sslRootCertPath = path.resolve(process.cwd(), "aws-rds-global-bundle.pem");

    poolConfig.ssl = {
      ca: fs.readFileSync(sslRootCertPath, "utf8"),
      rejectUnauthorized: true,
    };
  }

  return poolConfig;
}

export function createPrismaPgAdapter(connectionString: string) {
  return new PrismaPg(new Pool(getPoolConfig(connectionString)));
}