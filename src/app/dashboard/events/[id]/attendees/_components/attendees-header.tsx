import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import { ExportButton } from "../export-button";
import type { Attendee } from "../columns";

interface AttendeesHeaderProps {
  eventId: string;
  eventName: string;
  eventLocation?: string | null;
  formattedDate: string;
  attendeeCount: number;
  attendees: Attendee[];
  q: string;
  status: "all" | "checkedIn" | "pending";
}

export function AttendeesHeader({
  eventId,
  eventName,
  eventLocation,
  formattedDate,
  attendeeCount,
  attendees,
  q,
  status,
}: AttendeesHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href={`/dashboard/events/${eventId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Event
          </Button>
        </Link>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Event Attendees</h1>
          <p className="text-muted-foreground">
            {attendeeCount} {attendeeCount === 1 ? "person" : "people"}{" "}
            registered for &ldquo;{eventName}&rdquo;
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ExportButton
            attendees={attendees}
            eventName={eventName}
            eventId={eventId}
            q={q}
            status={status}
            useServer
          />
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {eventName}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>{formattedDate}</span>
            {eventLocation && <span>{eventLocation}</span>}
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {attendeeCount} registered
            </span>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
