"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Attendee } from "./columns";

interface ExportButtonProps {
  attendees: Attendee[];
  eventName: string;
}

export function ExportButton({ attendees, eventName }: ExportButtonProps) {
  const handleExport = () => {
    if (attendees.length === 0) {
      return;
    }

    // Create CSV content
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

    // Create and download file
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

      // Clean up
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
