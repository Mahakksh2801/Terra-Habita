import { prisma } from "@/lib/db";
import { requireUserId } from "@/server/session";
import { TimezoneForm } from "@/components/TimezoneForm";

export default async function Settings() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const zones = Intl.supportedValuesOf("timeZone");
  if (!zones.includes(user.timezone)) zones.unshift(user.timezone);
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-muted">Signed in as {user.email}</p>
      <TimezoneForm current={user.timezone} zones={zones} />
    </div>
  );
}
