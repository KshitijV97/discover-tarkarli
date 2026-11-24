import type { Metadata } from "next";
import { brand } from "@/content/brand";
import { pageMetadata } from "@/lib/seo";
import { listActiveRooms } from "@/lib/server/rooms-repo";
import { listActiveMenuItems } from "@/lib/server/menu-repo";
import { getSettings } from "@/lib/server/settings-repo";
import { todayInTz } from "@/lib/dates";
import { Hero } from "@/components/home/Hero";
import { RoomsShowcase } from "@/components/home/RoomsShowcase";
import { DogFriendly, Experiences, FinalCta, Gallery, HowItWorks, Kitchen, SectionHeading, Stats } from "@/components/home/sections";

export const metadata: Metadata = pageMetadata({ description: brand.description, path: "/" });
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [rooms, menu, settings] = await Promise.all([listActiveRooms(), listActiveMenuItems(), getSettings()]);
  return (
    <>
      <Hero today={todayInTz(settings.property.timezone)} />
      <Stats />
      <section id="rooms" className="scroll-mt-20 pb-20 md:pb-28">
        <div className="container-page">
          <SectionHeading eyebrow="Rooms" title="Six rooms, each a little different" body="All with air-conditioning, fresh linen, and breakfast included. Swipe to explore." />
          <RoomsShowcase rooms={rooms} />
        </div>
      </section>
      <Experiences />
      <Kitchen menu={menu} />
      <DogFriendly />
      <Gallery />
      <HowItWorks />
      <FinalCta />
    </>
  );
}
