# Terra Habita game rules (proposed defaults)

All numbers live in `src/lib/game/config.ts`. Rules are pure functions in
`src/lib/game/` and are covered by tests in `src/lib/game/__tests__/`.

## Days and timezones
- A "day" is always a calendar day in the user's IANA timezone, stored as a DATE.
- The decay job may run hourly for everyone; per user it only processes local
  days that have fully ended and that it has not processed yet
  (`User.lastProcessedOn`), so it is idempotent and catches up after outages.

## Frequency
- You can have any number of habits. Each one runs on chosen weekdays
  (every day, 6 days, 4 days, …), stored as a weekday mask.
- Only scheduled days can be missed or extend a streak. Completing on an
  unscheduled day still builds, but does not count toward streak milestones.

## Completing a habit
- Today only (no backfill). One completion per habit per day.
- Always places one building at the next free cell, spiralling out from the city centre.
- Type comes from category: body→gym, mind→library, work→office, social→plaza,
  creative→studio, home→house, other→shop.
- Height tier comes from lifetime completions: 1 / 25 / 100 / 250 / 500 / 1000
  → tiers 1–6. Existing buildings keep their height.
- Un-ticking today removes the building that completion raised.

## Damage (Mahakksh's rules, 2026-11-16)
Counted in consecutive *scheduled* days missed. Damage lands on the habit's most
recent building that is still standing.

| Habit scheduled | 50% damage | Ruined |
|---|---|---|
| 5, 6 or 7 days a week | 2nd missed day in a row | 3rd missed day in a row |
| 4 or fewer days a week | 1st missed day | 2nd missed day in a row |

- For a weekday habit, missing Friday and Monday counts as two in a row.
- If the misses keep going, the cycle repeats on the next most recent building.
- Milestone buildings (park, district hall, landmark) are never damaged.
- Archived habits are no longer checked.

## Repair
- Damaged buildings are repaired to 100% once every scheduled day in the
  7 days after the last missed day is completed. New buildings keep being built
  for those days as usual.
- Missing a day during those 7 days restarts the count from that day.
## Streak milestones (per habit)
- 7 days → park, 30 days → district hall, 100 days → landmark.
- Each is a building placed next to that day's building, plus a Milestone row.
- Awarded once per streak run; a new run after a break can earn them again.

## Promotion
- A city is full at 500 buildings (24×24 grid).
- State, country and continent are full at 5 children each; the world never fills.
- When the active city fills, a new city is founded. The first time, a state is
  created above the old city, which becomes a tile on the state map. When a
  state fills, the same happens one level up, and so on.
- At this pace, three daily habits fill a city in about 5–6 months.
