import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="container-page flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <span aria-hidden className="inline-block h-6 w-6 rounded-pill bg-gradient-to-br from-gold to-accent" />
          Golden Tide
        </Link>
        <Link href="/book" className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Book a stay
        </Link>
      </div>
    </header>
  );
}
