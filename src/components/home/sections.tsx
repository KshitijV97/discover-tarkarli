import Link from "next/link";
import { site } from "@/content/site";
import { img } from "@/lib/images";
import { formatINR } from "@/lib/money";
import type { MenuItem } from "@/lib/server/menu-repo";
import { Reveal, RevealGroup, RevealItem } from "@/components/fx/Reveal";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { Marquee } from "@/components/fx/Marquee";
import { ParallaxImage } from "@/components/fx/ParallaxImage";
import { AnimatedNumber } from "@/components/fx/AnimatedNumber";
import { Aurora } from "@/components/fx/Aurora";
import { ShimmerButton } from "@/components/fx/ShimmerButton";

export function SectionHeading({ eyebrow, title, body, light }: { eyebrow: string; title: string; body?: string; light?: boolean }) {
  return (
    <Reveal className="mb-10 max-w-2xl">
      <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${light ? "text-gold" : "text-accent"}`}>{eyebrow}</p>
      <h2 className="text-balance text-3xl font-semibold leading-tight md:text-5xl">{title}</h2>
      {body && <p className={`mt-4 text-base md:text-lg ${light ? "text-ink-foreground/75" : "text-muted"}`}>{body}</p>}
    </Reveal>
  );
}

export function Stats() {
  return (
    <section className="container-page py-section md:py-24">
      <RevealGroup className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {site.stats.map((s) => (
          <RevealItem key={s.label} className="border-l-2 border-gold pl-4">
            <p className="font-heading text-4xl font-semibold text-primary md:text-5xl">
              <AnimatedNumber value={s.value} inView />{s.suffix}
            </p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

export function Experiences() {
  const span: Record<string, string> = { wide: "md:col-span-2", tall: "md:row-span-2", normal: "" };
  return (
    <section id="experiences" className="relative scroll-mt-20 overflow-hidden bg-ink py-20 text-ink-foreground md:py-28">
      <Aurora className="opacity-60" />
      <div className="container-page relative">
        <SectionHeading light eyebrow="Days here" title="Slow mornings, salt air, nowhere to be" body="Everything is a short walk away, and most of it is the sea." />
        <RevealGroup className="grid auto-rows-[15rem] gap-4 md:grid-cols-3 md:auto-rows-[17rem]">
          {site.experiences.map((e) => (
            <RevealItem key={e.title} className={span[e.size]}>
              <SpotlightCard className="h-full rounded-card border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(e.image, 1000)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 z-20 p-5">
                  <h3 className="text-xl font-semibold text-white">{e.title}</h3>
                  <p className="mt-1 max-w-sm text-sm text-white/75">{e.body}</p>
                </div>
              </SpotlightCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

export function Kitchen({ menu }: { menu: MenuItem[] }) {
  const k = site.kitchen;
  return (
    <section id="kitchen" className="scroll-mt-20 py-20 md:py-28">
      <div className="container-page grid items-center gap-10 lg:grid-cols-2">
        <div className="relative grid grid-cols-5 grid-rows-6 gap-3">
          <Reveal className="col-span-3 row-span-6"><ParallaxImage src={k.images[0].src} alt={k.images[0].alt} className="h-[22rem] rounded-card md:h-[30rem]" /></Reveal>
          <Reveal delay={0.1} className="col-span-2 row-span-3"><ParallaxImage src={k.images[1].src} alt={k.images[1].alt} strength={30} className="h-[10.5rem] rounded-card md:h-[14.6rem]" /></Reveal>
          <Reveal delay={0.2} className="col-span-2 row-span-3"><ParallaxImage src={k.images[2].src} alt={k.images[2].alt} strength={30} className="h-[10.5rem] rounded-card md:h-[14.6rem]" /></Reveal>
        </div>
        <div>
          <SectionHeading eyebrow="The kitchen" title={k.title} body={k.body} />
          <Reveal delay={0.1} className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-pill bg-success/10 px-3 py-1.5 font-medium text-success">Breakfast included daily</span>
            <span className="rounded-pill bg-primary-soft px-3 py-1.5 font-medium text-primary">Lunch & dinner as easy add-ons</span>
          </Reveal>
        </div>
      </div>
      {menu.length > 0 && (
        <div className="mt-14">
          <Marquee duration={45} gap="0.75rem">
            {menu.map((m) => (
              <div key={m.id} className="flex w-72 shrink-0 items-start gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
                <span aria-label={m.veg ? "Vegetarian" : "Non-vegetarian"} className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-sm border-2 ${m.veg ? "border-veg" : "border-non-veg"}`}>
                  <span className={`h-1.5 w-1.5 rounded-pill ${m.veg ? "bg-veg" : "bg-non-veg"}`} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{m.name}</p>
                  <p className="line-clamp-1 text-xs text-muted">{m.description}</p>
                  <p className="mt-1 text-sm font-medium text-primary">{formatINR(m.price)}</p>
                </div>
              </div>
            ))}
          </Marquee>
        </div>
      )}
    </section>
  );
}

export function Gallery() {
  const g = site.gallery;
  const half = Math.ceil(g.length / 2);
  const tile = (src: string, i: number) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={i} src={img(src, 700)} alt="" loading="lazy" className="h-48 w-72 shrink-0 rounded-card object-cover md:h-64 md:w-96" />
  );
  return (
    <section id="gallery" className="scroll-mt-20 py-20 md:py-24">
      <div className="container-page"><SectionHeading eyebrow="Gallery" title="A look around" /></div>
      <div className="space-y-4">
        <Marquee duration={60}>{g.slice(0, half).map(tile)}</Marquee>
        <Marquee duration={60} reverse>{g.slice(half).map(tile)}</Marquee>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="container-page py-20 md:py-24">
      <SectionHeading eyebrow="Booking" title="Three steps to the sea" />
      <RevealGroup className="relative grid gap-6 md:grid-cols-3">
        <div aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
        {site.howItWorks.map((s, i) => (
          <RevealItem key={s.title} className="relative">
            <span className="relative z-10 grid h-12 w-12 place-items-center rounded-pill bg-primary font-heading text-lg font-semibold text-primary-foreground shadow-raised">{i + 1}</span>
            <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="container-page pb-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-[calc(var(--radius-card)*1.5)] bg-ink px-6 py-16 text-center text-ink-foreground md:py-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img(site.bookingBanner, 1800)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-35" />
          <Aurora className="opacity-70" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold md:text-5xl">Your room with a view of the tide is waiting</h2>
            <p className="mx-auto mt-4 max-w-lg text-ink-foreground/80">Live availability, breakfast included, and a small deposit to hold your dates.</p>
            <div className="mt-8"><ShimmerButton href="/book">Check availability →</ShimmerButton></div>
            <p className="mt-4 text-xs text-ink-foreground/60">Already booked? <Link href="/account" className="underline">See your bookings</Link></p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
