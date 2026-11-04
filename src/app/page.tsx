import Link from "next/link";
import { listActiveRooms } from "@/lib/server/rooms-repo";
import { formatINR } from "@/lib/money";
import { RoomPhoto } from "@/components/booking/RoomCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rooms = await listActiveRooms();
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-primary to-primary/85 text-primary-foreground">
        <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-pill bg-gold/40 blur-2xl" />
        <div aria-hidden className="absolute -bottom-10 left-0 right-0 h-20 rounded-[50%] bg-background" />
        <div className="container-page relative py-16 md:py-24">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary-foreground/80">Beachfront homestay · 6 rooms</p>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight md:text-5xl">Wake up to the tide. Stay for the food.</h1>
          <p className="mt-4 max-w-lg text-primary-foreground/85">
            A small, family-run retreat on the sand, with a coastal kitchen. Breakfast is included with every stay.
          </p>
          <Link href="/book" className="mt-8 inline-flex min-h-12 items-center rounded-pill bg-accent px-6 font-semibold text-accent-foreground shadow-raised hover:bg-accent/90">
            Check availability
          </Link>
        </div>
      </section>

      <section className="container-page py-section">
        <h2 className="mb-6 text-2xl font-semibold">Our rooms</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <Link key={r.id} href="/book" className="group overflow-hidden rounded-card border border-border bg-surface shadow-card transition hover:shadow-raised">
              <RoomPhoto room={r} className="h-44 w-full" />
              <div className="p-4">
                <h3 className="text-lg font-semibold group-hover:text-primary">{r.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{r.description}</p>
                <p className="mt-3 text-sm">
                  <span className="font-semibold">{formatINR(r.basePrice)}</span>
                  <span className="text-muted"> / night · sleeps {r.maxOccupancy}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
