import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { EVERY_DAY, PROMOTION_THRESHOLD } from "@/lib/game";
import { toDbDate } from "@/lib/day";
import { createHabit, listHabits, setArchived, updateHabit } from "../habits";
import { completeHabit, uncompleteHabit } from "../checkoff";
import { getToday } from "../today";

const db = new PrismaClient();
afterAll(() => db.$disconnect());

// 2026-11-16 03:00Z is still the 15th in New York.
const now = new Date("2026-11-16T03:00:00Z");
let userId: string;

beforeEach(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "Milestone", "Building", "Completion", "Settlement", "Habit", "Session", "Account", "User" CASCADE',
  );
  userId = (await db.user.create({ data: { email: "t@example.com", timezone: "America/New_York" } })).id;
});

const newHabit = (over = {}) =>
  createHabit(db, userId, { name: "Run", category: "body", frequency: EVERY_DAY, ...over }, now);

describe("habits", () => {
  it("creates on the user's local day and validates input", async () => {
    const h = await newHabit();
    expect(h.createdOn.toISOString().slice(0, 10)).toBe("2026-11-15");
    await expect(newHabit({ name: "  " })).rejects.toThrow();
    await expect(newHabit({ frequency: 0 })).rejects.toThrow();
  });

  it("supports several habits, editing and archiving", async () => {
    const a = await newHabit();
    await newHabit({ name: "Read", category: "mind", frequency: 0b0101010 });
    await updateHabit(db, userId, a.id, { name: "Run 5k", category: "body", frequency: 0b0111110 });
    await setArchived(db, userId, a.id, true, now);
    expect((await listHabits(db, userId)).map((h) => h.name)).toEqual(["Read"]);
    expect((await listHabits(db, userId, { archived: true })).map((h) => h.name)).toEqual(["Run 5k"]);
  });

  it("will not touch another user's habit", async () => {
    const other = await db.user.create({ data: { email: "o@example.com" } });
    const h = await newHabit();
    await expect(updateHabit(db, other.id, h.id, { name: "x", category: "body", frequency: 1 })).rejects.toThrow();
    await expect(completeHabit(db, other.id, h.id, now)).rejects.toThrow();
  });
});

