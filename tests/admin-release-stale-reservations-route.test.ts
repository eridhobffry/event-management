/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";

const SECRET = "test-secret-123";
process.env.ADMIN_CLEANUP_SECRET = SECRET;

// Stateful DB mock
let candidateIds: string[];
let ticketsCountByOrder: Record<string, number>;
let orderItemsByOrder: Record<string, Array<{ ticketTypeId: string; quantity: number }>>;
let orderStatusById: Record<string, string>;
let ticketTypeDecrementCount: number;

function makeThenable<T extends unknown[]>(data: T) {
  return {
    then: (resolve: (v: T) => void) => resolve(data),
    limit: async (n?: number) => (typeof n === "number" ? (data.slice(0, n) as T) : data),
  } as const;
}

function makeDbLike() {
  const db: Record<string, unknown> = {
    // initial scan for candidates
    select: (shape?: Record<string, unknown>) => ({
      from: () => ({
        where: () => {
          if (shape && Object.prototype.hasOwnProperty.call(shape, "id")) {
            return makeThenable(candidateIds.map((id) => ({ id })));
          }
          return makeThenable([] as unknown[]);
        },
      }),
    }),
    transaction: async <T>(cb: (tx: Record<string, unknown>) => Promise<T>) => {
      // Pop current candidate for this transaction
      const currentId = candidateIds.shift();
      const tx: Record<string, unknown> = {
        select: (shape?: Record<string, unknown>) => ({
          from: () => ({
            where: () => {
              if (shape && Object.prototype.hasOwnProperty.call(shape, "value")) {
                const value = currentId ? ticketsCountByOrder[currentId] ?? 0 : 0;
                return makeThenable([{ value }]);
              }
              if (
                shape &&
                Object.prototype.hasOwnProperty.call(shape, "ticketTypeId") &&
                Object.prototype.hasOwnProperty.call(shape, "quantity")
              ) {
                const rows = currentId ? orderItemsByOrder[currentId] ?? [] : [];
                return makeThenable(rows as unknown as unknown[]);
              }
              return makeThenable([] as unknown[]);
            },
          }),
        }),
        update: () => ({
          set: (patch: Record<string, unknown>) => ({
            where: async () => {
              if (Object.prototype.hasOwnProperty.call(patch, "quantitySold")) {
                ticketTypeDecrementCount += 1;
              }
              if (
                Object.prototype.hasOwnProperty.call(patch, "status") &&
                currentId
              ) {
                orderStatusById[currentId] = patch.status as string;
              }
            },
          }),
        }),
      };
      const result = await cb(tx);
      return result;
    },
  };
  return db as unknown as { [k: string]: unknown };
}

vi.mock("@/lib/db", () => {
  const db = makeDbLike();
  return { db };
});

async function callCleanup(params: URLSearchParams) {
  const { GET } = await import("@/app/api/admin/release-stale-reservations/route");
  const url = new URL("http://localhost/api/admin/release-stale-reservations");
  for (const [k, v] of params.entries()) url.searchParams.set(k, v);
  const req = new Request(url, { method: "GET" });
  return GET(req as unknown as Request);
}

describe("/api/admin/release-stale-reservations", () => {
  beforeEach(() => {
    candidateIds = [];
    ticketsCountByOrder = {};
    orderItemsByOrder = {};
    orderStatusById = {};
    ticketTypeDecrementCount = 0;
  });

  it("returns 401 when secret is missing or invalid", async () => {
    const res = await callCleanup(new URLSearchParams({ ttlMinutes: "30" }));
    expect(res.status).toBe(401);
  });

  it("releases a stale pending order with no tickets", async () => {
    candidateIds = ["o1"];
    ticketsCountByOrder = { o1: 0 };
    orderItemsByOrder = { o1: [ { ticketTypeId: "tt_1", quantity: 2 }, { ticketTypeId: "tt_2", quantity: 1 } ] };

    const res = await callCleanup(new URLSearchParams({ ttlMinutes: "15", secret: SECRET }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ ok: true, scanned: 1, released: 1, skipped: 0, ttlMinutes: 15 })
    );
    expect(ticketTypeDecrementCount).toBe(2);
    expect(orderStatusById.o1).toBe("failed");
  });

  it("skips release when tickets exist and still marks order failed", async () => {
    candidateIds = ["o2"];
    ticketsCountByOrder = { o2: 3 };

    const res = await callCleanup(new URLSearchParams({ ttlMinutes: "10", secret: SECRET }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ ok: true, scanned: 1, released: 0, skipped: 1, ttlMinutes: 10 })
    );
    expect(ticketTypeDecrementCount).toBe(0);
    expect(orderStatusById.o2).toBe("failed");
  });
});
