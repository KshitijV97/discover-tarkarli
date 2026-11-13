/**
 * Pure: field definitions and form parsing for the rooms and menu editors.
 * The server action re-parses everything here; the browser form is never trusted.
 */
import { z } from "zod";

export type CatalogField =
  | { name: string; label: string; kind: "text" | "textarea" | "lines"; hint?: string; placeholder?: string }
  | { name: string; label: string; kind: "number"; step?: string; hint?: string }
  | { name: string; label: string; kind: "boolean"; hint?: string };

export type FormValues = Record<string, string>;
export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const lines = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const num = (s: string | undefined) => (s === undefined || s.trim() === "" ? NaN : Number(s.replace(/,/g, "")));

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
export const ROOM_FIELDS: CatalogField[] = [
  { name: "name", label: "Room name", kind: "text" },
  { name: "slug", label: "Web address", kind: "text", hint: "Used in links, e.g. sea-breeze-suite. Leave empty to make one from the name." },
  { name: "description", label: "Description", kind: "textarea" },
  { name: "basePrice", label: "Price per night (₹, before GST)", kind: "number", step: "1", hint: "Applies to new bookings only. Existing bookings keep the price they were booked at." },
  { name: "maxOccupancy", label: "Maximum guests", kind: "number", step: "1" },
  { name: "photos", label: "Photo links", kind: "lines", hint: "One https:// link per line. The first is the cover photo.", placeholder: "https://…" },
  { name: "amenities", label: "Amenities", kind: "lines", hint: "One per line, e.g. Air-conditioned, Sea view." },
  { name: "sortOrder", label: "Display order", kind: "number", step: "1", hint: "Lower numbers show first." },
  { name: "active", label: "Bookable (shown on the site)", kind: "boolean", hint: "Untick to hide the room from new bookings. Existing bookings are kept." },
];

const roomSchema = z.object({
  name: z.string().trim().min(1, "Give the room a name.").max(80, "Keep the name under 80 characters."),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only.").max(60),
  description: z.string().trim().max(2000, "Keep the description under 2,000 characters."),
  basePrice: z.number({ invalid_type_error: "Enter the price in rupees." }).min(0, "The price can't be negative.").max(1_000_000, "That price looks too high."),
  maxOccupancy: z.number({ invalid_type_error: "Enter a number of guests." }).int("Use a whole number.").min(1, "At least 1 guest.").max(20, "At most 20 guests."),
  photos: z.array(z.string().url("Each photo must be a full link.").refine((u) => u.startsWith("https://"), "Photo links must start with https://")).max(20, "Up to 20 photos."),
  amenities: z.array(z.string().max(60)).max(30, "Up to 30 amenities."),
  sortOrder: z.number({ invalid_type_error: "Enter a number." }).int("Use a whole number."),
  active: z.boolean(),
});
export type RoomInput = z.infer<typeof roomSchema>;

export function parseRoomForm(v: FormValues): ParseResult<RoomInput> {
  return parse(roomSchema, {
    name: v.name ?? "",
    slug: (v.slug ?? "").trim() || slugify(v.name ?? ""),
    description: v.description ?? "",
    basePrice: num(v.basePrice),
    maxOccupancy: num(v.maxOccupancy),
    photos: lines(v.photos ?? "").filter((x) => x !== ""),
    amenities: lines(v.amenities ?? ""),
    sortOrder: v.sortOrder?.trim() ? num(v.sortOrder) : 0,
    active: v.active === "on",
  });
}

export function roomToForm(r: Partial<RoomInput> = {}): FormValues {
  return {
    name: r.name ?? "", slug: r.slug ?? "", description: r.description ?? "",
    basePrice: r.basePrice !== undefined ? String(r.basePrice) : "", maxOccupancy: r.maxOccupancy !== undefined ? String(r.maxOccupancy) : "2",
    photos: (r.photos ?? []).join("\n"), amenities: (r.amenities ?? []).join("\n"),
    sortOrder: String(r.sortOrder ?? 0), active: r.active === false ? "" : "on",
  };
}

// ---------------------------------------------------------------------------
// Menu items
// ---------------------------------------------------------------------------
export const MENU_FIELDS: CatalogField[] = [
  { name: "name", label: "Dish name", kind: "text" },
  { name: "category", label: "Category", kind: "text", hint: "e.g. Konkan, Mains, Drinks, Desserts." },
  { name: "description", label: "Description", kind: "textarea" },
  { name: "price", label: "Price (₹, before GST)", kind: "number", step: "1" },
  { name: "veg", label: "Vegetarian", kind: "boolean" },
  { name: "sortOrder", label: "Display order", kind: "number", step: "1", hint: "Lower numbers show first." },
  { name: "active", label: "Available", kind: "boolean", hint: "Untick when the dish is off the menu." },
];

const menuSchema = z.object({
  name: z.string().trim().min(1, "Give the dish a name.").max(80, "Keep the name under 80 characters."),
  category: z.string().trim().min(1, "Choose a category.").max(40),
  description: z.string().trim().max(1000, "Keep the description under 1,000 characters."),
  price: z.number({ invalid_type_error: "Enter the price in rupees." }).min(0, "The price can't be negative.").max(100_000, "That price looks too high."),
  veg: z.boolean(),
  sortOrder: z.number({ invalid_type_error: "Enter a number." }).int("Use a whole number."),
  active: z.boolean(),
});
export type MenuInput = z.infer<typeof menuSchema>;

export function parseMenuForm(v: FormValues): ParseResult<MenuInput> {
  return parse(menuSchema, {
    name: v.name ?? "", category: v.category ?? "", description: v.description ?? "",
    price: num(v.price), veg: v.veg === "on", sortOrder: v.sortOrder?.trim() ? num(v.sortOrder) : 0, active: v.active === "on",
  });
}

export function menuToForm(m: Partial<MenuInput> = {}): FormValues {
  return {
    name: m.name ?? "", category: m.category ?? "Mains", description: m.description ?? "",
    price: m.price !== undefined ? String(m.price) : "", veg: m.veg === false ? "" : "on",
    sortOrder: String(m.sortOrder ?? 0), active: m.active === false ? "" : "on",
  };
}

function parse<T>(schema: z.ZodType<T>, raw: unknown): ParseResult<T> {
  const r = schema.safeParse(raw);
  if (r.success) return { ok: true, value: r.data };
  const errors: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}
