import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { columns } from "@/app/dashboard/events/columns";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function EventsPage() {
  const data = await db.select().from(events);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        <Button asChild>
          <Link href="/dashboard/events/new">Create Event</Link>
        </Button>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
