import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";

export async function GET() {
  const startedAt = Date.now();

  try {
    await withDatabaseRetry((db) => db.$queryRaw`SELECT 1`);

    return Response.json({
      ok: true,
      latencyMs: Date.now() - startedAt,
      message: "Database reachable",
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json(
        {
          ok: false,
          latencyMs: Date.now() - startedAt,
          message: "Database unreachable",
        },
        { status: 503 },
      );
    }

    return Response.json(
      {
        ok: false,
        latencyMs: Date.now() - startedAt,
        message: "Unexpected database error",
      },
      { status: 500 },
    );
  }
}