import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";

// GET /api/admin/banners — fetch all banners (public-safe, used by dashboard too)
export async function GET() {
  try {
    const banners = await withDatabaseRetry((db) =>
      db.banner.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, imageUrl: true, sortOrder: true },
      }),
    );

    return Response.json({ banners });
  } catch (err) {
    if (isDatabaseUnavailableError(err)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    return Response.json({ error: "Failed to fetch banners" }, { status: 500 });
  }
}

// POST /api/admin/banners — bulk replace all banners
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const slides = body.banners;

    if (!Array.isArray(slides)) {
      return Response.json({ error: "banners must be an array" }, { status: 400 });
    }

    // Validate each slide
    for (const slide of slides) {
      if (!slide || typeof slide.imageUrl !== "string" || !slide.imageUrl) {
        return Response.json(
          { error: "Each banner must have a non-empty imageUrl" },
          { status: 400 },
        );
      }
    }

    // Delete all existing banners and insert new ones in a transaction
    const banners = await withDatabaseRetry(async (db) => {
      await db.banner.deleteMany({});

      const created = await Promise.all(
        slides.map((slide: { imageUrl: string; name?: string }, index: number) =>
          db.banner.create({
            data: {
              imageUrl: slide.imageUrl,
              sortOrder: index,
              active: true,
            },
            select: { id: true, imageUrl: true, sortOrder: true },
          }),
        ),
      );

      return created;
    });

    return Response.json({ banners });
  } catch (err) {
    if (isDatabaseUnavailableError(err)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    console.error("Banner save error:", err);
    return Response.json({ error: "Failed to save banners" }, { status: 500 });
  }
}
