-- Each habit gets its own building colour; buildings keep a copy of it.
ALTER TABLE "Habit" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#d9633c';
ALTER TABLE "Building" ADD COLUMN "color" TEXT;

-- Existing habits: hand out the palette in creation order, per user.
UPDATE "Habit" h
SET "color" = (ARRAY['#d9633c','#4c7fd0','#3fa58f','#a35fc2','#e0a63a','#c2456b','#5b8f3a','#2f7fa0','#b07a4f','#7a8696'])[((r.rn - 1) % 10) + 1]
FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt", "id") AS rn FROM "Habit") r
WHERE h."id" = r."id";

-- Existing habit buildings take their habit's colour (milestone buildings stay null).
UPDATE "Building" b
SET "color" = h."color"
FROM "Habit" h
WHERE b."habitId" = h."id"
  AND NOT EXISTS (SELECT 1 FROM "Milestone" m WHERE m."buildingId" = b."id");
