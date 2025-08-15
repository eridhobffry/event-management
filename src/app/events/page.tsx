import { ArrowRight } from "lucide-react";

import Link from "next/link";
import EventsClient from "./_components/events-client";
import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { Event } from "@/types/event";
import { eq } from "drizzle-orm";
import { stackServerApp } from "@/stack";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicEventsPage() {
  let activeEvents: Event[] = [];
  try {
    activeEvents = await db
      .select()
      .from(events)
      .where(eq(events.isActive, true));
  } catch (err) {
    console.error(err);
    // Fallback to empty list if DB not available during build/prerender
    activeEvents = [];
  }

  // Check auth to adjust CTA
  const user = await stackServerApp.getUser();

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
            {user ? (
              <Link
                href="/dashboard"
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors duration-200 group"
              >
                Go to Dashboard
                <ArrowRight className="w-3 h-3 ml-1 inline-block group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            ) : (
              <Link
                href="/handler/sign-in"
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors duration-200 group"
              >
                Event Organizer? Sign In
                <ArrowRight className="w-3 h-3 ml-1 inline-block group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <EventsClient events={activeEvents} />
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
