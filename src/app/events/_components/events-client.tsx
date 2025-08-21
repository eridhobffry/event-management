"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Search,
  Filter,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Event } from "@/types/event";
import { listCategories, inferEventCategory } from "@/lib/event-category";

export default function EventsClient({ events }: { events: Event[] }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initializedFromUrl = useRef(false);

  const cities = useMemo(() => {
    const set = new Set<string>();
    events.forEach((ev) => {
      const loc = (ev.location || "").trim();
      if (loc) {
        // Heuristic: take last comma-separated token as city if exists
        const parts = loc.split(",").map((s) => s.trim());
        const candidate = parts.length > 1 ? parts[parts.length - 1] : parts[0];
        if (candidate) set.add(candidate);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const isWithinRange = useCallback(
    (d?: Date | string | null) => {
      if (!d) return false;
      const date = new Date(d);
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      switch (dateRange) {
        case "today":
          return date >= startOfDay && date < endOfDay;
        case "week":
          return date >= startOfWeek && date < endOfWeek;
        case "month":
          return date >= startOfMonth && date < endOfMonth;
        default:
          return true;
      }
    },
    [dateRange]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return events
      .filter((ev) =>
        city === "all"
          ? true
          : (ev.location || "").toLowerCase().includes(city.toLowerCase())
      )
      .filter((ev) =>
        category === "all"
          ? true
          : inferEventCategory({
              name: ev.name,
              description: ev.description,
            }) === category
      )
      .filter((ev) => isWithinRange(ev.date))
      .filter((ev) => {
        if (!q.trim()) return true;
        return (
          ev.name.toLowerCase().includes(q) ||
          (ev.location ?? "").toLowerCase().includes(q) ||
          (ev.description ?? "").toLowerCase().includes(q)
        );
      });
  }, [query, events, city, category, isWithinRange]);

  // Initialize filters from URL on first render
  useEffect(() => {
    if (initializedFromUrl.current) return;
    const q = searchParams.get("q") || "";
    const c = searchParams.get("city") || "all";
    const cat = searchParams.get("category") || "all";
    const d = searchParams.get("date") || "all";
    setQuery(q);
    setCity(c);
    setCategory(cat);
    setDateRange(d);
    initializedFromUrl.current = true;
  }, [searchParams]);

  // Persist filters to URL when they change
  useEffect(() => {
    if (!initializedFromUrl.current) return;
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    if (city !== "all") params.set("city", city);
    else params.delete("city");
    if (category !== "all") params.set("category", category);
    else params.delete("category");
    if (dateRange !== "all") params.set("date", dateRange);
    else params.delete("date");
    const qs = params.toString();
    router.replace(`/events${qs ? `?${qs}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, city, category, dateRange]);

  const resetAll = () => {
    setQuery("");
    setCity("all");
    setCategory("all");
    setDateRange("all");
  };

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
      {/* Filters + Search */}
      <div className="mx-auto max-w-5xl mb-8 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" aria-hidden="true" />
            <span className="text-sm text-zinc-400">Filters</span>
          </div>

          <Select value={city} onValueChange={setCity}>
            <SelectTrigger
              aria-label="Filter by city"
              className="bg-white/5 border-white/10 text-white"
            >
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="all">All cities</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              aria-label="Filter by category"
              className="bg-white/5 border-white/10 text-white"
            >
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="all">All categories</SelectItem>
              {listCategories(events).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger
              aria-label="Filter by date"
              className="bg-white/5 border-white/10 text-white"
            >
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="all">Any time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={resetAll}
            aria-label="Reset all filters"
            className="border-white/10 text-zinc-200"
          >
            Reset all
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <Input
            placeholder="Search events by name, location, or keyword..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-12 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200"
            aria-label="Search events"
          />
        </div>

        <div className="flex items-center justify-between text-sm text-zinc-400">
          <div>
            Showing <span className="text-zinc-200">{filtered.length}</span> of
            <span className="text-zinc-200"> {events.length}</span> events
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20">
          <div className="mx-auto max-w-md text-center">
            <div className="text-2xl font-semibold text-white mb-2">
              No results
            </div>
            <p className="text-zinc-400 mb-6">
              We couldn&apos;t find events matching your filters. Try adjusting
              your search or explore all events.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() => setCity("all")}
                className="border-white/10 text-zinc-200"
              >
                Clear city
              </Button>
              <Button
                variant="outline"
                onClick={() => setCategory("all")}
                className="border-white/10 text-zinc-200"
              >
                Clear category
              </Button>
              <Button
                variant="outline"
                onClick={() => setDateRange("all")}
                className="border-white/10 text-zinc-200"
              >
                Clear date
              </Button>
            </div>
          </div>
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
                    {inferEventCategory({
                      name: event.name,
                      description: event.description,
                    })}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-4 space-y-2">
                <Link href={`/events/${event.id}/register`} className="w-full">
                  <Button className="w-full group/btn bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border-0 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200">
                    RSVP Free
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-200" />
                  </Button>
                </Link>
                <Link href={`/events/${event.id}`} className="w-full">
                  <Button
                    variant="outline"
                    className="w-full text-xs text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
                  >
                    View Details & Buy Tickets
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
