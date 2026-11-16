# Terra Habita

A habit tracker where every completed habit adds a building to your city. Keep it up for years and
your city grows into a state, a country, a continent and a world.

Game rules: [docs/game-rules.md](docs/game-rules.md).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 6 · Auth.js (email magic link, optional GitHub) · Vitest

## Getting started

```bash
cp .env.example .env          # set DATABASE_URL and AUTH_SECRET (npx auth secret)
npm install
npx prisma migrate dev        # create the schema
npm run dev
```

Without `EMAIL_SERVER` or `AUTH_RESEND_KEY` set, sign-in links are printed to the dev server console instead of emailed.
Set `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` to also offer GitHub sign-in.

The app is private: only emails in `ALLOWED_EMAILS` can sign in (anyone can in development when it's empty;
nobody can in production). To host it for free, follow [docs/deploy.md](docs/deploy.md).

## Tests

```bash
npm test          # game rules (pure functions)
npm run test:db   # database layer; uses DATABASE_URL from .env.test and truncates its tables
```

## Layout

- `src/lib/game/` – the game rules as pure functions, with every number in `config.ts`
- `src/server/` – database operations (habits, check-off, settlements, today view)
- `src/app/` – pages and server actions
- `prisma/schema.prisma` – data model
