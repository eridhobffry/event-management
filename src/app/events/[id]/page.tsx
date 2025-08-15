import {
  Calendar,
  MapPin,
  ArrowRight,
  Clock,
  ShieldCheck,
  Share2,
  ExternalLink,
  Download,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { headers } from "next/headers";
// Defer share actions; not critical to LCP (client lazy wrapper)
import ShareActions from "./_components/share-actions.lazy";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);
  if (!event || !event.isActive) notFound();

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
      ? new Date(d).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Time TBD";

  // Build absolute URL for sharing
  const hdrs = await headers();
  const host =
    hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto =
    hdrs.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const eventUrl = `${origin}/events/${id}`;

  // Calendar helpers
  const start = event.date ? new Date(event.date) : new Date();
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const dt = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}${String(d.getUTCDate()).padStart(2, "0")}T${String(
      d.getUTCHours()
    ).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}${String(
      d.getUTCSeconds()
    ).padStart(2, "0")}Z`;
  const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    event.name
  )}&dates=${dt(start)}/${dt(end)}&details=${encodeURIComponent(
    event.description ?? ""
  )}&location=${encodeURIComponent(event.location ?? "")}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//event-management//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@event-management`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(start)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${(event.name || "").replace(/\n/g, " ")}`,
    `DESCRIPTION:${(event.description || "").replace(/\n/g, " ")}`,
    `LOCATION:${(event.location || "").replace(/\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;

  const mapsLink = event.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        event.location
      )}`
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex flex-col">
      <header className="backdrop-blur-xl bg-black/20 border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-white truncate">
                {event.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 text-zinc-300">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  {formatDate(event.date)}
                </span>
                <span className="inline-flex items-center gap-2 text-zinc-300">
                  <Clock className="w-4 h-4 text-violet-400" />
                  {formatTime(event.date)}
                </span>
                {event.location && (
                  <Link
                    href={mapsLink!}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="truncate max-w-[18rem]">
                      {event.location}
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
                <Badge
                  variant="outline"
                  className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                >
                  Free
                </Badge>
              </div>
            </div>
            <div className="shrink-0">
              <Link href={`/events/${event.id}/register`}>
                <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500">
                  Get Tickets
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">About this event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-300 leading-relaxed">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Schedule</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-300 text-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-20 text-zinc-400">
                    {formatTime(start as unknown as Date)}
                  </div>
                  <div>Doors open</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 text-zinc-400">
                    {formatTime(start as unknown as Date)}
                  </div>
                  <div>Main session</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 text-zinc-400">
                    {formatTime(end as unknown as Date)}
                  </div>
                  <div>Networking</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Share</CardTitle>
              </CardHeader>
              <CardContent>
                <ShareActions url={eventUrl} text={`Check out ${event.name}`} />
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Add to Calendar</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Link href={gcalLink} target="_blank">
                  <Button
                    variant="outline"
                    className="border-white/10 text-zinc-200"
                  >
                    <Calendar className="w-4 h-4 mr-2" /> Google Calendar
                  </Button>
                </Link>
                <a href={icsHref} download={`${event.name}.ics`}>
                  <Button
                    variant="outline"
                    className="border-white/10 text-zinc-200"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download .ics
                  </Button>
                </a>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">FAQs</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-300 text-sm space-y-2">
                <p>
                  • Free RSVP required. Arrival 15 minutes early recommended.
                </p>
                <p>• Refund policy: contact organizer for changes.</p>
                <p>• Accessibility: step-free access where possible.</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Similar events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="flex gap-4 min-w-max">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-64 h-36 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-zinc-400"
                      >
                        Coming soon
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                    {event.date ? "Upcoming" : "TBA"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-emerald-400 border-emerald-400/30"
                  >
                    Free
                  </Badge>
                </div>
                <CardTitle className="text-white">Event details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-zinc-200">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-3 text-indigo-400" />
                  <div>
                    <div className="font-medium">{formatDate(event.date)}</div>
                    <div className="text-sm text-zinc-400">Date</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-3 text-violet-400" />
                  <div>
                    <div className="font-medium">{formatTime(event.date)}</div>
                    <div className="text-sm text-zinc-400">Time</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-3 text-purple-400" />
                  <div>
                    <div className="font-medium">{event.location ?? "TBA"}</div>
                    <div className="text-sm text-zinc-400">Venue</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <ShieldCheck className="w-5 h-5 mr-3 text-emerald-400" />
                  <div>
                    <div className="font-medium">Secure checkout</div>
                    <div className="text-sm text-zinc-400">
                      Your data is protected
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Share2 className="w-5 h-5 mr-3 text-sky-400" />
                  <div>
                    <div className="font-medium">Share</div>
                    <div className="text-sm text-zinc-400">
                      WhatsApp, Instagram, X
                    </div>
                  </div>
                </div>
                <Link href={`/events/${event.id}/register`}>
                  <Button className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500">
                    Get Tickets
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
