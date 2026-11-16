import { redirect } from "next/navigation";
import { auth, oauthProviders, signIn } from "@/auth";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await auth()) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="text-muted">We&apos;ll email you a link. No password needed, and new accounts are created automatically.</p>
      {error && (
        <p role="alert" className="rounded-md border border-ruined p-3 text-ruined">
          That sign-in link didn&apos;t work. It may have expired, so please request a new one.
        </p>
      )}
      <form
        className="space-y-3"
        action={async (form: FormData) => {
          "use server";
          await signIn("nodemailer", { email: String(form.get("email") ?? ""), redirectTo: "/dashboard", redirect: false });
          redirect("/login/check-email");
        }}
      >
        <label htmlFor="email" className="block font-medium">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-line bg-surface px-3 py-2"
        />
        <button className="w-full rounded-md bg-accent px-4 py-2 font-medium text-accent-ink">Email me a sign-in link</button>
      </form>
      {oauthProviders.map((p) => (
        <form
          key={p.id}
          action={async () => {
            "use server";
            await signIn(p.id, { redirectTo: "/dashboard" });
          }}
        >
          <button className="w-full rounded-md border border-line bg-surface px-4 py-2 font-medium">Continue with {p.name}</button>
        </form>
      ))}
    </div>
  );
}
