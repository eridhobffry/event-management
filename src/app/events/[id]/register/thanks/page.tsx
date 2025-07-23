import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegistrationThankYou() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-zinc-950 px-4 text-center">
      <CheckCircle className="w-20 h-20 text-emerald-400 mb-6" />
      <h1 className="text-3xl font-bold text-white mb-4">
        Registration Complete!
      </h1>
      <p className="text-zinc-400 max-w-md mb-8">
        Thank you for registering. A confirmation email has been sent to your
        inbox. We look forward to seeing you at the event.
      </p>
      <div className="flex gap-4">
        <Link href="/events">
          <Button variant="outline">Browse More Events</Button>
        </Link>
      </div>
    </div>
  );
}
