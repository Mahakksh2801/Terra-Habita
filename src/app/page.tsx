import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

const steps = [
  ["Do a habit", "Every habit you complete today adds one building to your city. Running builds gyms, reading builds libraries."],
  ["Keep it standing", "Miss too many days in a row and your newest building is damaged, then ruined. A clean week repairs it."],
  ["Earn the skyline", "Streaks unlock parks, district halls and landmarks. The more you do, the taller you build."],
  ["Zoom out", "A full city becomes a tile on a state map, then a country, a continent, and a world: years of habits, at a glance."],
];

export default async function Landing() {
  if (await auth()) redirect("/dashboard");
  return (
    <div className="space-y-10">
      <section className="space-y-4 pt-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Build a world, one habit at a time.</h1>
        <p className="max-w-xl text-lg text-muted">
          Terra Habita turns your daily habits into a growing city. Keep going for years and that city becomes a whole world.
        </p>
        <Link href="/login" className="inline-block rounded-md bg-accent px-5 py-2.5 font-medium text-accent-ink">
          Start your city
        </Link>
      </section>
      <ol className="grid gap-4 sm:grid-cols-2">
        {steps.map(([title, body], i) => (
          <li key={title} className="rounded-lg border border-line bg-surface p-5">
            <p className="text-sm font-medium text-muted">Step {i + 1}</p>
            <h2 className="mt-1 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
