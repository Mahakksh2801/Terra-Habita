/**
 * Demo data: a user with three habits, a state of five cities (one growing),
 * including damaged and ruined buildings. Never touches real accounts.
 *   npm run db:seed
 */
import { PrismaClient, type BuildingStatus } from "@prisma/client";
import { CITY_GRID_SIZE, buildingTypeFor, heightTierFor, settlementName, spiralOrder, type HabitCategory } from "../src/lib/game";

const prisma = new PrismaClient();
const DEMO_EMAIL = "demo@terra-habita.test";
const day = (offset: number) => new Date(Date.UTC(2026, 0, 1 + offset));

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_SEED_IN_PRODUCTION) throw new Error("Refusing to seed production");
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, name: "Demo", timezone: "America/Chicago", timezoneConfirmed: true, totalCompletions: 1010 },
  });
  const cats: [string, HabitCategory][] = [["Going to gym", "body"], ["Doing project for an hour", "work"], ["Reading", "mind"]];
  const habits = [];
  for (const [name, category] of cats) {
    habits.push(await prisma.habit.create({ data: { userId: user.id, name, category, frequency: 127, createdOn: day(0) } }));
  }

  const state = await prisma.settlement.create({
    data: { userId: user.id, level: "state", name: settlementName("state", 0), foundedOn: day(0) },
  });
  const tiles = spiralOrder(31);
  const grid = spiralOrder(CITY_GRID_SIZE);
  const sizes = [500, 500, 320, 180, 40];
  let seq = 0;
  for (let c = 0; c < sizes.length; c++) {
    const n = sizes[c];
    const city = await prisma.settlement.create({
      data: {
        userId: user.id, level: "city", name: settlementName("city", c), parentId: state.id, foundedOn: day(c * 100),
        isActive: c === sizes.length - 1, tileX: tiles[c].x, tileY: tiles[c].y, gridSize: CITY_GRID_SIZE,
      },
    });
    let healthy = 0, decaying = 0, ruined = 0;
    const rows = [];
    for (let i = 0; i < n; i++) {
      const status: BuildingStatus = c === 0 && i % 37 === 36 ? "ruined" : c === 0 && i % 23 === 22 ? "decaying" : "healthy";
      if (status === "healthy") healthy++; else if (status === "decaying") decaying++; else ruined++;
      const habit = habits[i % habits.length];
      rows.push({
        settlementId: city.id, habitId: habit.id, gridX: grid[i].x, gridY: grid[i].y,
        type: buildingTypeFor(habit.category as HabitCategory), tier: heightTierFor(seq * 2 + i),
        builtOn: day(c * 100 + (i % 90)), lastMaintainedOn: day(c * 100 + (i % 90)),
        condition: status === "healthy" ? 100 : status === "decaying" ? 50 : 0, status,
      });
    }
    seq += n;
    await prisma.building.createMany({ data: rows });
    await prisma.settlement.update({
      where: { id: city.id },
      data: { buildingCount: n, healthyCount: healthy, decayingCount: decaying, ruinedCount: ruined },
    });
  }
  const sums = await prisma.settlement.aggregate({
    where: { parentId: state.id },
    _sum: { buildingCount: true, healthyCount: true, decayingCount: true, ruinedCount: true },
  });
  await prisma.settlement.update({
    where: { id: state.id },
    data: {
      childCount: sizes.length,
      buildingCount: sums._sum.buildingCount ?? 0, healthyCount: sums._sum.healthyCount ?? 0,
      decayingCount: sums._sum.decayingCount ?? 0, ruinedCount: sums._sum.ruinedCount ?? 0,
    },
  });

  // A local-only sign-in token so the demo can be opened without email.
  if (process.env.NODE_ENV !== "production") {
    await prisma.session.create({ data: { sessionToken: "demo-session-token", userId: user.id, expires: new Date(Date.now() + 7 * 864e5) } });
    console.log("Demo user created. Dev session cookie authjs.session-token = demo-session-token");
  }
}

main().finally(() => prisma.$disconnect());
