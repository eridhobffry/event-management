"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  Share2,
  ShoppingCart,
  ArrowRight,
  Crown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

export default function RegistrationThankYou() {
  const searchParams = useSearchParams();
  const showPurchase = searchParams.get("showPurchase") === "true";

  const [state, setState] = useState<{
    attendeeId: string | null;
    eventId: string | null;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null>(null);

  const [guestListState, setGuestListState] = useState<{
    hasRequest: boolean;
    status: string | null;
    isRequesting: boolean;
    showReason: boolean;
    reason: string;
  }>({
    hasRequest: false,
    status: null,
    isRequesting: false,
    showReason: false,
    reason: "",
  });

  const [proactiveGuestStatus, setProactiveGuestStatus] = useState<{
    isProactiveGuest: boolean;
    guestTitle?: string;
    personalMessage?: string;
    checking: boolean;
  }>({
    isProactiveGuest: false,
    checking: true,
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem("rsvp_confirmation");
        if (raw) setState(JSON.parse(raw));
      }
    } catch {}
  }, []);

  // Check existing guest list request status
  useEffect(() => {
    async function checkGuestListStatus() {
      if (!state?.attendeeId) return;

      try {
        const response = await fetch(
          `/api/guest-list/status?attendeeId=${state.attendeeId}`
        );
        const data = await response.json();

        if (data.hasRequest) {
          setGuestListState((prev) => ({
            ...prev,
            hasRequest: true,
            status: data.status,
          }));
        }
      } catch (error) {
        console.error("Failed to check guest list status:", error);
      }
    }

    async function checkProactiveGuestStatus() {
      if (!state?.eventId || !state?.email) {
        setProactiveGuestStatus((prev) => ({ ...prev, checking: false }));
        return;
      }

      try {
        const response = await fetch(
          `/api/guest-list/check-proactive?eventId=${
            state.eventId
          }&email=${encodeURIComponent(state.email)}`
        );
        const data = await response.json();

        setProactiveGuestStatus({
          isProactiveGuest: data.isProactiveGuest,
          guestTitle: data.guestTitle,
          personalMessage: data.personalMessage,
          checking: false,
        });
      } catch (error) {
        console.error("Failed to check proactive guest status:", error);
        setProactiveGuestStatus((prev) => ({ ...prev, checking: false }));
      }
    }

    checkGuestListStatus();
    checkProactiveGuestStatus();
  }, [state?.attendeeId, state?.eventId, state?.email]);

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

  async function handleGuestListRequest() {
    if (!state?.attendeeId) return;

    setGuestListState((prev) => ({ ...prev, isRequesting: true }));

    try {
      const response = await fetch("/api/guest-list/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeId: state.attendeeId,
          reason: guestListState.reason || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGuestListState((prev) => ({
          ...prev,
          hasRequest: true,
          status: "pending",
          showReason: false,
          reason: "",
        }));
      } else {
        console.error("Guest list request failed:", data.error);
        alert(data.error || "Failed to submit guest list request");
      }
    } catch (error) {
      console.error("Guest list request error:", error);
      alert("Failed to submit guest list request");
    } finally {
      setGuestListState((prev) => ({ ...prev, isRequesting: false }));
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-zinc-950 px-4 text-center">
      <CheckCircle className="w-20 h-20 text-emerald-400 mb-6" />
      <h1 className="text-3xl font-bold text-white mb-2">
        You&apos;re all set!
      </h1>
      <p className="text-zinc-400 max-w-md mb-6">
        We&apos;ll email your RSVP confirmation to{" "}
        {state?.email ?? "your inbox"}. You&apos;re on the guest list for this
        event!
      </p>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        <div className="flex flex-col items-center text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">
            RSVP Confirmed
          </h3>
          <p className="text-sm text-zinc-400 mb-3">
            You&apos;re registered for this event. Show your confirmation email
            at the door.
          </p>
          
          {/* QR Code for check-in */}
          {qrValue && (
            <div className="bg-white p-4 rounded-lg mb-3">
              <canvas ref={canvasRef} />
            </div>
          )}
          
          <div className="text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full">
            Guest List Registration • Free Entry
          </div>
        </div>
      </div>

      {/* Proactive VIP Guest Status */}
      {!proactiveGuestStatus.checking &&
        proactiveGuestStatus.isProactiveGuest && (
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-xl p-6 space-y-4 mb-6 max-w-md">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-yellow-400" />
              <div>
                <h3 className="text-xl font-bold text-white">
                  🎉 VIP Guest List Access!
                </h3>
                {proactiveGuestStatus.guestTitle && (
                  <p className="text-purple-200 text-sm font-medium">
                    Status: {proactiveGuestStatus.guestTitle}
                  </p>
                )}
              </div>
            </div>

            {proactiveGuestStatus.personalMessage && (
              <div className="bg-purple-800/30 rounded-lg p-4 border border-purple-500/20">
                <p className="text-purple-100 italic">
                  &quot;{proactiveGuestStatus.personalMessage}&quot;
                </p>
              </div>
            )}

            <div className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 rounded-lg p-4 border border-emerald-500/30">
              <h4 className="text-emerald-300 font-semibold mb-2">
                Your VIP Benefits:
              </h4>
              <ul className="text-emerald-100 text-sm space-y-1">
                <li>✨ No payment required - FREE admission</li>
                <li>🚪 Skip the regular entry line</li>
                <li>👑 VIP treatment throughout the event</li>
                <li>📧 Special QR code sent to your email</li>
              </ul>
            </div>

            <p className="text-center text-purple-200 text-sm">
              You&apos;re already on the VIP guest list! No need to request
              access.
            </p>
          </div>
        )}

      {/* Guest List Request Section - Only show if not already a proactive VIP guest */}
      {!proactiveGuestStatus.isProactiveGuest && !guestListState.hasRequest && (
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-6 mb-6 max-w-md">
          <div className="text-center">
            <Crown className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Want VIP Access?
            </h3>
            <p className="text-sm text-zinc-300 mb-4">
              Request to be added to the exclusive guest list for guaranteed
              entry and VIP treatment.
            </p>

            {!guestListState.showReason ? (
              <Button
                onClick={() =>
                  setGuestListState((prev) => ({ ...prev, showReason: true }))
                }
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
              >
                <Crown className="w-4 h-4 mr-2" />
                Request Guest List Access
              </Button>
            ) : (
              <div className="space-y-3">
                <textarea
                  placeholder="Why should you be on the guest list? (optional)"
                  value={guestListState.reason}
                  onChange={(e) =>
                    setGuestListState((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  className="w-full p-3 bg-black/40 border border-white/20 rounded-lg text-white placeholder-zinc-400 text-sm resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleGuestListRequest}
                    disabled={guestListState.isRequesting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                  >
                    {guestListState.isRequesting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Crown className="w-4 h-4 mr-2" />
                    )}
                    Submit Request
                  </Button>
                  <Button
                    onClick={() =>
                      setGuestListState((prev) => ({
                        ...prev,
                        showReason: false,
                        reason: "",
                      }))
                    }
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guest List Status Display */}
      {guestListState.hasRequest && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 max-w-md">
          <div className="text-center">
            {guestListState.status === "pending" && (
              <>
                <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Guest List Request Pending
                </h3>
                <p className="text-sm text-zinc-300">
                  Your request is being reviewed by the event organizer.
                  You&apos;ll receive an email with the decision.
                </p>
                <div className="text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full mt-3">
                  ⏳ Awaiting Review
                </div>
              </>
            )}

            {guestListState.status === "approved" && (
              <>
                <Crown className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  🎉 Welcome to the Guest List!
                </h3>
                <p className="text-sm text-zinc-300">
                  Congratulations! You&apos;ve been approved for VIP guest list
                  access. Check your email for your special QR code.
                </p>
                <div className="text-xs text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full mt-3">
                  ✅ VIP Guest List Confirmed
                </div>
              </>
            )}

            {guestListState.status === "rejected" && (
              <>
                <Crown className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Guest List Request Update
                </h3>
                <p className="text-sm text-zinc-300">
                  Your guest list request wasn&apos;t approved this time, but
                  you can still attend with your RSVP or purchase a ticket.
                </p>
                <div className="text-xs text-red-500 bg-red-500/10 px-3 py-1 rounded-full mt-3">
                  ❌ Not Approved
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Purchase CTA - shown when coming from registration */}
      {showPurchase && state?.eventId && (
        <div className="bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 rounded-xl p-6 mb-6 max-w-md">
          <div className="text-center">
            <ShoppingCart className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Want to secure your spot?
            </h3>
            <p className="text-sm text-zinc-300 mb-4">
              RSVP is free, but purchasing a ticket guarantees your attendance
              and supports the event.
            </p>
            <Link href={`/events/${state.eventId}/purchase`} className="w-full">
              <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500">
                Purchase Tickets
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      )}

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
