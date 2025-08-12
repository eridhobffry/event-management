import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export function AttendeesEmpty({ eventPublicUrl }: { eventPublicUrl: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No attendees yet</h3>
        <p className="text-muted-foreground mb-4">
          Once people register for this event, they&apos;ll appear here.
        </p>
        <Link href={eventPublicUrl}>
          <Button variant="outline">View Registration Page</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
