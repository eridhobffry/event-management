"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PayPalReturnPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<string>("Finalizing your payment…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = params.get("token"); // PayPal returns order id as `token`
      if (!token) {
        setError("Missing PayPal token in return URL");
        setStatus("");
        return;
      }
      try {
        const res = await fetch("/api/paypal/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paypalOrderId: token }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          orderId?: string;
          eventId?: string;
          error?: string;
        };
        if (!res.ok || !data.ok) {
          throw new Error(data?.error || "Capture failed");
        }
        if (cancelled) return;
        if (data.eventId && data.orderId) {
          const url = new URL(`/events/${data.eventId}/purchase/success`, window.location.origin);
          url.searchParams.set("order_id", data.orderId);
          router.replace(url.toString());
        } else {
          setStatus("Payment completed");
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        setStatus("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold mb-4">PayPal</h1>
      {status && <p className="text-gray-700">{status}</p>}
      {error && (
        <div className="text-red-600">
          <p className="mb-2">{error}</p>
          <p>Please try again or choose another payment method.</p>
        </div>
      )}
    </div>
  );
}
