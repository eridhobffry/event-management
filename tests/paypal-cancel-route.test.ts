/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Ensure mock mode is off for these tests so the route hits the DB mock
delete process.env.PAYPAL_E2E_MODE;
delete process.env.NEXT_PUBLIC_PAYPAL_E2E_MODE;

// Minimal stateful DB mock
let orderFound: boolean;
let orderStatus: "pending" | "paid" | "failed" | "canceled";
let ticketsCount: number;
let orderItemsRows: Array<{ ticketTypeId: string; quantity: number }>;
let ticketTypeUpdates = 0;

function makeDbLike() {
  const db: Record<string, unknown> = {
    select: (shape?: Record<string, unknown>) => ({
      from: () => ({
        where: () => ({
          limit: async (n?: number) => {
            // First lookup by paypalOrderId -> order id
            if (shape && Object.prototype.hasOwnProperty.call(shape, "id")) {
              return orderFound ? [{ id: "order_1" }] : [];
            }
            return [];
          },
        }),
      }),
    }),
    transaction: async <T>(cb: (tx: Record<string, unknown>) => Promise<T>) => {
      const tx: Record<string, unknown> = {
        select: (shape?: Record<string, unknown>) => ({
          from: () => ({
            where: () => {
              const data = (() => {
                if (shape && Object.prototype.hasOwnProperty.call(shape, "status")) {
                  return [{ status: orderStatus }];
                }
                if (shape && Object.prototype.hasOwnProperty.call(shape, "value")) {
                  return [{ value: ticketsCount }];
                }
                if (
                  shape &&
                  Object.prototype.hasOwnProperty.call(shape, "ticketTypeId") &&
                  Object.prototype.hasOwnProperty.call(shape, "quantity")
                ) {
                  return orderItemsRows;
                }
                return [] as unknown[];
              })();
              const thenable = {
                then: (resolve: (v: unknown[]) => void) => resolve(data),
                limit: async (n?: number) => (typeof n === "number" ? data.slice(0, n) : data),
              } as const;
              return thenable;
            },
          }),
        }),
        update: () => ({
          set: (patch: Record<string, unknown>) => ({
            where: (_cond?: unknown) => {
              // Count ticket type decrements
              if (Object.prototype.hasOwnProperty.call(patch, "quantitySold")) {
                ticketTypeUpdates += 1;
              }
              return {
                returning: async (_retShape?: unknown) => {
                  // Status transition with returning()
                  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
                    if (orderStatus === "pending") {
                      orderStatus = patch.status as typeof orderStatus;
                      return [{ id: "order_1" }];
                    }
                    return [] as Array<{ id: string }>;
                  }
                  return [] as Array<{ id: string }>;
                },
              };
            },
          }),
        }),
      };
      const result = await cb(tx);
      return result;
    },
    // For ticketTypes decrement updates without returning
    update: () => ({
      set: (_patch: Record<string, unknown>) => ({
        where: async (_cond?: unknown) => {
          ticketTypeUpdates += 1; // count how many ticket type rows were updated
        },
      }),
    }),
  };
  return db as unknown as { [k: string]: unknown };
}

vi.mock("@/lib/db", () => {
  const db = makeDbLike();
  return { db };
});

async function getCancel(query: URLSearchParams) {
  const { GET } = await import("@/app/api/paypal/cancel/route");
  const url = new URL("http://localhost/api/paypal/cancel");
  for (const [k, v] of query.entries()) url.searchParams.set(k, v);
  const req = new Request(url, { method: "GET" });
  return GET(req as unknown as Request);
}

describe("/api/paypal/cancel", () => {
  beforeEach(() => {
    orderFound = true;
    orderStatus = "pending";
    ticketsCount = 0;
    orderItemsRows = [
      { ticketTypeId: "tt_1", quantity: 2 },
      { ticketTypeId: "tt_2", quantity: 1 },
    ];
    ticketTypeUpdates = 0;
  });

  it("returns 400 when token is missing", async () => {
    const res = await getCancel(new URLSearchParams());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual(expect.objectContaining({ error: expect.stringMatching(/Missing token/i) }));
  });

  it("returns order_not_found when no order matches PayPal ID", async () => {
    orderFound = false;
    const res = await getCancel(new URLSearchParams({ token: "PAYPAL_ORDER_X" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, released: false, reason: "order_not_found" });
  });

  it("releases reservation and marks failed when pending with no tickets", async () => {
    ticketsCount = 0;
    const res = await getCancel(new URLSearchParams({ token: "PAYPAL_ORDER_OK" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(expect.objectContaining({ ok: true, released: true, orderId: "order_1" }));
    // Expect two ticket type decrements (for two order items)
    expect(ticketTypeUpdates).toBeGreaterThanOrEqual(2);
    expect(orderStatus).toBe("failed");
  });

  it("does nothing when order is already paid", async () => {
    orderStatus = "paid";
    const res = await getCancel(new URLSearchParams({ token: "PAYPAL_ORDER_OK" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(expect.objectContaining({ ok: true, released: false, orderId: "order_1" }));
    expect(ticketTypeUpdates).toBe(0);
    expect(orderStatus).toBe("paid");
  });
});
