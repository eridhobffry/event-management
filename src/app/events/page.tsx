import { Calendar, MapPin, Users, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function PublicEventsPage() {
  // Fetch only active events for public display
  const activeEvents = await db
    .select()
    .from(events)
    .where(eq(events.isActive, true));

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Discover Events
              </h1>
              <p className="text-zinc-400">
                Find and join amazing events happening near you
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors duration-200 group"
            >
              Event Organizer? Sign In
              <ArrowRight className="w-3 h-3 ml-1 inline-block group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <Input
              placeholder="Search events by name, location, or keyword..."
              className="pl-12 h-12 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200"
            />
          </div>
        </div>

        {activeEvents.length === 0 ? (
          <div className="text-center py-20">
            {/* Glass Card for Empty State */}
            <div className="max-w-md mx-auto p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                <Calendar className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">
                No Events Available
              </h2>
              <p className="text-zinc-400 mb-6">
                Check back soon for upcoming events, or create your own!
              </p>
              <Link href="/dashboard/events/new">
                <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-indigo-500/25">
                  Create Event
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 shadow-xl">
              <div className="flex items-center justify-center space-x-12 text-center">
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                    {activeEvents.length}
                  </div>
                  <div className="text-sm text-zinc-400">Events Available</div>
                </div>
                <div className="h-8 w-px bg-white/10"></div>
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Free
                  </div>
                  <div className="text-sm text-zinc-400">Registration</div>
                </div>
                <div className="h-8 w-px bg-white/10"></div>
                <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                    Live
                  </div>
                  <div className="text-sm text-zinc-400">Updates</div>
                </div>
              </div>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeEvents.map((event) => (
                <Card
                  key={event.id}
                  className="group hover:scale-[1.02] transition-all duration-300 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 shadow-xl hover:shadow-indigo-500/10"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-3">
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
                        Active
                      </Badge>
                    </div>
                    <CardTitle className="text-xl text-white group-hover:text-indigo-300 transition-colors duration-200">
                      {event.name}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-zinc-300">
                        <Calendar className="w-4 h-4 mr-3 text-indigo-400" />
                        {formatDate(event.date)}
                      </div>

                      <div className="flex items-center text-sm text-zinc-300">
                        <MapPin className="w-4 h-4 mr-3 text-violet-400" />
                        {event.location}
                      </div>

                      <div className="flex items-center text-sm text-zinc-300">
                        <Users className="w-4 h-4 mr-3 text-emerald-400" />
                        Registration Open
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4">
                    <Link
                      href={`/events/${event.id}/register`}
                      className="w-full"
                    >
                      <Button className="w-full group/btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200">
                        Register Now
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-200" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}
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
