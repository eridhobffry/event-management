"use client";

import { useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { resendRSVPConfirmation } from "@/actions/attendees";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

export default function FindTicketPage() {
  const params = useParams<{ id: string }>();
  const eventId = params?.id;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      toast.error("Please enter your email");
      return;
    }
    startTransition(async () => {
      const res = await resendRSVPConfirmation({ eventId, email: normalized });
      toast.success(
        res?.message ||
          "If a registration exists for this email, we’ve resent the confirmation."
      );
      // Optionally redirect back to event page
      router.push(`/events/${eventId}`);
    });
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <h1 className="text-2xl font-semibold text-white mb-2">Find my ticket</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Enter the email you used to RSVP. We’ll resend your confirmation email.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-indigo-500/50 focus:bg-white/10"
          />
        </div>
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Resend confirmation
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
