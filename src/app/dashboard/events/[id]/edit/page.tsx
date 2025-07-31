import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { EditEventForm } from "@/app/dashboard/events/[id]/edit/edit-event-form";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { stackServerApp } from "@/stack";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  // Check authentication - redirect if not logged in
  await stackServerApp.getUser({ or: "redirect" });

  const { id } = await params;

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event) {
    notFound();
  }

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
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/dashboard/events/${id}`}>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <ArrowLeft className="h-4 w-4" />
                          Back to Event
                        </Button>
                      </Link>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                      Edit Event
                    </h1>
                    <p className="text-muted-foreground">
                      Update your event details below.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Section */}
              <div className="px-4 lg:px-6">
                <div className="max-w-2xl">
                  <EditEventForm initialData={event} eventId={id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
