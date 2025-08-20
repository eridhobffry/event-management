/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.STRIPE_SECRET_KEY = "sk_test_123";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,TEST") },
}));

vi.mock("stripe", () => ({
  default: class FakeStripe {
    webhooks = {
      constructEvent: (_raw: string, _sig: string, _secret: string) => ({
        id: "evt_2",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_2",
            status: "succeeded",
            currency: "eur",
            amount: 2000,
            metadata: { order_id: "order_2" },
          },
        },
      }),
    };
  },
}));

// Import mocked sendEmail for assertions
import { sendEmail } from "@/lib/email";
const mockedSendEmail = vi.mocked(sendEmail);

// Import the route statically so mocks are applied before module load
import { POST } from "@/app/api/stripe/webhooks/route";

type OrderRow = { id: string; status: "pending" | "paid"; eventId: string; email: string };
type EventRow = { name: string; date: Date; location: string };
type OrderItemRow = { ticketTypeId: string; quantity: number };

let orderRow: OrderRow = { id: "order_2", status: "pending", eventId: "evt_app_1", email: "buyer2@example.com" };
let eventRow: EventRow = { name: "Deep Event", date: new Date(), location: "Paris" };
let orderItemsRows: OrderItemRow[] = [{ ticketTypeId: "tt_1", quantity: 2 }];

function makeDbLike() {
  const db: Record<string, unknown> = {
    select: (shape?: Record<string, unknown>) => ({
      from: () => ({
        where: () => {
          const data = ((): any[] => {
            if (shape && "name" in shape && "date" in shape && "location" in shape) return [eventRow];
            return [{ ...orderRow }];
          })();
          const thenable: any = {
            then: (resolve: (v: any) => void) => resolve(data),
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
              const data = ((): any[] => {
                if (shape && "status" in shape) return [{ status: orderRow.status }];
                if (shape && Object.prototype.hasOwnProperty.call(shape, "value")) return [{ value: 0 }];
                if (shape && "ticketTypeId" in shape && "quantity" in shape) return orderItemsRows;
                return [{ ...orderRow }];
              })();
              const thenable: any = {
                then: (resolve: (v: any) => void) => resolve(data),
                limit: async (n?: number) => (typeof n === "number" ? data.slice(0, n) : data),
              };
              return thenable;
            },
          }),
        }),
        update: () => ({ set: (patch: Record<string, unknown>) => ({ where: async () => {
          if (Object.prototype.hasOwnProperty.call(patch, "status")) {
            orderRow.status = patch.status as OrderRow["status"];
          }
        } }) }),
        insert: () => ({ values: (vals: unknown[]) => ({ returning: async () => vals.map(() => ({ token: "tok" + Math.random().toString(36).slice(2, 6) })) }) }),
      };
      const result = await cb(tx);
      return result;
    },
  };
  return db as unknown as any;
}
vi.mock("@/lib/db", () => { const db = makeDbLike(); return { db } as unknown as any; });

async function postOnce() {
  const req = new Request("http://localhost/api/stripe/webhooks", { method: "POST", headers: { "stripe-signature": "sig_test" }, body: "raw-body" });
  const res = await POST(req as unknown as Request);
  return res;
}

describe("Stripe webhook deeper integration", () => {
  beforeEach(() => {
    mockedSendEmail.mockClear();
    // Reset shared test fixtures to avoid cross-test pollution
    orderRow = { id: "order_2", status: "pending", eventId: "evt_app_1", email: "buyer2@example.com" };
    eventRow = { name: "Deep Event", date: new Date(), location: "Paris" };
    orderItemsRows = [{ ticketTypeId: "tt_1", quantity: 2 }];
  });

  it("marks order paid and sends email with multiple ticket blocks", async () => {
    const res = await postOnce();
    expect(res.status).toBe(200);
    await res.json();
    expect(orderRow.status).toBe("paid");
    expect(mockedSendEmail).toHaveBeenCalledTimes(1);
    const arg = mockedSendEmail.mock.calls[0][0];
    expect(arg.to).toBe("buyer2@example.com");
    expect(arg.html).toContain("Ticket 1");
    expect(arg.html).toContain("Ticket 2");
    expect(arg.html).toContain("/api/tickets/check-in?token=");
  });
});
