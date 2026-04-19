/**
 * Deterministic dummy ranking data generator.
 *
 * - Uses the current date as a seed so data refreshes every 24 hours.
 * - Throughout the day, deposit amounts gradually increase to look realistic.
 * - Returns top 100 users with masked UIDs.
 */

// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return y * 10000 + m * 100 + d;
}

function generateUid(rng: () => number, excludeUids: Set<string>): string {
  // Generate 5-digit numeric UIDs (10000–99999) like real users
  for (let attempt = 0; attempt < 20; attempt++) {
    const uid = String(Math.floor(rng() * 90000 + 10000)); // 10000–99999
    if (!excludeUids.has(uid)) {
      excludeUids.add(uid); // prevent duplicates within dummy set too
      return uid;
    }
  }
  // Fallback: 6-digit to guarantee no collision
  return String(Math.floor(rng() * 900000 + 100000));
}

type DummyEntry = {
  rank: number;
  id: string;
  uid: string;
  amount: number;
};

export function generateDummyRanking(
  period: "today" | "yesterday",
  realUserUids: string[] = [],
): DummyEntry[] {
  const excludeUids = new Set(realUserUids);
  const now = new Date();
  const targetDate = new Date(now);

  if (period === "yesterday") {
    targetDate.setDate(targetDate.getDate() - 1);
  }

  const seed = dateSeed(targetDate);
  const rng = mulberry32(seed);

  // Calculate how far into the day we are (0.0 – 1.0)
  // For yesterday, treat as fully elapsed (1.0)
  let dayProgress: number;
  if (period === "yesterday") {
    dayProgress = 1.0;
  } else {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const elapsedMs = now.getTime() - startOfDay.getTime();
    dayProgress = Math.min(elapsedMs / (24 * 60 * 60 * 1000), 1.0);
  }

  const COUNT = 100;
  const entries: DummyEntry[] = [];

  for (let i = 0; i < COUNT; i++) {
    const uid = generateUid(rng, excludeUids);
    const id = `dummy_${seed}_${i}`;

    // Base amount range: top users get larger deposits
    // Rank 1: ~80K-200K base, Rank 100: ~500-5000 base
    const rankFactor = 1 - i / COUNT; // 1.0 for #1, ~0 for #100
    const baseMin = 500 + rankFactor * 80000;
    const baseMax = 5000 + rankFactor * 195000;
    const finalBase = baseMin + rng() * (baseMax - baseMin);

    // Throughout the day, amount increases from ~30% of final to 100%
    const startFraction = 0.25 + rng() * 0.15; // Each user starts between 25-40% of final
    const currentAmount = finalBase * (startFraction + (1 - startFraction) * dayProgress);

    // Add small per-user jitter so amounts aren't perfectly smooth
    const jitter = 1 + (rng() - 0.5) * 0.08;
    const raw = currentAmount * jitter;

    // Round to a multiple that varies by amount size
    const step =
      raw >= 100000 ? 10000
      : raw >= 50000 ? 5000
      : raw >= 20000 ? 1000
      : raw >= 5000 ? 500
      : 100;

    entries.push({
      rank: 0,
      id,
      uid,
      amount: Math.round(raw / step) * step,
    });
  }

  // Sort by amount descending and assign ranks
  entries.sort((a, b) => b.amount - a.amount);
  for (let i = 0; i < entries.length; i++) {
    entries[i].rank = i + 1;
  }

  return entries;
}
