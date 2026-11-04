import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { listActiveRooms } from "@/lib/server/rooms-repo";
import { getSettings } from "@/lib/server/settings-repo";
import { isISODate, todayInTz } from "@/lib/dates";
import { getPaymentProvider } from "@/lib/payments";

export const metadata: Metadata = { title: "Book your stay" };
export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }: { searchParams: { checkIn?: string; checkOut?: string } }) {
  const [rooms, settings] = await Promise.all([listActiveRooms(), getSettings()]);
  const today = todayInTz(settings.property.timezone);
  const ci = isISODate(searchParams.checkIn) && searchParams.checkIn >= today ? searchParams.checkIn : null;
  const co = ci && isISODate(searchParams.checkOut) && searchParams.checkOut > ci ? searchParams.checkOut : null;
  return (
    <BookingFlow
      rooms={rooms}
      settings={settings}
      today={today}
      serverNow={new Date().toISOString()}
      initialCheckIn={ci}
      initialCheckOut={co}
      paymentsOnline={settings.booking.paymentsEnabled && !!getPaymentProvider()}
    />
  );
}
