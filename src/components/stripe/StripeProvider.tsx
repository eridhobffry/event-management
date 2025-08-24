'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';

const StripePromiseContext = createContext<Promise<Stripe | null> | null>(null);

export function useStripePromise() {
  return useContext(StripePromiseContext);
}

export function StripeProvider({ children }: { children: React.ReactNode }) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/stripe/config', { cache: 'no-store' });
        const data = (await res.json()) as { publishableKey?: string };
        const key = data?.publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!key) return;
        if (!cancelled) setStripePromise(loadStripe(key));
      } catch (e) {
        console.error('StripeProvider: failed to load publishable key', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => stripePromise, [stripePromise]);

  return (
    <StripePromiseContext.Provider value={value}>
      {children}
    </StripePromiseContext.Provider>
  );
}
