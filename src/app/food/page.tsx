import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { brand } from "@/content/brand";
import { pageMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/server/settings-repo";
import { Reveal, RevealGroup, RevealItem } from "@/components/fx/Reveal";
import { ShimmerButton } from "@/components/fx/ShimmerButton";

export const metadata: Metadata = pageMetadata({
  title: "Local food",
  description: `Konkan dishes cooked to order at ${brand.name}: modak, ghavne, shirwale, patholi, solkadhi and Malvani curries.`,
  path: "/food",
});
export const dynamic = "force-dynamic";

const COURSES = ["Breakfast", "Sweets", "Mains"] as const;

export default async function LocalFoodPage() {
  const settings = await getSettings();
  const f = site.localFood;
  const phone = settings.property.phone;

  return (
    <>
      <section className="container-page pb-16 pt-32 md:pt-36">
        <Reveal>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">{f.eyebrow}</p>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight md:text-6xl">{f.title}</h1>
          <p className="mt-5 max-w-2xl text-base text-muted md:text-lg">{f.body}</p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10 rounded-card border border-gold/40 bg-gold/10 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Signature</p>
          <h2 className="mt-2 font-heading text-3xl font-semibold">{f.solkadhi.name}</h2>
          <p className="mt-2 max-w-xl text-muted">{f.solkadhi.body}</p>
        </Reveal>
      </section>

      {COURSES.map((course) => {
        const dishes = f.dishes.filter((d) => d.course === course);
        if (dishes.length === 0) return null;
        return (
          <section key={course} className="container-page pb-14">
            <h2 className="mb-6 text-2xl font-semibold">{course}</h2>
            <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dishes.map((d) => (
                <RevealItem key={d.name} className="rounded-card border border-border bg-surface p-6 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-heading text-xl font-semibold">{d.name}</h3>
                    <span
                      aria-label={d.veg ? "Vegetarian" : "Non-vegetarian"}
                      className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-sm border-2 ${d.veg ? "border-veg" : "border-non-veg"}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-pill ${d.veg ? "bg-veg" : "bg-non-veg"}`} />
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{d.body}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        );
      })}

      <section className="container-page pb-24">
        <div className="rounded-[calc(var(--radius-card)*1.5)] bg-ink p-8 text-center text-ink-foreground md:p-14">
          <h2 className="mx-auto max-w-xl text-balance text-3xl font-semibold">Ask for a local dish when you book</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-foreground/75">Tell us which dishes you&apos;d like and the day you want them, and we&apos;ll cook them fresh.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ShimmerButton href="/book">Check availability →</ShimmerButton>
            {phone && (
              <Link href={`tel:${phone}`} className="inline-flex min-h-11 items-center rounded-pill border border-ink-foreground/30 px-5 text-sm font-semibold hover:bg-white/10">
                Call {phone}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
