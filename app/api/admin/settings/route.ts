import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";
import { type NextRequest } from "next/server";

// GET /api/admin/settings?key=xxx — get a setting value
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");

    if (key) {
      const setting = await withDatabaseRetry((db) =>
        db.siteSetting.findUnique({ where: { key } }),
      );
      return Response.json({ key, value: setting?.value ?? null });
    }

    // Return all settings
    const settings = await withDatabaseRetry((db) =>
      db.siteSetting.findMany(),
    );
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return Response.json(map);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unavailable" }, { status: 503 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/settings — upsert a setting { key, value }
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { key?: string; value?: string };

    if (!body.key || typeof body.value !== "string") {
      return Response.json({ error: "key and value are required" }, { status: 400 });
    }

    const setting = await withDatabaseRetry((db) =>
      db.siteSetting.upsert({
        where: { key: body.key! },
        update: { value: body.value! },
        create: { key: body.key!, value: body.value! },
      }),
    );

    return Response.json(setting);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unavailable" }, { status: 503 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
