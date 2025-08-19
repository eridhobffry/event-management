// FE mirror types for Stripe payment flows, aligned with DB and API routes

export type OrderStatus = "pending" | "paid" | "failed";

export type CartItem = {
  ticketTypeId: string;
  quantity: number;
};

export type CreatePaymentIntentRequest = {
  eventId: string;
  email: string;
  items: CartItem[];
};

export type CreatePaymentIntentResponse = {
  orderId: string;
  clientSecret: string | null;
};

export type StripePublicConfig = {
  publishableKey: string;
  mode: "test" | "live";
};
