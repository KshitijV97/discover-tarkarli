import Link from "next/link";
import type { AppSettings } from "@/lib/settings";
import { Aurora } from "@/components/fx/Aurora";

export function Footer({ property }: { property: AppSettings["property"] }) {
  return (
    <footer className="relative mt-section overflow-hidden bg-ink text-ink-foreground">
      <Aurora className="opacity-40" />
      <div className="container-page relative grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-heading text-2xl font-semibold">{property.name}</p>
          <p className="mt-3 max-w-sm text-sm text-ink-foreground/70">Six rooms on the sand, a kitchen that follows the tide, and breakfast every morning.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Stay</p>
          <Link href="/book" className="block text-ink-foreground/70 hover:text-ink-foreground">Book a room</Link>
          <Link href="/#rooms" className="block text-ink-foreground/70 hover:text-ink-foreground">Rooms</Link>
          <Link href="/account" className="block text-ink-foreground/70 hover:text-ink-foreground">My bookings</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Contact</p>
          {property.phone && <a href={`tel:${property.phone}`} className="block text-ink-foreground/70 hover:text-ink-foreground">{property.phone}</a>}
          {property.email && <a href={`mailto:${property.email}`} className="block text-ink-foreground/70 hover:text-ink-foreground">{property.email}</a>}
          {property.address && <p className="text-ink-foreground/70">{property.address}</p>}
          {!property.phone && !property.email && !property.address && <p className="text-ink-foreground/50">Contact details coming soon</p>}
        </div>
      </div>
      <div className="container-page relative border-t border-white/10 py-5 text-xs text-ink-foreground/50">
        <p>© {new Date().getFullYear()} {property.name}{property.gstin ? ` · GSTIN ${property.gstin}` : ""}</p>
        <p className="mt-1">Booking software © 2026 Kshitij Vengurlekar. All rights reserved.</p>
      </div>
    </footer>
  );
}
