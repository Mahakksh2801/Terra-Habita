import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/server/session";
import { NotFound, getHabit } from "@/server/habits";
import { HabitForm } from "@/components/HabitForm";

export default async function EditHabit({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const habit = await getHabit(prisma, userId, id).catch((e) => {
    if (e instanceof NotFound) notFound();
    throw e;
  });
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Edit habit</h1>
      <p className="text-sm text-muted">Changing the days applies from today. Past days and buildings stay as they are.</p>
      <HabitForm habit={habit} />
    </div>
  );
}
