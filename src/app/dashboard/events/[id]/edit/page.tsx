import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/db/schema";
import { EditEventForm } from "./edit-event-form";

interface EditEventPageProps {
  params: { id: string };
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, params.id))
    .limit(1);

  if (!event) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Edit Event</h1>
      <EditEventForm initialData={event} eventId={params.id} />
    </div>
  );
}
