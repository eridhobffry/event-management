/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Ensure env is set before importing the module under test
process.env.STRIPE_SECRET_KEY = "sk_test_123";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// Mocks
const sendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email", () => ({ sendEmail }));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,TEST"),
  },
}));

const constructEvent = vi.fn(() => ({
  id: "evt_1",
  type: "payment_intent.succeeded",
  data: {
    object: {
      id: "pi_1",
      status: "succeeded",
      currency: "eur",
      amount: 1000,
      metadata: { order_id: "order_1" },
    },
  },
}));
class FakeStripe {
  webhooks = { constructEvent };
}
vi.mock("stripe", () => ({ default: FakeStripe }));

// Minimal DB mock with idempotent transaction behavior
let orderStatus: "pending" | "paid" = "pending";
const orderRow = {
  id: "order_1",
  status: orderStatus,
  eventId: "evt_app_1",
  email: "buyer@example.com",
};
const eventRow = { name: "Sample Event", date: new Date(), location: "Berlin" };
const orderItemsRows = [{ ticketTypeId: "tt_1", quantity: 2 }];

type OrderStatus = "pending" | "paid";
type OrderRow = { id: string; status: OrderStatus; eventId: string; email: string };
type EventRow = { name: string; date: Date; location: string };
type OrderItemRow = { ticketTypeId: string; quantity: number };

type QueryRow = EventRow | OrderRow | { status: OrderStatus } | { value: number } | OrderItemRow;
type QueryResult = QueryRow[];
type ThenableArray = {
  then: (resolve: (v: QueryResult) => void) => void;
  limit: (n?: number) => Promise<QueryResult>;
};

function makeDbLike() {
  const db: Record<string, unknown> = {
    select: (shape?: Record<string, unknown>) => ({
      from: () => ({
        where: () => {
          const data: QueryResult = (() => {
            if (shape && "name" in shape && "date" in shape && "location" in shape) {
              return [eventRow];
            }
            return [{ ...(orderRow as OrderRow), status: orderStatus }];
          })();
          const thenable: ThenableArray = {
            then: (resolve) => resolve(data),
            limit: async (n?: number) => (typeof n === "number" ? data.slice(0, n) : data),
          };
          return thenable;
        },
      }),
    }),
    transaction: async <T>(cb: (tx: Record<string, unknown>) => Promise<T>) => {
      const tx: Record<string, unknown> = {
        select: (shape?: Record<string, unknown>) => ({
          from: () => ({
            where: () => {
              const data: QueryResult = (() => {
                if (shape && "status" in shape) return [{ status: orderStatus }];
                if (shape && Object.prototype.hasOwnProperty.call(shape, "value")) return [{ value: 0 }];
                if (shape && "ticketTypeId" in shape && "quantity" in shape) return orderItemsRows;
                return [{ ...(orderRow as OrderRow), status: orderStatus }];
              })();
              const thenable: ThenableArray = {
                then: (resolve) => resolve(data),
                limit: async (n?: number) => (typeof n === "number" ? data.slice(0, n) : data),
              };
              return thenable;
            },
          }),
        }),
        update: () => ({ set: (patch: Record<string, unknown>) => ({ where: async () => {
          if (Object.prototype.hasOwnProperty.call(patch, "status")) {
            orderStatus = patch.status as OrderStatus;
          }
        } }) }),
        insert: () => ({ values: (vals: unknown[]) => ({ returning: async (): Promise<Array<{ token: string }>> => vals.map(() => ({ token: "tok" + Math.random().toString(36).slice(2, 6) })) }) }),
      };
      const result = await cb(tx);
      return result;
    },
    update: () => ({ set: () => ({ where: async () => void 0 }) }),
    insert: () => ({ values: () => ({ returning: async (): Promise<Array<{ token: string }>> => [{ token: "tokA" }, { token: "tokB" }] }) }),
  };
  return db as unknown as Record<string, unknown>;
}
vi.mock("@/lib/db", () => {
  const db = makeDbLike();
  const mod: { db: Record<string, unknown> } = { db };
  return mod;
});

async function postOnce() {
  const { POST } = await import("@/app/api/stripe/webhooks/route");
  const req = new Request("http://localhost/api/stripe/webhooks", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: "raw-body",
  });
  const res = await POST(req as unknown as Request);
  return res;
}

describe("Stripe webhook idempotency", () => {
  beforeEach(() => {
    // reset only call counts; preserve idempotency state across calls within the test
    sendEmail.mockClear();
  });

  it("sends email only when tickets are newly created (first call only)", async () => {
    const res1 = await postOnce();
    expect(res1.status).toBe(200);
    await res1.json();
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const res2 = await postOnce();
    expect(res2.status).toBe(200);
    await res2.json();
    // still exactly once after second call
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
