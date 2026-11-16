import type { LocalDate } from "@/lib/game";

/** Prisma maps @db.Date columns to Date at UTC midnight. */
export const toDbDate = (d: LocalDate): Date => new Date(`${d}T00:00:00.000Z`);
export const fromDbDate = (d: Date): LocalDate => d.toISOString().slice(0, 10);
