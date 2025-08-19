import type { Metadata } from "next";
import { stackServerApp } from "@/stack";
import CheckInClient from "@/components/organizer/CheckInClient";

export const metadata: Metadata = {
  title: "Organizer Check-in",
  description: "Scan or paste a ticket token to toggle check-in.",
};

export default async function Page() {
  // Require organizer/staff auth
  await stackServerApp.getUser({ or: "redirect" });

  return (
    <div className="min-h-[70vh] py-8">
      <CheckInClient />
    </div>
  );
}
