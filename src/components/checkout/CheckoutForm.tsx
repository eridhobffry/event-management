"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  UITicketType,
} from "@/types/payments";
import { useStripePromise } from "@/components/stripe/StripeProvider";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  buildCheckoutSchema,
  type CheckoutFormValues,
} from "@/components/checkout/checkout-schema";

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

// schema moved to '@/components/checkout/checkout-schema'

function PaymentStep({
  clientSecret,
  eventId,
  orderId,
  onBack,
}: {
  clientSecret: string;
  eventId: string;
  orderId?: string;
  onBack?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // When returning from redirect-based methods (e.g., PayPal), Stripe appends
  // payment_intent_client_secret to the URL. We set it above; here we fetch
  // the latest status to inform the user immediately.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!stripe || !clientSecret) return;
      try {
        const { paymentIntent } = await stripe.retrievePaymentIntent(
          clientSecret
        );
        if (!paymentIntent) return;
        if (cancelled) return;
        if (paymentIntent.status === "succeeded") {
          setSuccess("Payment successful!");
        } else if (paymentIntent.status === "processing") {
          setSuccess("Payment processing…");
        } else if (paymentIntent.status === "requires_payment_method") {
          setError("Payment failed. Please try another payment method.");
          try {
            const failureUrl = new URL(
              `/events/${eventId}/purchase/failure`,
              window.location.origin
            );
            if (orderId) failureUrl.searchParams.set("order_id", orderId);
            router.replace(failureUrl.toString());
          } catch {}
        }
      } catch (e) {
        // Non-fatal; user can retry submission
        console.warn("retrievePaymentIntent failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stripe, clientSecret, eventId, orderId, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    // Build a dedicated success URL to handle redirects from wallet methods like PayPal
    const successUrl = new URL(
      `/events/${eventId}/purchase/success`,
      window.location.origin
    );
    if (orderId) successUrl.searchParams.set("order_id", orderId);

    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      // Provide a return_url so wallet methods like PayPal can redirect back
      // to this page after authorization. Payment Element will only redirect
      // when required by the selected payment method.
      confirmParams: {
        return_url: successUrl.toString(),
      },
      redirect: "if_required",
    });
    if (err) {
      // Log for diagnostics
      console.error("confirmPayment error", { message: err.message });
      setError(err.message || "Payment failed");
      try {
        const failureUrl = new URL(
          `/events/${eventId}/purchase/failure`,
          window.location.origin
        );
        if (orderId) failureUrl.searchParams.set("order_id", orderId);
        router.replace(failureUrl.toString());
      } catch {}
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // For non-redirect methods, navigate to the success page directly
      try {
        router.replace(successUrl.toString());
      } catch {
        setSuccess("Payment successful!");
      }
    } else if (
      paymentIntent &&
      paymentIntent.status === "requires_payment_method"
    ) {
      try {
        const failureUrl = new URL(
          `/events/${eventId}/purchase/failure`,
          window.location.origin
        );
        if (orderId) failureUrl.searchParams.set("order_id", orderId);
        router.replace(failureUrl.toString());
      } catch {
        setError("Payment failed. Please try another payment method.");
      }
    } else {
      setSuccess("Payment submitted.");
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "accordion" }} />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!stripe || !elements || submitting}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {submitting ? "Processing…" : "Pay now"}
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="px-3 py-2 rounded border border-white/10 text-zinc-200"
          >
            Change selection
          </button>
        )}
      </div>
    </form>
  );
}

