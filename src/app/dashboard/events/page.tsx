import { db } from "@/lib/db";
import { events, attendees } from "@/db/schema";
import { columns } from "@/app/dashboard/events/columns";
import { DataTable } from "@/components/data-table";
import { count, eq, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Plus, Calendar } from "lucide-react";
import Link from "next/link";
import { EventCard } from "./event-card";
import { stackServerApp } from "@/stack";

export default async function EventsPage() {
  // Check authentication - redirect if not logged in
  await stackServerApp.getUser({ or: "redirect" });

  // Get events with attendee counts via derived subquery join (robust across dialects)
  const ac = db
    .select({
      eventId: attendees.eventId,
      cnt: count(attendees.id).as("cnt"),
    })
    .from(attendees)
    .groupBy(attendees.eventId)
    .as("ac");

  const data = await db
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
      attendeeCount: sql<number>`coalesce(${ac.cnt}, 0)`.as("attendeeCount"),
    })
    .from(events)
    .leftJoin(ac, eq(ac.eventId, events.id));

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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                      Events
                    </h1>
                    <p className="text-muted-foreground">
                      Manage your events and track attendee registrations.
                    </p>
                  </div>
                  <Link href="/dashboard/events/new">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Events Content */}
              <div className="px-4 lg:px-6">
                {data.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CardContent className="pt-6">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <CardTitle className="mb-2">No events yet</CardTitle>
                      <CardDescription className="mb-4">
                        Get started by creating your first event
                      </CardDescription>
                      <Link href="/dashboard/events/new">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Event
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Mobile/Tablet View - Cards */}
                    <div className="block lg:hidden space-y-4">
                      {data.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>

                    {/* Desktop View - Table */}
                    <div className="hidden lg:block">
                      <DataTable columns={columns} data={data} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
