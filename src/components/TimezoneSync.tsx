"use client";

import { useEffect } from "react";
import { saveTimezone } from "@/app/actions";

/** Adopts the browser's timezone once, until the user picks one in Settings. */
export function TimezoneSync({ current }: { current: string }) {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== current) void saveTimezone(tz, { auto: true });
  }, [current]);
  return null;
}