describe("check-off", () => {
  it("founds the first city and places a building", async () => {
    const h = await newHabit();
    const r = await completeHabit(db, userId, h.id, now);
    expect(r).toMatchObject({ ok: true, built: [{ type: "gym", tier: 1, milestone: null }], streak: 1, settlement: "Aurelia" });
    const city = await db.settlement.findFirstOrThrow({ where: { userId, isActive: true } });
    expect(city.buildingCount).toBe(1);
    expect((await db.completion.findFirstOrThrow()).completedOn.toISOString().slice(0, 10)).toBe("2026-11-15");
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).totalCompletions).toBe(1);
  });

  it("rejects a second check-off the same day", async () => {
    const h = await newHabit();
    await completeHabit(db, userId, h.id, now);
    expect(await completeHabit(db, userId, h.id, now)).toEqual({ ok: false, reason: "already_done" });
    expect(await db.building.count()).toBe(1);
  });

  it("handles a double click racing itself", async () => {
    const h = await newHabit();
    const results = await Promise.allSettled([completeHabit(db, userId, h.id, now), completeHabit(db, userId, h.id, now)]);
    expect(await db.completion.count()).toBe(1);
    expect(await db.building.count()).toBe(1);
    expect(results.some((r) => r.status === "fulfilled" && r.value.ok)).toBe(true);
  });

  it("un-ticking removes the building and undoes the count", async () => {
    const h = await newHabit();
    await completeHabit(db, userId, h.id, now);
    expect(await uncompleteHabit(db, userId, h.id, now)).toEqual({ ok: true });
    expect(await db.building.count()).toBe(0);
    expect((await db.settlement.findFirstOrThrow()).buildingCount).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).totalCompletions).toBe(0);
  });

  it("awards a park on day 7, and un-ticking takes it back", async () => {
    const h = await newHabit();
    await db.habit.update({ where: { id: h.id }, data: { createdOn: toDbDate("2026-11-01") } });
    for (let d = 9; d <= 14; d++) await db.completion.create({ data: { habitId: h.id, completedOn: toDbDate(`2026-11-${String(d).padStart(2, "0")}`) } });
    const r = await completeHabit(db, userId, h.id, now);
    expect(r.ok && r.built.map((b) => b.type)).toEqual(["gym", "park"]);
    expect(await db.milestone.count()).toBe(1);
    await uncompleteHabit(db, userId, h.id, now);
    expect(await db.milestone.count()).toBe(0);
    expect(await db.building.count()).toBe(0);
  });

  it("repairs damaged buildings after a clean 7 days and updates aggregates", async () => {
    const h = await newHabit();
    await db.habit.update({
      where: { id: h.id },
      data: { createdOn: toDbDate("2026-11-01"), lastMissedOn: toDbDate("2026-11-08") },
    });
    await completeHabit(db, userId, h.id, new Date("2026-11-08T03:00:00Z")); // builds on the 7th
    const b = await db.building.findFirstOrThrow();
    await db.building.update({ where: { id: b.id }, data: { condition: 0, status: "ruined" } });
    for (let d = 9; d <= 14; d++) await db.completion.create({ data: { habitId: h.id, completedOn: toDbDate(`2026-11-${String(d).padStart(2, "0")}`) } });
    const r = await completeHabit(db, userId, h.id, now);
    expect(r.ok && r.repaired).toBe(1);
    expect((await db.building.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("healthy");
    expect((await db.settlement.findFirstOrThrow()).ruinedCount).toBe(0);
  });

  it("promotes a full city into a state and founds a new city", async () => {
    const h = await newHabit();
    await db.habit.update({ where: { id: h.id }, data: { createdOn: toDbDate("2026-11-01") } });
    const city = (await completeHabit(db, userId, h.id, new Date("2026-11-10T12:00:00Z"))).ok
      ? await db.settlement.findFirstOrThrow()
      : null;
    // Fill the city to one short of full.
    const rows = [];
    for (let i = 0; rows.length < PROMOTION_THRESHOLD.city - 2; i++) {
      const x = i % 24, y = Math.floor(i / 24);
      if (x === 11 && y === 11) continue;
      rows.push({ settlementId: city!.id, gridX: x, gridY: y, type: "gym", builtOn: toDbDate("2026-11-10"), lastMaintainedOn: toDbDate("2026-11-10") });
    }
    await db.building.createMany({ data: rows });
    await db.settlement.update({ where: { id: city!.id }, data: { buildingCount: PROMOTION_THRESHOLD.city - 1 } });

    const r = await completeHabit(db, userId, h.id, now);
    expect(r).toMatchObject({ ok: true, settlement: "Aurelia", foundedCity: "Brightwater" });
    const all = await db.settlement.findMany({ orderBy: { name: "asc" } });
    const state = all.find((s) => s.level === "state")!;
    expect(all.map((s) => [s.name, s.level, s.isActive, s.parentId === state.id])).toEqual([
      ["Aurelia", "city", false, true],
      ["Brightwater", "city", true, true],
      ["Verdant Reach", "state", false, false],
    ]);
    expect(state).toMatchObject({ childCount: 2, buildingCount: PROMOTION_THRESHOLD.city });
  });
});

describe("any N days a week habits", () => {
  it("is stored with every weekday open and a target", async () => {
    const h = await newHabit({ name: "Gym", frequency: 0, weeklyTarget: 4 });
    expect(h).toMatchObject({ weeklyTarget: 4, frequency: EVERY_DAY });
    await expect(newHabit({ weeklyTarget: 7 })).rejects.toThrow();
    await expect(newHabit({ weeklyTarget: 0, frequency: 0 })).rejects.toThrow();
  });

  it("can be switched between fixed days and a weekly target", async () => {
    const h = await newHabit({ weeklyTarget: 3 });
    const fixed = await updateHabit(db, userId, h.id, { name: "Run", category: "body", frequency: 0b0101010 });
    expect(fixed).toMatchObject({ weeklyTarget: null, frequency: 0b0101010 });
  });

  it("builds on any day and shows progress for the week", async () => {
    const h = await newHabit({ name: "Gym", weeklyTarget: 4 });
    const r = await completeHabit(db, userId, h.id, now);
    expect(r).toMatchObject({ ok: true, streak: 1 });
    const t = await getToday(db, userId, now);
    expect(t.habits[0]).toMatchObject({ weeklyTarget: 4, weekDone: 1, scheduledToday: true, doneToday: true, streak: 1 });
  });
});

describe("today view", () => {
  it("shows scheduled habits, done state and streak in the user's day", async () => {
    const h = await newHabit();
    await newHabit({ name: "Gym Mondays", frequency: 0b0000010 });
    await completeHabit(db, userId, h.id, now);
    const t = await getToday(db, userId, now);
    expect(t.today).toBe("2026-11-15"); // a Sunday in New York
    expect(t.habits.map((x) => [x.name, x.scheduledToday, x.doneToday, x.streak])).toEqual([
      ["Run", true, true, 1],
      ["Gym Mondays", false, false, 0],
    ]);
    expect(t.city).toMatchObject({ name: "Aurelia", buildingCount: 1 });
  });
});
