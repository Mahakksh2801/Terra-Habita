# Terra Habita game rules (proposed defaults)

All numbers live in `src/lib/game/config.ts`. Rules are pure functions in
`src/lib/game/` and are covered by tests in `src/lib/game/__tests__/`.

## Days and timezones
- A "day" is always a calendar day in the user's IANA timezone, stored as a DATE.
- The decay job may run hourly for everyone; per user it only processes local
  days that have fully ended and that it has not processed yet
  (`User.lastProcessedOn`), so it is idempotent and catches up after outages.

## Frequency
- A habit has a weekday mask (daily, weekdays, or any set of days).
- Only scheduled days can be missed or extend a streak. Completing on an
  unscheduled day still builds, but does not count toward streak milestones.

## Completing a habit
- Today only (no backfill). One completion per habit per day.
- Places one building at the next free cell, spiralling out from the city centre.
- Type comes from category: body→gym, mind→library, work→office, social→plaza,
  creative→studio, home→house, other→shop.
- Height tier comes from lifetime completions: 1 / 25 / 100 / 250 / 500 / 1000
  → tiers 1–6. Existing buildings keep their height.
- Repairs every damaged building of that habit: decaying and worn ones go back
  to 100; ruined ones gain 40 (so a ruin takes two completions to recover).
- Un-ticking today removes the building that completion raised.

## Decay
- Each missed scheduled day costs every building of that habit 25 condition.
- Healthy ≥ 60, decaying 20–59, ruined < 20.
  One miss is a warning (75), two make buildings decay (50), four ruin them (0).
- A building only suffers for misses after the day it was built.
- Archived habits' buildings freeze and never decay.
- Ruined buildings stay on the map (they are not removed).

## Streak milestones (per habit)
- 7 days → park, 30 days → district hall, 100 days → landmark.
- Each is a building placed next to that day's building, plus a Milestone row.
- Awarded once per streak run; a new run after a break can earn them again.
- Milestone buildings belong to the habit and decay with it.

## Promotion
- A city is full at 500 buildings (24×24 grid).
- State, country and continent are full at 5 children each; the world never fills.
- When the active city fills, a new city is founded. The first time, a state is
  created above the old city, which becomes a tile on the state map. When a
  state fills, the same happens one level up, and so on.
- At this pace, three daily habits fill a city in about 5–6 months.
