import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Users, Calendar } from "lucide-react";
import Link from "next/link";

import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { listAttendeesByEventId } from "@/actions/attendees";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { stackServerApp } from "@/stack";
import { attendeeColumns } from "./columns";
import { ExportButton } from "./export-button";

interface AttendeesPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    q?: string;
    status?: "all" | "checkedIn" | "pending";
    page?: string;
    pageSize?: string;
  }>;
}

export default async function AttendeesPage({
  params,
  searchParams,
}: AttendeesPageProps) {
  // Check authentication - redirect if not logged in
  await stackServerApp.getUser({ or: "redirect" });

  // Await params for Next.js compatibility
  const { id } = await params;
  const sp = (await searchParams) || {};
  const q = sp.q ?? "";
  const status = (sp.status as "all" | "checkedIn" | "pending") ?? "all";
  const page = Number(sp.page ?? 1) || 1;
  const pageSize = Number(sp.pageSize ?? 25) || 25;

  // Get event details first
  const eventData = await db
    .select({
      id: events.id,
      name: events.name,
      date: events.date,
      location: events.location,
    })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (eventData.length === 0) {
    notFound();
  }

  const event = eventData[0];

  // Get attendees for this event with filters/pagination
  const attendeesResult = await listAttendeesByEventId(id, {
    q,
    status,
    page,
    pageSize,
  });

  if (!attendeesResult.success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">
            Failed to load attendees
          </h2>
          <p className="text-muted-foreground mb-4">
            {attendeesResult.message}
          </p>
          <Link href={`/dashboard/events/${id}`}>
            <Button>Back to Event</Button>
          </Link>
        </div>
      </div>
    );
  }

  const attendees = attendeesResult.attendees || [];
  const attendeeCount = attendeesResult.total ?? attendees.length;

  // Format event date
  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Date TBD";

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
                    <Link href={`/dashboard/events/${id}`}>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Event
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight">
                        Event Attendees
                      </h1>
                      <p className="text-muted-foreground">
                        {attendeeCount}{" "}
                        {attendeeCount === 1 ? "person" : "people"} registered
                        for &ldquo;{event.name}&rdquo;
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <ExportButton
                        attendees={attendees}
                        eventName={event.name}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Info Card */}
              <div className="px-4 lg:px-6">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {event.name}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span>{formattedDate}</span>
                      {event.location && <span>{event.location}</span>}
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {attendeeCount} registered
                      </span>
                    </div>
                  </CardHeader>
                </Card>
              </div>

              {/* Filters */}
              <div className="px-4 lg:px-6">
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <form
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3"
                      method="get"
                    >
                      <input
                        type="text"
                        name="q"
                        defaultValue={q}
                        placeholder="Search name or email"
                        className="w-full sm:w-72 border rounded px-3 py-2 text-sm"
                      />
                      <select
                        name="status"
                        defaultValue={status}
                        className="w-full sm:w-48 border rounded px-3 py-2 text-sm"
                      >
                        <option value="all">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="checkedIn">Checked In</option>
                      </select>
                      <input type="hidden" name="page" value="1" />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        Apply
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Attendees Table */}
              <div className="px-4 lg:px-6">
                <div className="max-w-7xl">
                  {attendeeCount > 0 ? (
                    <DataTable
                      columns={attendeeColumns}
                      data={attendees}
                      hidePagination
                    />
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No attendees yet
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Once people register for this event, they&apos;ll
                          appear here.
                        </p>
                        <Link href={`/events/${id}/register`}>
                          <Button variant="outline">
                            View Registration Page
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Pagination */}
              <div className="px-4 lg:px-6">
                {attendeeCount > 0 && (
                  <div className="flex items-center justify-between py-4 text-sm text-muted-foreground">
                    <div>
                      Page {page} · Showing {attendees.length} of{" "}
                      {attendeeCount}
                    </div>
                    <div className="flex items-center gap-2">
                      <form method="get">
                        <input type="hidden" name="q" value={q} />
                        <input type="hidden" name="status" value={status} />
                        <input type="hidden" name="pageSize" value={pageSize} />
                        <input
                          type="hidden"
                          name="page"
                          value={Math.max(1, page - 1)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                        >
                          Previous
                        </Button>
                      </form>
                      <form method="get">
                        <input type="hidden" name="q" value={q} />
                        <input type="hidden" name="status" value={status} />
                        <input type="hidden" name="pageSize" value={pageSize} />
                        <input
                          type="hidden"
                          name="page"
                          value={attendees.length < pageSize ? page : page + 1}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={attendees.length < pageSize}
                        >
                          Next
                        </Button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
