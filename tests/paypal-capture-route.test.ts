/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Ensure mock mode is off so the route executes full flow
delete process.env.PAYPAL_E2E_MODE;
delete process.env.NEXT_PUBLIC_PAYPAL_E2E_MODE;
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// Mocks for side effects
const sendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email", () => ({ sendEmail }));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,QRTEST"),
  },
}));

// Mock PayPal helpers
vi.mock("@/lib/paypal", () => ({
  getPayPalAccessToken: vi.fn().mockResolvedValue("access_token_123"),
  getPayPalApiBase: vi.fn().mockReturnValue("https://api.test"),
}));

// Stateful DB mock
let orderStatus: "pending" | "paid" = "pending";
const orderRow = {
  id: "order_1",
  status: orderStatus,
  eventId: "evt_app_1",
  email: "buyer@example.com",
};
const eventRow = { name: "Sample Event", date: new Date(), location: "Berlin" };
const orderItemsRows = [
  { ticketTypeId: "tt_1", quantity: 2 },
  { ticketTypeId: "tt_2", quantity: 1 },
];

// Simple Thenable for Drizzle-like chaining
function makeThenable<T extends unknown[]>(data: T) {
  return {
    then: (resolve: (v: T) => void) => resolve(data),
    limit: async (n?: number) => (typeof n === "number" ? (data.slice(0, n) as T) : data),
  } as const;
}

function makeDbLike() {
  const db: Record<string, unknown> = {
    select: (shape?: Record<string, unknown>) => ({
      from: () => ({
        where: () => {
          // Initial order fetch by id and later event fetch
          if (shape && "name" in shape && "date" in shape && "location" in shape) {
            return makeThenable([eventRow]);
          }
          return makeThenable([{ ...orderRow, status: orderStatus }]);
        },
      }),
    }),
    transaction: async <T>(cb: (tx: Record<string, unknown>) => Promise<T>) => {
      const tx: Record<string, unknown> = {
        select: (shape?: Record<string, unknown>) => ({
          from: () => ({
            where: () => {
              if (shape && "status" in shape) return makeThenable([{ status: orderStatus }]);
              if (shape && Object.prototype.hasOwnProperty.call(shape, "value")) return makeThenable([{ value: 0 }]);
              if (shape && "ticketTypeId" in shape && "quantity" in shape) return makeThenable(orderItemsRows as unknown as unknown[]);
              return makeThenable([{ ...orderRow, status: orderStatus }]);
            },
          }),
        }),
        update: () => ({ set: (patch: Record<string, unknown>) => ({ where: () => ({ returning: async () => {
          if (Object.prototype.hasOwnProperty.call(patch, "status")) {
            if (orderStatus === "pending") orderStatus = patch.status as typeof orderStatus;
            return [{ id: orderRow.id }];
          }
          return [] as Array<{ id: string }>;
        } }) }) }),
        insert: () => ({
          values: (vals: Array<unknown>) => ({ returning: async () => vals.map(() => ({ token: "tok" + Math.random().toString(36).slice(2, 6) })) }),
        }),
      };
      const result = await cb(tx);
      return result;
    },
  };
  return db as unknown as Record<string, unknown>;
}

vi.mock("@/lib/db", () => {
  const db = makeDbLike();
  return { db };
});

// Mock fetch for PayPal APIs: first GET order details, then POST capture
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  if (url.endsWith("/v2/checkout/orders/PAYPAL_X")) {
    return new Response(JSON.stringify({
      status: "APPROVED",
      purchase_units: [{ reference_id: "order_1" }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (url.endsWith("/v2/checkout/orders/PAYPAL_X/capture") && init?.method === "POST") {
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response("not found", { status: 404 });
});
vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

async function captureOnce() {
  const { POST } = await import("@/app/api/paypal/capture/route");
  const req = new Request("http://localhost/api/paypal/capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ paypalOrderId: "PAYPAL_X" }),
  });
  return POST(req as unknown as Request);
}

describe("PayPal capture route happy path", () => {
  beforeEach(() => {
    sendEmail.mockClear();
    orderStatus = "pending";
    fetchMock.mockClear();
  });

  it("captures, issues tickets once, marks order paid, and sends email", async () => {
    const res = await captureOnce();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(expect.objectContaining({ ok: true, orderId: "order_1", eventId: "evt_app_1" }));

    // We should have called fetch twice: details + capture
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Status should be paid after tx
    expect(orderStatus).toBe("paid");

    // Email sent once with 3 QR codes
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const arg = sendEmail.mock.calls[0][0];
    expect(arg.to).toBe("buyer@example.com");
  });
});
