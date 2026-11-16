/**
 * Who may sign in. Terra Habita is private by default: set ALLOWED_EMAILS to a
 * comma-separated list. In production, an empty or missing list lets nobody in;
 * in development, anyone may sign in.
 */
export function parseAllowList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(
  email: string | null | undefined,
  raw = process.env.ALLOWED_EMAILS,
  production = process.env.NODE_ENV === "production",
): boolean {
  const list = parseAllowList(raw);
  if (!list.length) return !production;
  return !!email && list.includes(email.trim().toLowerCase());
}
