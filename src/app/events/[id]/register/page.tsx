import {
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  Clock,
  Mail,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RegisterForm from "./register-form";
import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

interface EventRegistrationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventRegistrationPage({
  params,
}: EventRegistrationPageProps) {
  const { id } = await params;

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event || !event.isActive) {
    notFound();
  }

  // Format date helper
  const formatDate = (date: Date | null) => {
    if (!date) return "Date TBD";
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time helper
  const formatTime = (date: Date | null) => {
    if (!date) return "Time TBD";
    const eventDate = new Date(date);
    return eventDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex flex-col">
      {/* Header */}
      <header className="backdrop-blur-xl bg-black/20 border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Link
              href="/events"
              className="text-indigo-400 hover:text-indigo-300 transition-colors duration-200 p-2 rounded-lg hover:bg-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Event Registration
              </h1>
              <p className="text-zinc-400 mt-1">Join this amazing event</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event Details */}
          <div className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <Badge
                    variant="secondary"
                    className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 backdrop-blur-sm"
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatTime(event.date)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                  >
                    Registration Open
                  </Badge>
                </div>
                <CardTitle className="text-2xl text-white">
                  {event.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <p className="text-zinc-300 leading-relaxed">
                  {event.description}
                </p>

                <div className="space-y-4">
                  <div className="flex items-center text-zinc-200">
                    <Calendar className="w-5 h-5 mr-3 text-indigo-400" />
                    <div>
                      <div className="font-medium">
                        {formatDate(event.date)}
                      </div>
                      <div className="text-sm text-zinc-400">Event Date</div>
                    </div>
                  </div>

                  <div className="flex items-center text-zinc-200">
                    <Clock className="w-5 h-5 mr-3 text-violet-400" />
                    <div>
                      <div className="font-medium">
                        {formatTime(event.date)}
                      </div>
                      <div className="text-sm text-zinc-400">Event Time</div>
                    </div>
                  </div>

                  <div className="flex items-center text-zinc-200">
                    <MapPin className="w-5 h-5 mr-3 text-purple-400" />
                    <div>
                      <div className="font-medium">{event.location}</div>
                      <div className="text-sm text-zinc-400">Venue</div>
                    </div>
                  </div>

                  <div className="flex items-center text-zinc-200">
                    <Users className="w-5 h-5 mr-3 text-emerald-400" />
                    <div>
                      <div className="font-medium">Free Registration</div>
                      <div className="text-sm text-zinc-400">
                        No ticket required
                      </div>
                    </div>
                  </div>
                </div>

                {/* What to Expect */}
                <div className="bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-3">
                    What to Expect
                  </h3>
                  <ul className="text-sm text-zinc-300 space-y-2">
                    {(Array.isArray(event.expectations)
                      ? (event.expectations as string[])
                      : []
                    ).map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-indigo-400 mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registration Form */}
          <div className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl text-white">
                  Register for this Event
                </CardTitle>
                <p className="text-zinc-400">
                  Guest checkout, 2 simple steps. No account required.
                </p>
              </CardHeader>

              <CardContent>
                <RegisterForm eventId={event.id} />
              </CardContent>
            </Card>

            {/* Sticky Order Summary & Trust Cues */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg sticky top-24">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">Order Summary</div>
                    <div className="text-xs text-zinc-400">
                      Details → Confirm
                    </div>
                  </div>
                  <ShieldCheck
                    className="w-5 h-5 text-emerald-400"
                    aria-hidden
                  />
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span>1 × RSVP ticket</span>
                    <span className="text-emerald-400">Free</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Lock className="w-3 h-3" aria-hidden />
                  <span>
                    Secure — No payment required. You can cancel anytime.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Support Info */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Need Help?</div>
                    <div className="text-sm text-zinc-400">
                      Contact event support
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="backdrop-blur-xl bg-white/5 border-t border-white/10 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-zinc-400">
            <p>&copy; 2025 Event Management Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
