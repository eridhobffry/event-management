"use client";

import { useState, useMemo } from "react";
import { Calendar, MapPin, Users, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Event } from "@/types/event";

export default function EventsClient({ events }: { events: Event[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return events;
    const q = query.toLowerCase();
    return events.filter(
      (ev) =>
        ev.name.toLowerCase().includes(q) ||
        (ev.location ?? "").toLowerCase().includes(q) ||
        (ev.description ?? "").toLowerCase().includes(q)
    );
  }, [query, events]);

  // Helpers
  const formatDate = (date: Date | string | null) => {
    if (!date) return "Date TBD";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "Time TBD";
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <Input
            placeholder="Search events by name, location, or keyword..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-12 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          No events match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event) => (
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
                    {event.location ?? "TBA"}
                  </div>

                  <div className="flex items-center text-sm text-zinc-300">
                    <Users className="w-4 h-4 mr-3 text-emerald-400" />
                    Registration Open
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-4">
                <Link href={`/events/${event.id}/register`} className="w-full">
                  <Button className="w-full group/btn bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200">
                    Register Now
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-200" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
