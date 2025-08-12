"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Attendee } from "./columns";

interface ExportButtonProps {
  attendees: Attendee[];
  eventName: string;
  eventId: string;
  q?: string;
  status?: "all" | "checkedIn" | "pending";
  useServer?: boolean;
}

export function ExportButton({
  attendees,
  eventName,
  eventId,
  q,
  status = "all",
  useServer = true,
}: ExportButtonProps) {
  const handleExport = () => {
    if (useServer) {
      const params = new URLSearchParams();
      if (q && q.trim().length > 0) params.set("q", q.trim());
      if (status) params.set("status", status);
      const url = `/api/events/${eventId}/attendees/export${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      // Trigger file download via navigation
      window.location.href = url;
      return;
    }

    if (attendees.length === 0) {
      return;
    }

    // Fallback: client-generated CSV
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Status",
      "Registered Date",
      "Check-in Date",
    ];
    const csvContent = [
      headers.join(","),
      ...attendees.map((attendee) => {
        const status = attendee.checkedIn ? "Checked In" : "Pending";
        const registeredDate = attendee.registeredAt
          ? new Date(attendee.registeredAt).toLocaleDateString()
          : "Unknown";
        const checkinDate = attendee.checkedIn
          ? new Date(attendee.checkedIn).toLocaleDateString()
          : "";

        return [
          `"${attendee.name}"`,
          `"${attendee.email}"`,
          `"${attendee.phone || ""}"`,
          `"${status}"`,
          `"${registeredDate}"`,
          `"${checkinDate}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const filename = `${eventName
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}_attendees_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    }
  };

  return (
    <Button
      variant="outline"
      size="lg"
      className="gap-2 w-full sm:w-auto"
      onClick={handleExport}
      disabled={attendees.length === 0}
    >
      <Download className="h-4 w-4" />
      Export CSV ({attendees.length})
    </Button>
  );
}
