"use client";

import { ColumnDef } from "@tanstack/react-table";
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
import { MoreHorizontal, Mail, Phone, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

// This type should match the return type of getEventAttendees
export type Attendee = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  userId?: string | null;
  checkedIn?: Date | null;
  registeredAt: Date | null;
};

export const attendeeColumns: ColumnDef<Attendee>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const attendee = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{attendee.name}</span>
          {attendee.userId && (
            <Badge variant="secondary" className="w-fit text-xs mt-1">
              Account Holder
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.getValue("email") as string;
      return (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string | null;
      return phone ? (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{phone}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">Not provided</span>
      );
    },
  },
  {
    accessorKey: "registeredAt",
    header: "Registered",
    cell: ({ row }) => {
      const date = row.getValue("registeredAt") as Date | null;
      if (!date) return <span className="text-muted-foreground">Unknown</span>;

      return (
        <div className="flex flex-col">
          <span className="text-sm">{new Date(date).toLocaleDateString()}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "checkedIn",
    header: "Status",
    cell: ({ row }) => {
      const checkedIn = row.getValue("checkedIn") as Date | null;

      if (checkedIn) {
        return (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div className="flex flex-col">
              <Badge
                variant="default"
                className="w-fit bg-green-600 hover:bg-green-700"
              >
                Checked In
              </Badge>
              <span className="text-xs text-muted-foreground mt-1">
                {new Date(checkedIn).toLocaleDateString()}
              </span>
            </div>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <Badge
            variant="outline"
            className="border-orange-500 text-orange-700"
          >
            Pending
          </Badge>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <RowActions attendee={row.original} />,
  },
];

function RowActions({ attendee }: { attendee: Attendee }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function toggleCheckIn() {
    const params = new URLSearchParams({ id: attendee.id });
    const res = await fetch(`/api/attendees/check-in?${params.toString()}`, {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(
      attendee.checkedIn ? "Marked as pending" : "Marked as checked in"
    );
    startTransition(() => router.refresh());
  }

  async function remove() {
    const params = new URLSearchParams({ id: attendee.id });
    const res = await fetch(`/api/attendees/remove?${params.toString()}`, {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("Failed to remove attendee");
      return;
    }
    toast.success("Attendee removed");
    startTransition(() => router.refresh());
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(attendee.email)}
          disabled={isPending}
        >
          Copy email
        </DropdownMenuItem>
        {attendee.phone && (
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(attendee.phone!)}
            disabled={isPending}
          >
            Copy phone
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleCheckIn} disabled={isPending}>
          {isPending
            ? "Updating..."
            : attendee.checkedIn
            ? "Mark as Pending"
            : "Mark as Checked In"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={remove}
          disabled={isPending}
        >
          {isPending ? "Removing..." : "Remove attendee"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
