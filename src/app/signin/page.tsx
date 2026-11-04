import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { googleEnabled } from "@/auth";
import { getSessionUser } from "@/lib/server/session";
import { signInWithGoogle } from "@/components/site/actions";
import { site } from "@/content/site";
import { img } from "@/lib/images";
import { safeCallbackUrl } from "@/lib/auth/roles";
import { Reveal } from "@/components/fx/Reveal";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  AccessDenied: "That Google account couldn't be used. Please use an account with a verified email.",
  Configuration: "Sign-in isn't configured correctly yet. Please try again later.",
};

export default async function SignInPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl);
  if (await getSessionUser()) redirect(callbackUrl);
  const error = searchParams.error ? ERRORS[searchParams.error] ?? "Sign-in failed. Please try again." : null;

  return (
    <div className="grid min-h-[100svh] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(site.hero.slides[1].src, 1600)} alt="" className="absolute inset-0 h-full w-full animate-kenburns object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="font-heading text-4xl font-semibold leading-tight">Your stays, meals and receipts, in one place.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-gutter pb-12 pt-28">
        <Reveal className="w-full max-w-sm">
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in to see your bookings, change meals, and book faster. You can always book without an account.</p>

          {error && <p className="mt-5 rounded-md bg-danger/10 p-3 text-sm text-danger">{error}</p>}

          <div className="mt-8 space-y-3">
            {googleEnabled ? (
              <form action={signInWithGoogle}>
                <input type="hidden" name="callbackUrl" value={callbackUrl} />
                <button className="flex min-h-12 w-full items-center justify-center gap-3 rounded-pill border border-border bg-surface px-5 font-semibold shadow-card transition hover:-translate-y-0.5 hover:shadow-raised">
                  <GoogleIcon /> Continue with Google
                </button>
              </form>
            ) : (
              <p className="rounded-md bg-surface-muted p-3 text-sm text-muted">Google sign-in isn&apos;t set up yet.</p>
            )}

            <div className="relative py-2 text-center text-xs text-muted">
              <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
              <span className="relative bg-background px-3">or</span>
            </div>

            <button disabled className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-pill border border-dashed border-border px-5 text-sm font-medium text-muted">
              📱 Mobile number (OTP) <span className="rounded-pill bg-surface-muted px-2 py-0.5 text-[11px]">Coming soon</span>
            </button>
          </div>

          <p className="mt-8 text-xs text-muted">By continuing you agree to our booking terms. We only use your name and email to manage your stays.</p>
        </Reveal>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
