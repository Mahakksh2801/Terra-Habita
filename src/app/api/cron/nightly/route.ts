import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runNightlyForAll } from "@/server/nightly";

export const dynamic = "force-dynamic";

/**
 * Daily damage pass, called by Vercel Cron. Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; without a configured secret the
 * route refuses, so nobody else can trigger it.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await runNightlyForAll(prisma);
  return NextResponse.json({ ok: true, users: results.length, results });
}
