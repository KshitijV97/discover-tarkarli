import { unsplash } from "@/lib/images";

/**
 * Marketing content for the public site. Placeholder stock photos (Unsplash
 * licence) until real property photography is available: swap URLs here.
 * Room photos live in the database (rooms.photos), not here.
 */
export const site = {
  tagline: "Beachfront homestay · Konkan coast",
  hero: {
    eyebrow: "Six rooms. One shoreline.",
    title: "Wake up to the tide. Stay for the food.",
    subtitle:
      "A small, family-run retreat on the sand, with a coastal kitchen that cooks what the boats bring in. Breakfast is on us, every morning.",
    slides: [
      { src: unsplash("1507525428034-b723cf961d3e"), alt: "Golden sunrise over a calm beach" },
      { src: unsplash("1505228395891-9a51e7e86bf6"), alt: "Aerial view of turquoise surf meeting white sand" },
      { src: unsplash("1519046904884-53103b34b206"), alt: "Palm trees and umbrellas on a quiet beach" },
      { src: unsplash("1566073771259-6a8506099945"), alt: "Wooden sun deck beside a pool at dusk" },
      { src: unsplash("1473116763249-2faaef81ccda"), alt: "Soft sunset reflected on wet sand" },
    ],
  },
  stats: [
    { value: 6, suffix: "", label: "rooms, never crowded" },
    { value: 30, suffix: "", label: "steps from bed to sea" },
    { value: 100, suffix: "%", label: "breakfasts included" },
    { value: 18, suffix: ":00", label: "meal changes until, day before" },
  ],
  experiences: [
    {
      title: "Sunrise on the sand",
      body: "Coffee on the deck, then barefoot walks before the beach wakes up.",
      image: unsplash("1506953823976-52e1fdc0149a"),
      size: "wide",
    },
    {
      title: "Under the surface",
      body: "Snorkel and dive trips with local guides we trust.",
      image: unsplash("1544551763-46a013bb70d5"),
      size: "tall",
    },
    {
      title: "Pool & hammock hours",
      body: "Nothing on the schedule. That's the schedule.",
      image: unsplash("1520250497591-112f2f40a3f4"),
      size: "normal",
    },
    {
      title: "Evenings by the water",
      body: "Lanterns, sea breeze and the day's catch on the grill.",
      image: unsplash("1571896349842-33c89424de2d"),
      size: "normal",
    },
  ],
  kitchen: {
    title: "A kitchen that follows the tide",
    body:
      "Kokum, coconut, and whatever the boats brought in this morning. Lunch and dinner are optional add-ons you can change until 6pm the day before, so we cook fresh and waste nothing.",
    images: [
      { src: unsplash("1565557623262-b51c2513a641"), alt: "Coastal curry with naan" },
      { src: unsplash("1585937421612-70a008356fbe"), alt: "Bowls of Indian curries and rice" },
      { src: unsplash("1559339352-11d035aa65de"), alt: "Seaside dining deck" },
    ],
  },
  gallery: [
    unsplash("1540541338287-41700207dee6"),
    unsplash("1500375592092-40eb2168fd21"),
    unsplash("1602002418082-a4443e081dd1"),
    unsplash("1414235077428-338989a2e8c0"),
    unsplash("1582719508461-905c673771fd"),
    unsplash("1512917774080-9991f1c4c750"),
    unsplash("1585937421612-70a008356fbe"),
    unsplash("1519046904884-53103b34b206"),
  ],
  howItWorks: [
    { title: "Pick your dates", body: "See live availability for every room. Sold-out nights are marked." },
    { title: "Plan your meals", body: "Breakfast is included. Add lunch or dinner per day, for as many guests as you like." },
    { title: "Pay a small deposit", body: "Secure your room online. The balance is settled at the property." },
  ],
  bookingBanner: unsplash("1540541338287-41700207dee6"),
} as const;
