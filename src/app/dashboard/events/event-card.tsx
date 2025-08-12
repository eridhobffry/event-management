"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, MapPin, MoreHorizontal, Users } from "lucide-react";
import Link from "next/link";
import { DeleteEventButton } from "@/components/delete-event-button";
import type { Event as DbEvent } from "@/types/db";

export type Event = DbEvent & {
  attendeeCount: number;
};

export function EventCard({ event }: { event: Event }) {
  const date = event.date ? new Date(event.date) : null;
  const formatted = date
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    : "No date set";

  return (
    <Link href={`/dashboard/events/${event.id}`}>
      <Card className="transition-all duration-200 hover:shadow-md cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{event.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatted}
              </CardDescription>
              {event.location && (
                <CardDescription className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </CardDescription>
              )}
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {event.attendeeCount}{" "}
                {event.attendeeCount === 1 ? "attendee" : "attendees"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={event.isActive ? "default" : "outline"}>
                {event.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {event.attendeeCount}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => navigator.clipboard.writeText(event.id)}
                  >
                    Copy event ID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/events/${event.id}`}>
                      View details
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/events/${event.id}/attendees`}>
                      View attendees ({event.attendeeCount})
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/events/${event.id}/edit`}>
                      Edit event
                    </Link>
                  </DropdownMenuItem>
                  <DeleteEventButton
                    eventId={event.id}
                    eventName={event.name}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
