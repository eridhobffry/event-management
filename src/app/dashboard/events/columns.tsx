"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { events } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { DeleteEventButton } from "@/components/delete-event-button";

export type Event = typeof events.$inferSelect & {
  attendeeCount: number;
};

export const columns: ColumnDef<Event>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const event = row.original;
      return (
        <Link
          href={`/dashboard/events/${event.id}`}
          className="font-medium hover:underline"
        >
          {event.name}
        </Link>
      );
    },
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      const formatted = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
      return <span>{formatted}</span>;
    },
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "attendeeCount",
    header: "Attendees",
    cell: ({ row }) => {
      const count = row.getValue("attendeeCount") as number;
      return (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {count}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");
      return (
        <Badge variant={isActive ? "default" : "outline"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const event = row.original;

      return (
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
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/events/${event.id}/edit`}>
                Edit event
              </Link>
            </DropdownMenuItem>
            <DeleteEventButton eventId={event.id} eventName={event.name} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
