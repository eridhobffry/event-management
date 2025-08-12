import { notFound } from "next/navigation";
import { count, eq, sql } from "drizzle-orm";
import { Calendar, MapPin, Users, ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";

import { db } from "@/lib/db";
import { events, attendees } from "@/db/schema";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteEventButtonStandalone } from "@/components/delete-event-button-standalone";
import { stackServerApp } from "@/stack";

interface EventDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EventDetailsPage({
  params,
}: EventDetailsPageProps) {
  // Check authentication - redirect if not logged in
  await stackServerApp.getUser({ or: "redirect" });

  // Await params for Next.js compatibility
  const { id } = await params;

  // Get event with attendee count via derived subquery join
  const counts = db
    .select({
      eventId: attendees.eventId,
      cnt: count(attendees.id).as("cnt"),
    })
    .from(attendees)
    .groupBy(attendees.eventId)
    .as("counts");

  const eventData = await db
    .select({
      id: events.id,
      name: events.name,
      description: events.description,
      date: events.date,
      location: events.location,
      expectations: events.expectations,
      isActive: events.isActive,
      createdAt: events.createdAt,
      createdBy: events.createdBy,
      attendeeCount: sql<number>`coalesce(${counts.cnt}, 0)`.as(
        "attendeeCount"
      ),
    })
    .from(events)
    .leftJoin(counts, eq(counts.eventId, events.id))
    .where(eq(events.id, id))
    .limit(1);

  if (!eventData.length) {
    notFound();
  }

  const event = eventData[0];
  const date = event.date ? new Date(event.date) : null;
  const formattedDate = date
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    : "No date set";

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Header Section */}
              <div className="px-4 lg:px-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Link href="/dashboard/events">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Events
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight">
                        {event.name}
                      </h1>
                      <p className="text-muted-foreground">
                        Event details and management
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link href={`/dashboard/events/${event.id}/attendees`}>
                        <Button
                          size="lg"
                          variant="outline"
                          className="gap-2 w-full sm:w-auto"
                        >
                          <Users className="h-4 w-4" />
                          View Attendees ({event.attendeeCount})
                        </Button>
                      </Link>
                      <Link href={`/dashboard/events/${event.id}/edit`}>
                        <Button size="lg" className="gap-2 w-full sm:w-auto">
                          <Edit className="h-4 w-4" />
                          Edit Event
                        </Button>
                      </Link>
                      <DeleteEventButtonStandalone
                        eventId={event.id}
                        eventName={event.name}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="px-4 lg:px-6">
                <div className="w-full">
                  <Card className="w-full">
                    <CardHeader>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-2xl">
                            {event.name}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formattedDate}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {event.location}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {event.attendeeCount}{" "}
                              {event.attendeeCount === 1
                                ? "attendee"
                                : "attendees"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={event.isActive ? "default" : "outline"}
                          >
                            {event.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" />
                            {event.attendeeCount}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {event.description && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            Description
                          </h3>
                          <p className="text-muted-foreground leading-relaxed">
                            {event.description}
                          </p>
                        </div>
                      )}

                      {event.expectations && event.expectations.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            What to Expect
                          </h3>
                          <ul className="space-y-1">
                            {event.expectations.map((expectation, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2"
                              >
                                <span className="text-primary">•</span>
                                <span className="text-muted-foreground">
                                  {expectation}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
                          <div>
                            Created{" "}
                            {event.createdAt
                              ? new Date(event.createdAt).toLocaleDateString()
                              : "Unknown"}
                          </div>
                          <div className="flex gap-4">
                            <Link
                              href={`/events/${event.id}/register`}
                              className="text-primary hover:underline"
                            >
                              View Registration Page
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
