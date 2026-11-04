import "server-only";
import { db } from "./db";
import { rupeesToPaise, type Paise } from "@/lib/money";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: Paise;
  veg: boolean;
}

export async function listActiveMenuItems(): Promise<MenuItem[]> {
  const rows = await db()<{ id: string; name: string; description: string; category: string; price: string; veg: boolean }[]>`
    select id, name, description, category, price, veg from menu_items where active order by sort_order, name`;
  return rows.map((r) => ({ ...r, price: rupeesToPaise(r.price) }));
}
