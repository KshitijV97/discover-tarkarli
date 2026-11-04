import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { upsertIdentityUser, type UserRole } from "@/lib/server/users-repo";

/**
 * Auth.js (NextAuth v5) — portable, users stored in our own Postgres.
 * Sessions are signed JWT cookies (no session table).
 *
 * Env: AUTH_SECRET (required), AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET (Google),
 *      ADMIN_EMAILS / STAFF_EMAILS (role allow-lists).
 * Phone OTP (India) will be added as another provider — see docs/auth.md.
 */
export const googleEnabled = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

const config: NextAuthConfig = {
  providers: googleEnabled ? [Google({ authorization: { params: { prompt: "select_account" } } })] : [],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/signin", error: "/signin" },
  trustHost: true,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        // Only accept Google accounts with a verified email.
        return !!profile?.email && profile.email_verified === true;
      }
      return false;
    },
    async jwt({ token, account, profile }) {
      // Runs with `account` only at sign-in: create/link our user and stamp the token.
      if (account && account.provider === "google" && profile) {
        const user = await upsertIdentityUser({
          provider: "google",
          providerAccountId: account.providerAccountId,
          email: profile.email ?? null,
          emailVerified: profile.email_verified === true,
          name: profile.name ?? null,
          image: (profile as { picture?: string }).picture ?? null,
        });
        token.uid = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) {
        session.user.id = token.uid as string;
        session.user.role = (token.role as UserRole) ?? "guest";
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
