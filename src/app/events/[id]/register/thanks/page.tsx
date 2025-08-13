"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Share2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegistrationThankYou() {
  const [state, setState] = useState<{
    attendeeId: string | null;
    eventId: string | null;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem("rsvp_confirmation");
        if (raw) setState(JSON.parse(raw));
      }
    } catch {}
  }, []);

  const qrValue = useMemo((): string | null => {
    if (!state?.attendeeId) return null;
    const url = new URL(window.location.origin + "/api/attendees/check-in");
    url.searchParams.set("id", state.attendeeId);
    return url.toString();
  }, [state?.attendeeId]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let mounted = true;
    async function renderQr() {
      if (!qrValue || !canvasRef.current) return;
      try {
        const mod = await import("qrcode");
        const qrcode = mod?.default ?? mod;
        if (!mounted) return;
        await qrcode.toCanvas(canvasRef.current, qrValue, {
          width: 160,
          margin: 1,
        });
      } catch {}
    }
    renderQr();
    return () => {
      mounted = false;
    };
  }, [qrValue]);

  const shareText = useMemo(() => {
    return `I just RSVP’d to an event. Join me!`;
  }, []);

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join me at this event",
          text: shareText,
          url:
            typeof window !== "undefined"
              ? window.location.origin + "/events"
              : undefined,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          shareText + " " + (window.location.origin + "/events")
        );
        alert("Link copied to clipboard");
      }
    } catch {}
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-zinc-950 px-4 text-center">
      <CheckCircle className="w-20 h-20 text-emerald-400 mb-6" />
      <h1 className="text-3xl font-bold text-white mb-2">
        You&apos;re all set!
      </h1>
      <p className="text-zinc-400 max-w-md mb-6">
        We&apos;ll email your confirmation to {state?.email ?? "your inbox"}.
        Save your QR for quick check‑in.
      </p>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        {qrValue ? (
          <div className="flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={160}
              height={160}
              className="bg-white rounded"
            />
            <div className="mt-3 text-xs text-zinc-500">
              Show this at the door to check in
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <QrCode className="w-4 h-4" />
            QR available after page loads
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={handleShare} variant="secondary">
          <Share2 className="w-4 h-4 mr-2" /> Invite friends
        </Button>
        <Link href="/events">
          <Button variant="outline">Browse more events</Button>
        </Link>
      </div>
    </div>
  );
}
