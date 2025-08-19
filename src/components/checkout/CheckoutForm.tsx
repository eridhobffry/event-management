'use client';

import React, { useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { CreatePaymentIntentRequest, CreatePaymentIntentResponse, UITicketType } from '@/types/payments';
import { useStripePromise } from '@/components/stripe/StripeProvider';

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function PaymentStep() {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (err) {
      setError(err.message || 'Payment failed');
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setSuccess('Payment successful!');
    } else {
      setSuccess('Payment submitted.');
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'accordion' }} />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {submitting ? 'Processing…' : 'Pay now'}
      </button>
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

  const [email, setEmail] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = ticketTypes[0]?.currency ?? 'usd';
  const totalCents = useMemo(() => {
    return ticketTypes.reduce((sum, tt) => {
      const q = quantities[tt.id] || 0;
      return sum + tt.priceCents * q;
    }, 0);
  }, [quantities, ticketTypes]);

  function updateQuantity(id: string, value: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, Math.min(value, ticketTypes.find(t => t.id === id)?.available ?? 0)) }));
  }

  async function createPaymentIntent() {
    setCreating(true);
    setError(null);
    try {
      const items = Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

      if (!email) {
        setError('Please enter your email.');
        setCreating(false);
        return;
      }
      if (items.length === 0) {
        setError('Select at least one ticket.');
        setCreating(false);
        return;
      }

      const payload: CreatePaymentIntentRequest = { eventId, email, items };
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to create payment intent');
      }
      const data = (await res.json()) as CreatePaymentIntentResponse;
      setClientSecret(data.clientSecret);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(message);
    }
    setCreating(false);
  }

  const canContinue = totalCents > 0 && !!email && !clientSecret;

  return (
    <div className="space-y-6">
      {!clientSecret && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Tickets</h3>
            <div className="space-y-3">
              {ticketTypes.length === 0 && (
                <p className="text-sm">No tickets available.</p>
              )}
              {ticketTypes.map((tt) => (
                <div key={tt.id} className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{tt.name}</div>
                    <div className="text-sm text-gray-600">
                      {formatMoney(tt.priceCents, tt.currency)} · {tt.available} left
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={tt.available}
                    value={quantities[tt.id] || 0}
                    onChange={(e) => updateQuantity(tt.id, Number(e.target.value))}
                    className="w-20 border rounded px-2 py-1"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">Total</div>
            <div className="font-semibold">{formatMoney(totalCents, currency)}</div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="button"
            disabled={!canContinue || creating}
            onClick={createPaymentIntent}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {creating ? 'Preparing…' : 'Continue to payment'}
          </button>
        </div>
      )}

      {clientSecret && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentStep />
        </Elements>
      )}
    </div>
  );
}
