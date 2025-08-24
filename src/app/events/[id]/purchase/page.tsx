import { notFound } from "next/navigation";
import { getEventAndActiveTicketTypes } from "@/actions/events";
import PurchaseClient from "./purchase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PurchasePage({ params }: Props) {
  const { id } = await params;
  const result = await getEventAndActiveTicketTypes(id);
  if (!result) notFound();
  const { event, ticketTypes } = result;

  const formatDate = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "Date TBD";

  const formatTime = (d: Date | null) =>
    d
      ? new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : "Time TBD";

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex flex-col">
      <header className="backdrop-blur-xl bg-black/20 border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Purchase tickets</h1>
              <p className="text-zinc-400 mt-1">{event.name}</p>
            </div>
            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
              Secure checkout
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Event</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-300 space-y-2">
              <div className="font-medium text-white">{event.name}</div>
              <div className="text-sm">{formatDate(event.date)} · {formatTime(event.date)}</div>
              {event.location && <div className="text-sm">{event.location}</div>}
              <Link href={`/events/${event.id}`} className="text-indigo-400 text-sm">View details</Link>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Checkout</CardTitle>
            </CardHeader>
            <CardContent>
              <PurchaseClient eventId={id} ticketTypes={ticketTypes} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
