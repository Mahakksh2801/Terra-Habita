"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { EVERY_DAY, isValidTimeZone } from "@/lib/game";
import { requireUserId } from "@/server/session";
import { createHabit, habitInput, setArchived, updateHabit } from "@/server/habits";
import { completeHabit, uncompleteHabit } from "@/server/checkoff";
import { setTimezone } from "@/server/today";

const LABEL: Record<string, string> = {
  gym: "gym", library: "library", office: "office", plaza: "plaza", studio: "studio", house: "house", shop: "shop",
  park: "park", district_hall: "district hall", landmark: "landmark",
};
const REJECTED: Record<string, string> = {
  already_done: "Already done today.",
  archived: "That habit is archived.",
  before_created: "That habit starts tomorrow.",
  grid_full: "Your city is full.",
  future: "You can't complete a future day.",
  too_old: "You can only check off today.",
};

const withArticle = (word: string) => `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;

export async function toggleHabit(habitId: string, done: boolean): Promise<{ ok: boolean; message: string }> {
  const userId = await requireUserId();
  if (!done) {
    const r = await uncompleteHabit(prisma, userId, habitId);
    revalidatePath("/dashboard");
    return { ok: r.ok, message: r.ok ? "Unchecked. Today's building was removed." : "It wasn't checked off." };
  }
  const r = await completeHabit(prisma, userId, habitId);
  revalidatePath("/dashboard");
  if (!r.ok) return { ok: false, message: REJECTED[r.reason] ?? "Couldn't check that off." };
  const [main, ...extra] = r.built;
  const parts = [`Built ${withArticle(LABEL[main.type] ?? main.type)} in ${r.settlement}.`];
  for (const b of extra) parts.push(`Your ${r.streak}-day streak unlocked ${withArticle(LABEL[b.type] ?? b.type)}!`);
  if (r.repaired) parts.push(`A clean week repaired ${r.repaired} building${r.repaired === 1 ? "" : "s"}.`);
  if (r.foundedCity) parts.push(`${r.settlement} is full. You founded ${r.foundedCity}!`);
  return { ok: true, message: parts.join(" ") };
}

export type HabitFormState = { error?: string; fieldErrors?: Record<string, string[] | undefined> };

export async function saveHabit(_prev: HabitFormState, form: FormData): Promise<HabitFormState> {
  const userId = await requireUserId();
  const days = form.getAll("days").map(Number);
  const flexible = form.get("mode") === "flex";
  const parsed = habitInput.safeParse({
    name: String(form.get("name") ?? ""),
    category: String(form.get("category") ?? ""),
    frequency: flexible ? EVERY_DAY : days.reduce((m, d) => (Number.isInteger(d) && d >= 0 && d <= 6 ? m | (1 << d) : m), 0),
    weeklyTarget: flexible ? Number(form.get("target")) : null,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = form.get("id");
  if (typeof id === "string" && id) await updateHabit(prisma, userId, id, parsed.data);
  else await createHabit(prisma, userId, parsed.data);
  revalidatePath("/habits");
  revalidatePath("/dashboard");
  redirect("/habits");
}

export async function archiveHabit(habitId: string, archived: boolean) {
  const userId = await requireUserId();
  await setArchived(prisma, userId, habitId, archived);
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function saveTimezone(timezone: string, { auto = false } = {}) {
  const userId = await requireUserId();
  if (!isValidTimeZone(timezone)) return { ok: false };
  if (auto) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.timezoneConfirmed) return { ok: true };
  }
  await setTimezone(prisma, userId, timezone);
  revalidatePath("/", "layout");
  return { ok: true };
}
