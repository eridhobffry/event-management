import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Defer discovery UI for faster LCP (client lazy wrapper)
import EventsClient from "@/app/events/_components/events-client.lazy";
import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { Event } from "@/types/event";
import { eq } from "drizzle-orm";
import { stackServerApp } from "@/stack";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  let activeEvents: Event[] = [];
  try {
    activeEvents = await db
      .select()
      .from(events)
      .where(eq(events.isActive, true));
  } catch {
    activeEvents = [];
  }
  const user = await stackServerApp.getUser().catch(() => null);
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.25),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.25),transparent_50%)]" />
        <div className="container mx-auto px-4 pt-20 pb-16 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-indigo-300 via-white to-violet-300 bg-clip-text text-transparent">
              Discover, Organize, and Sell Out Your Events
            </h1>
            <p className="mt-6 text-lg text-zinc-300">
              Mobile-first ticketing with fast checkout, QR check-in, and
              real-time analytics. Built for modern organizers and delightful
              attendee experiences.
            </p>
            <div className="mt-8 flex items-center justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
              >
                <Link href="#discover" aria-label="Discover events">
                  Discover events
                </Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-zinc-300 text-sm">
              <span>Fast checkout</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>QR check-in</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>Mobile-first</span>
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              LCP-optimized hero • WCAG AA contrast • minimal layout shift
            </p>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-zinc-400 text-sm">
            <span>Trusted by community venues and indie organizers</span>
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            <span>Secure checkout</span>
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            <span>Fast QR check-in</span>
          </div>
        </div>
      </section>

      {/* Discovery feed with filters */}
      <main id="discover" className="container mx-auto px-4 py-10">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-1">
            Find something to do
          </h2>
          <p className="text-sm text-zinc-400">
            Search and filter events happening near you
          </p>
        </div>
        <EventsClient events={activeEvents} />
      </main>

      {/* Organizer callout / tools */}
      {user ? (
        <div className="container mx-auto px-4 pb-12">
          <h3 className="text-lg font-semibold text-white mb-4">
            Organizer tools
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>🎟️ Manage Events</CardTitle>
                <CardDescription>Create and manage your events</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/dashboard/events">Event Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle>🔑 Admin</CardTitle>
                <CardDescription>
                  Manage events, users, and settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard">
                  <Button className="w-full">Go to Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 pb-12">
          <Card>
            <CardHeader>
              <CardTitle>Are you an organizer?</CardTitle>
              <CardDescription>
                Create events, sell tickets, and grow your audience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/organizer/overview">Get started for free</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
