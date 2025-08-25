"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PayPalCancelPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState<string>("Releasing your reservation…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = params.get("token");
      try {
        if (!token) {
          setStatus("");
          setError("Missing PayPal token");
          return;
        }
        const res = await fetch(`/api/paypal/cancel?token=${encodeURIComponent(token)}`);
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          released?: boolean;
          error?: string;
        };
        if (!res.ok || data?.error) {
          throw new Error(data?.error || "Failed to release reservation");
        }
        if (cancelled) return;
        setStatus(data.released ? "Reservation released." : "Reservation already released or not found.");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Unknown error");
        setStatus("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold mb-2">Payment canceled</h1>
      <p className="text-gray-700 mb-4">You canceled the PayPal approval flow. No charges were made.</p>
      {status && <p className="text-gray-700 mb-2">{status}</p>}
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <Link href="/events" className="inline-block px-4 py-2 rounded bg-black text-white mt-2">
        Back to events
      </Link>
    </div>
  );
}
