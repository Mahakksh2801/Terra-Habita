import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terra Habita",
  description: "Grow a city, then a world, one habit at a time.",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Terra Habita", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <header className="border-b border-line bg-surface">
          <nav aria-label="Main" className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
            <Link href={session ? "/dashboard" : "/"} className="mr-auto text-lg font-semibold tracking-tight">
              Terra Habita
            </Link>
            {session ? (
              <>
                <Link href="/dashboard" className="hover:underline">Today</Link>
                <Link href="/map" className="hover:underline">Map</Link>
                <Link href="/habits" className="hover:underline">Habits</Link>
                <Link href="/stats" className="hover:underline">Stats</Link>
                <Link href="/settings" className="hover:underline">Settings</Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button className="text-muted hover:underline">Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-ink">Sign in</Link>
            )}
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
