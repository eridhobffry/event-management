'use client';

import React from 'react';
import { StripeProvider } from '@/components/stripe/StripeProvider';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import type { UITicketType } from '@/types/payments';

export default function PurchaseClient({
  eventId,
  ticketTypes,
}: {
  eventId: string;
  ticketTypes: UITicketType[];
}) {
  return (
    <StripeProvider>
      <CheckoutForm eventId={eventId} ticketTypes={ticketTypes} />
    </StripeProvider>
  );
}
