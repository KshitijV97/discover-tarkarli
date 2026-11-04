import { z } from "zod";
import { isISODate } from "@/lib/dates";

const isoDate = z.string().refine(isISODate, "Invalid date");
const mealSelection = z.object({
  date: isoDate,
  mealType: z.enum(["breakfast", "lunch", "dinner"]),
  quantity: z.number().int().min(0).max(50),
});

export const createBookingSchema = z.object({
  checkIn: isoDate,
  checkOut: isoDate,
  rooms: z.array(z.object({ roomId: z.string().uuid(), guests: z.number().int().min(1).max(20) })).min(1).max(6),
  meals: z.array(mealSelection).max(400).default([]),
  guest: z.object({
    name: z.string().trim().min(2, "Please enter your name").max(100),
    phone: z.string().trim().min(8, "Please enter a phone number").max(20),
    email: z.string().trim().email("Please enter a valid email").max(200),
  }),
});

export const updateMealsSchema = z.object({
  meals: z.array(mealSelection).max(400),
});
