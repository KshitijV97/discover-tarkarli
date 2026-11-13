import { describe, expect, it } from "vitest";
import { menuToForm, parseMenuForm, parseRoomForm, roomToForm } from "./catalog-forms";

const room = { name: "Sea Breeze Suite", slug: "", description: "Sea view", basePrice: "6500", maxOccupancy: "4", photos: "https://a.example/1.jpg\nhttps://a.example/2.jpg", amenities: "AC, Sea view", sortOrder: "", active: "on" };

describe("room form", () => {
  it("[smoke] TC-ADM2-11 parses a valid room and makes a slug from the name", () => {
    const r = parseRoomForm(room);
    expect(r).toEqual({ ok: true, value: {
      name: "Sea Breeze Suite", slug: "sea-breeze-suite", description: "Sea view", basePrice: 6500, maxOccupancy: 4,
      photos: ["https://a.example/1.jpg", "https://a.example/2.jpg"], amenities: ["AC", "Sea view"], sortOrder: 0, active: true,
    } });
  });
  it("[sanity] TC-ADM2-12 rejects bad price, occupancy, slug and non-https photos with field messages", () => {
    const r = parseRoomForm({ ...room, basePrice: "-1", maxOccupancy: "0", slug: "Bad Slug", photos: "http://insecure.example/x.jpg" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["basePrice", "maxOccupancy", "photos", "slug"]);
  });
  it("an unticked box means hidden; values round-trip through the form", () => {
    const r = parseRoomForm({ ...room, active: "" });
    expect(r.ok && r.value.active).toBe(false);
    if (r.ok) expect(parseRoomForm(roomToForm(r.value))).toEqual(r);
  });
});

describe("menu form", () => {
  it("[sanity] TC-ADM2-13 parses a dish and rejects a missing price", () => {
    const ok = parseMenuForm({ name: "Solkadhi", category: "Drinks", description: "", price: "120", veg: "on", sortOrder: "1", active: "on" });
    expect(ok).toEqual({ ok: true, value: { name: "Solkadhi", category: "Drinks", description: "", price: 120, veg: true, sortOrder: 1, active: true } });
    const bad = parseMenuForm({ name: "Solkadhi", category: "Drinks", price: "" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.price).toMatch(/rupees/);
  });
  it("defaults for a new dish round-trip", () => {
    const r = parseMenuForm({ ...menuToForm(), name: "Kokum sherbet", price: "80" });
    expect(r.ok).toBe(true);
  });
});
