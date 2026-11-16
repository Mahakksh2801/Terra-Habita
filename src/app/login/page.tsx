import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, loginOptions, signIn } from "@/auth";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await auth()) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      {error && (
        <p role="alert" className="rounded-md border border-ruined p-3 text-ruined">
          {error === "AccessDenied"
            ? "This Terra Habita is private, and that account isn't on its list."
            : "That sign-in didn't work. Links expire, so please try again."}
        </p>
      )}
      {loginOptions.oauth.map((p) => (
        <form
          key={p.id}
          action={async () => {
            "use server";
            await signIn(p.id, { redirectTo: "/dashboard" });
          }}
        >
          <button className="w-full rounded-md bg-accent px-4 py-2 font-medium text-accent-ink">Continue with {p.name}</button>
        </form>
      ))}
      {loginOptions.emailProviderId && (
      <form
        className="space-y-3"
        action={async (form: FormData) => {
          "use server";
          try {
            await signIn(loginOptions.emailProviderId!, {
              email: String(form.get("email") ?? ""),
              redirectTo: "/dashboard",
              redirect: false,
            });
          } catch (e) {
            // Same page either way, so the form never reveals which emails are allowed.
            if (!(e instanceof AuthError && e.type === "AccessDenied")) throw e;
          }
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
        <p className="text-sm text-muted">We&apos;ll email you a one-time link. No password needed.</p>
        <button className={`w-full rounded-md px-4 py-2 font-medium ${loginOptions.oauth.length ? "border border-line bg-surface" : "bg-accent text-accent-ink"}`}>
          Email me a sign-in link
        </button>
      </form>
      )}
    </div>
  );
}
