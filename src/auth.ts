import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/db";

const emailServer = process.env.EMAIL_SERVER;

const providers: Provider[] = [
  Nodemailer({
    server: emailServer ?? "smtp://localhost:25",
    from: process.env.EMAIL_FROM ?? "Terra Habita <noreply@localhost>",
    // Without an SMTP server (local development), print the link instead of sending it.
    ...(emailServer
      ? {}
      : {
          async sendVerificationRequest({ identifier, url }: { identifier: string; url: string }) {
            if (process.env.NODE_ENV === "production") {
              throw new Error("EMAIL_SERVER is not configured");
            }
            console.log(`\n[auth] Magic sign-in link for ${identifier}:\n${url}\n`);
          },
        }),
  }),
];
const hasGitHub = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
if (hasGitHub) providers.push(GitHub);

/** OAuth buttons to show on the login page. */
export const oauthProviders = hasGitHub ? [{ id: "github", name: "GitHub" }] : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/login/check-email" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
