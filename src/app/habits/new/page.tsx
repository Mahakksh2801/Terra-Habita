import { requireUserId } from "@/server/session";
import { HabitForm } from "@/components/HabitForm";

export default async function NewHabit() {
  await requireUserId();
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">New habit</h1>
      <HabitForm />
    </div>
  );
}
