import {
  Calendar,
  MapPin,
  ArrowRight,
  Clock,
  ShieldCheck,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex flex-col">
      <header className="backdrop-blur-xl bg-black/20 border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                {event.name}
              </h1>
              <p className="text-zinc-400">Details and registration</p>
            </div>
            <Link href={`/events/${event.id}/register`}>
              <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500">
                Get Tickets
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
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
