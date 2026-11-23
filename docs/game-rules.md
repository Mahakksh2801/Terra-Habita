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
- Only scheduled days can be missed or extend a streak.
- Off days build nothing (changed 2026-11-23). An unscheduled day can't be
  ticked at all: the checkbox is disabled under "Off today", so a habit on
  4 weekdays raises at most 4 buildings a week. Skipping an off day is never a miss.

### "Any N days a week" habits (added 2026-11-18)
- A habit can instead be "any N days a week" (1 to 6), for example the gym 4 days a week on whichever days suit.
- Any day counts, up to N days per week. Weeks run Monday to Sunday in the user's timezone.
- Once N days are done in a week, the habit can't be ticked again until Monday,
  so "any 4 days" raises at most 4 buildings a week.
- When a week ends (Sunday midnight), each day short of N counts as one more miss in a row,
  and the usual damage table applies: N of 5 or more is the "5, 6 or 7 days" row, N of 4 or fewer is the other row.
  Example for 4 a week: 3 days done is 1 miss (newest building to 50%), 2 days done is 2 misses (ruined).
- Weeks in progress never count. A habit created mid-week only owes the days it existed for.
- Repair: damaged buildings are repaired once N days are done in the 7 days after the week that fell short.
- Streak (for milestones): all completions in the current unbroken run of weeks. A finished week
  that fell short of its target breaks the run.

## Completing a habit
- Today only (no backfill). One completion per habit per day.
- Every completed habit-day places exactly one building at the next free cell,
  spiralling out from the city centre. Three habits done today = three buildings.
- Type comes from category: body→gym, mind→library, work→office, social→plaza,
  creative→studio, home→house, other→shop.
- Every habit building is the same size (changed 2026-11-23, replacing the old
  1/25/100/250/500/1000 height tiers): one 3-D block, same height and footprint,
  with exactly 4 windows (2 across, 2 up) on each visible wall.
- Each habit has its own colour (added 2026-11-23), handed out from
  `HABIT_COLORS` as habits are created: the first colour none of your other
  habits uses. Every building a habit raises is painted that colour, so the
  gym's buildings and the project's buildings look different. A building keeps
  its colour even if its habit is later removed. Damage never changes its size: a damaged building gets a
  dashed amber roof edge, a crack and a dark window per wall; a ruined one turns
  grey with all windows dark. Numbers live in `BUILDING` in `config.ts`.
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