export function CheckoutForm({
  eventId,
  ticketTypes,
}: {
  eventId: string;
  ticketTypes: UITicketType[];
}) {
  const stripePromise = useStripePromise();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If redirected back from wallet flows (e.g., PayPal), Stripe will include
  // payment_intent_client_secret in the URL. Use it to rehydrate the PaymentElement
  // so we can show the final status automatically.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cs = params.get("payment_intent_client_secret");
    if (cs) {
      setClientSecret(cs);
      // Remove query params to keep the URL clean after hydration
      try {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } catch {}
    }
  }, []);

  const currency = ticketTypes[0]?.currency ?? "usd";
  // react-hook-form + Zod
  const formSchema = useMemo(
    () => buildCheckoutSchema(ticketTypes),
    [ticketTypes]
  );
  const defaultQuantities = useMemo(
    () => Object.fromEntries(ticketTypes.map((tt) => [tt.id, 0])),
    [ticketTypes]
  );

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(formSchema) as Resolver<CheckoutFormValues>,
    defaultValues: { email: "", quantities: defaultQuantities },
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const watchedQuantities = form.watch("quantities");
  const totalCents = useMemo(() => {
    return ticketTypes.reduce((sum, tt) => {
      const raw =
        (watchedQuantities as Record<string, unknown> | undefined)?.[tt.id] ??
        0;
      const q = Number(raw);
      return sum + tt.priceCents * (Number.isFinite(q) ? q : 0);
    }, 0);
  }, [watchedQuantities, ticketTypes]);

  async function createPaymentIntent(values: CheckoutFormValues) {
    setCreating(true);
    setError(null);
    try {
      const items = (
        Object.entries(values.quantities as Record<string, number>) as [
          string,
          number
        ][]
      )
        .filter(([, q]) => q > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

      const payload: CreatePaymentIntentRequest = {
        eventId,
        email: values.email,
        items,
      };
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create payment intent");
      }
      const data = (await res.json()) as CreatePaymentIntentResponse;
      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
    }
    setCreating(false);
  }

  const [creatingPayPal, setCreatingPayPal] = useState(false);

  async function createPayPalOrder(values: CheckoutFormValues) {
    setCreatingPayPal(true);
    setError(null);
    try {
      const items = (
        Object.entries(values.quantities as Record<string, number>) as [
          string,
          number
        ][]
      )
        .filter(([, q]) => q > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

      if (items.length === 0) {
        throw new Error("Please select at least one ticket");
      }

      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, email: values.email, items }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create PayPal order");
      }
      const data = (await res.json()) as {
        orderId: string;
        paypalOrderId: string;
        approvalUrl?: string;
      };
      setOrderId(data.orderId);
      if (data.approvalUrl) {
        // In mocked E2E mode, do not navigate away from the app. The test will
        // call the capture API directly and then navigate to the return URL.
        if (process.env.NEXT_PUBLIC_PAYPAL_E2E_MODE === "mock") {
          // no-op: keep current page for test control
        } else {
          window.location.assign(data.approvalUrl);
        }
      } else {
        throw new Error("Missing PayPal approval URL");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
    }
    setCreatingPayPal(false);
  }

  return (
    <div className="space-y-6">
      {!clientSecret && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(createPaymentIntent)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <h3 className="font-semibold">Tickets</h3>
              <div className="space-y-3">
                {ticketTypes.length === 0 && (
                  <p className="text-sm">No tickets available.</p>
                )}
                {ticketTypes.map((tt) => (
                  <FormField
                    key={tt.id}
                    control={form.control}
                    name={`quantities.${tt.id}` as const}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="font-medium">{tt.name}</div>
                            <div className="text-sm text-gray-600">
                              {formatMoney(tt.priceCents, tt.currency)} ·{" "}
                              {tt.available} left
                            </div>
                          </div>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={tt.available}
                              className="w-20"
                              value={field.value ?? 0}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              {form.formState.errors.quantities?.message && (
                <p className="text-red-600 text-sm">
                  {String(form.formState.errors.quantities?.message)}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Total</div>
              <div className="font-semibold">
                {formatMoney(totalCents, currency)}
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={!form.formState.isValid || creating || creatingPayPal}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {creating ? "Preparing…" : "Continue to payment"}
            </button>
            <button
              type="button"
              onClick={form.handleSubmit(createPayPalOrder)}
              disabled={!form.formState.isValid || creating || creatingPayPal}
              className="px-4 py-2 rounded border border-white/10 text-zinc-200 disabled:opacity-50"
            >
              {creatingPayPal ? "Redirecting…" : "Pay with PayPal"}
            </button>
          </form>
        </Form>
      )}

      {clientSecret && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentStep
            clientSecret={clientSecret}
            eventId={eventId}
            orderId={orderId ?? undefined}
            onBack={() => {
              setClientSecret(null);
              setOrderId(null);
            }}
          />
        </Elements>
      )}
    </div>
  );
}
