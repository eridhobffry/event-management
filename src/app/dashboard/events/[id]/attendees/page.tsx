import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { listAttendeesByEventId } from "@/actions/attendees";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DataTable } from "@/components/data-table";
import { stackServerApp } from "@/stack";
import { attendeeColumns } from "./columns";
import { AttendeesHeader } from "./_components/attendees-header";
import { AttendeesFilters } from "./_components/attendees-filters";
import { AttendeesEmpty } from "./_components/attendees-empty";
import { AttendeesPagination } from "./_components/attendees-pagination";

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
              {/* Header + Event info */}
              <div className="px-4 lg:px-6">
                <AttendeesHeader
                  eventId={event.id}
                  eventName={event.name}
                  eventLocation={event.location}
                  formattedDate={formattedDate}
                  attendeeCount={attendeeCount}
                  attendees={attendees}
                  q={q}
                  status={status}
                />
              </div>

              {/* Filters */}
              <div className="px-4 lg:px-6">
                <AttendeesFilters q={q} status={status} />
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
                    <AttendeesEmpty eventPublicUrl={`/events/${id}/register`} />
                  )}
                </div>
              </div>

              {/* Pagination */}
              <div className="px-4 lg:px-6">
                {attendeeCount > 0 && (
                  <AttendeesPagination
                    q={q}
                    status={status}
                    page={page}
                    pageSize={pageSize}
                    pageCountHasNext={attendees.length >= pageSize}
                    showingCount={attendees.length}
                    totalCount={attendeeCount}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
