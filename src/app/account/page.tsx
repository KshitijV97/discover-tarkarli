import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/server/session";
import { listBookingsForUser } from "@/lib/server/bookings";
import { formatDate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { img } from "@/lib/images";
import { Avatar } from "@/components/site/Header";
import { RevealGroup, RevealItem } from "@/components/fx/Reveal";

export const metadata: Metadata = { title: "My bookings", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  pending: "bg-warning/15 text-warning", confirmed: "bg-success/15 text-success", checked_in: "bg-primary-soft text-primary",
  checked_out: "bg-surface-muted text-muted", cancelled: "bg-danger/10 text-danger", expired: "bg-danger/10 text-danger",
};

export default async function AccountPage({ searchParams }: { searchParams: { denied?: string } }) {
  const user = await requireUser("/account");
  const bookings = await listBookingsForUser(user.id, user.email);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.checkOut >= today && !["cancelled", "expired"].includes(b.status));
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <div className="container-page pb-10 pt-24">
      <div className="flex items-center gap-4">
        <Avatar user={user} size={56} />
        <div>
          <h1 className="text-3xl font-semibold">Hi, {user.name?.split(" ")[0] ?? "there"}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>
      {searchParams.denied && <p className="mt-6 rounded-md bg-warning/10 p-3 text-sm">That page is for staff only.</p>}

      <Section title="Upcoming stays" empty="No upcoming stays." bookings={upcoming} cta />
      {past.length > 0 && <Section title="Past & cancelled" bookings={past} />}
    </div>
  );
}

function Section({ title, bookings, empty, cta }: { title: string; bookings: Awaited<ReturnType<typeof listBookingsForUser>>; empty?: string; cta?: boolean }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {bookings.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-8 text-center">
          <p className="text-muted">{empty}</p>
          {cta && <Link href="/book" className="mt-4 inline-flex rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground">Plan a stay</Link>}
        </div>
      ) : (
        <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookings.map((b) => (
            <RevealItem key={b.reference}>
              <Link href={`/booking/${b.accessToken}`} className="group block overflow-hidden rounded-card border border-border bg-surface shadow-card transition hover:-translate-y-1 hover:shadow-raised">
                <div className="relative h-36 overflow-hidden bg-gradient-to-br from-primary/60 to-gold/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {b.photo && <img src={img(b.photo, 700)} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
                  <span className={`absolute right-3 top-3 rounded-pill px-2.5 py-1 text-xs font-semibold backdrop-blur ${STATUS[b.status]}`}>{b.status.replace("_", " ")}</span>
                </div>
                <div className="p-4">
                  <p className="font-heading text-lg font-semibold">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</p>
                  <p className="text-sm text-muted">{b.rooms} · {b.numGuests} guest{b.numGuests > 1 ? "s" : ""}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-mono text-xs text-muted">{b.reference}</span>
                    <span className="font-semibold">{formatINR(b.total)}</span>
                  </div>
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </section>
  );
}
