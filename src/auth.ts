import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import Resend from "next-auth/providers/resend";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/db";
import { isEmailAllowed } from "@/lib/access";

const env = process.env;
const isProd = env.NODE_ENV === "production";
const providers: Provider[] = [];

// Email magic link: Resend (free tier) or any SMTP server. In development with
// neither, the link is printed to the server console instead.
let emailProviderId: string | null = null;
if (env.AUTH_RESEND_KEY) {
  providers.push(Resend({ from: env.EMAIL_FROM ?? "Terra Habita <onboarding@resend.dev>" }));
  emailProviderId = "resend";
} else if (env.EMAIL_SERVER || !isProd) {
  providers.push(
    Nodemailer({
      server: env.EMAIL_SERVER ?? "smtp://localhost:25",
      from: env.EMAIL_FROM ?? "Terra Habita <noreply@localhost>",
      ...(env.EMAIL_SERVER
        ? {}
        : {
            async sendVerificationRequest({ identifier, url }: { identifier: string; url: string }) {
              console.log(`\n[auth] Magic sign-in link for ${identifier}:\n${url}\n`);
            },
          }),
    }),
  );
  emailProviderId = "nodemailer";
}

const hasGitHub = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);
if (hasGitHub) providers.push(GitHub);

/** What the login page should offer. */
export const loginOptions = {
  emailProviderId,
  oauth: hasGitHub ? [{ id: "github", name: "GitHub" }] : [],
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/login/check-email", error: "/login" },
  callbacks: {
    // Private app: only allow-listed emails get in. This runs before a magic
    // link is sent and before any account is created.
    signIn({ user }) {
      return isEmailAllowed(user.email);
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
