import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { EVERY_DAY } from "@/lib/game";
import { createHabit } from "../habits";
import { completeHabit } from "../checkoff";
import { runNightly, runNightlyForAll } from "../nightly";

const db = new PrismaClient();
afterAll(() => db.$disconnect());

// Noon in Chicago on the given local day.
const at = (day: string) => new Date(`${day}T18:00:00Z`);
let userId: string;

beforeEach(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "Milestone", "Building", "Completion", "Settlement", "Habit", "Session", "Account", "User" CASCADE',
  );
  userId = (await db.user.create({ data: { email: "n@example.com", timezone: "America/Chicago" } })).id;
});

const buildings = () => db.building.findMany({ orderBy: { builtOn: "asc" } });

describe("nightly damage job", () => {
  it("charges nothing before the habit existed, and nothing on a fresh day", async () => {
    await createHabit(db, userId, { name: "Project", category: "work", frequency: EVERY_DAY }, at("2026-11-16"));
    const r = await runNightly(db, userId, at("2026-11-16"));
    expect(r.missedDays).toBe(0);
    expect(r.processedThrough).toBe("2026-11-15");
  });

  it("damages the newest building on the 2nd miss, ruins it on the 3rd, and is idempotent", async () => {
    const h = await createHabit(db, userId, { name: "Project", category: "work", frequency: EVERY_DAY }, at("2026-11-16"));
    await completeHabit(db, userId, h.id, at("2026-11-16"));
    await completeHabit(db, userId, h.id, at("2026-11-17"));
    await runNightly(db, userId, at("2026-11-18")); // processes 16th and 17th: both done

    // Miss the 18th and 19th.
    const r = await runNightly(db, userId, at("2026-11-20"));
    expect(r.missedDays).toBe(2);
    let [older, newer] = await buildings();
    expect(older.condition).toBe(100);
    expect(newer.condition).toBe(50);
    expect(newer.status).toBe("decaying");

    // Same day again: nothing changes.
    expect((await runNightly(db, userId, at("2026-11-20"))).missedDays).toBe(0);

    // Miss the 20th too: ruined.
    await runNightly(db, userId, at("2026-11-21"));
    [older, newer] = await buildings();
    expect(newer.status).toBe("ruined");
    expect(older.condition).toBe(100);

    const city = await db.settlement.findFirstOrThrow({ where: { userId, level: "city" } });
    expect([city.healthyCount, city.decayingCount, city.ruinedCount]).toEqual([1, 0, 1]);
    const habit = await db.habit.findUniqueOrThrow({ where: { id: h.id } });
    expect(habit.consecutiveMisses).toBe(3);
  });

  it("judges an any-4-days habit on Sunday night", async () => {
    // Monday 2026-11-16; gym done twice that week, so 2 days short.
    const h = await createHabit(db, userId, { name: "Gym", category: "body", frequency: EVERY_DAY, weeklyTarget: 4 }, at("2026-11-16"));
    await completeHabit(db, userId, h.id, at("2026-11-16"));
    await completeHabit(db, userId, h.id, at("2026-11-18"));
    expect((await runNightly(db, userId, at("2026-11-22"))).missedDays).toBe(0); // Sunday not over yet
    const r = await runNightly(db, userId, at("2026-11-23"));
    expect(r.missedDays).toBe(1);
    const [, newest] = await buildings();
    expect(newest.status).toBe("ruined"); // under 5 a week: 1st miss half, 2nd ruin
  });

  it("runs for every user", async () => {
    await db.user.create({ data: { email: "m@example.com", timezone: "Europe/London" } });
    const results = await runNightlyForAll(db, at("2026-11-20"));
    expect(results).toHaveLength(2);
    expect(results.every((r) => !("error" in r))).toBe(true);
  });
});
