/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Always authenticate as a user
vi.mock("@/stack", () => ({
  stackServerApp: { getUser: vi.fn().mockResolvedValue({ id: "org_1" }) },
}));

// Always allow rate limit in tests
vi.mock("@/lib/rate-limit", () => ({
  rateLimitKeyFromRequest: vi.fn(() => "test"),
  allowRequest: vi.fn(() => true),
}));

// Role authz defaults to elevated; can be overridden per-test
const isElevatedUser = vi.fn(async () => ({ ok: true, roles: ["organizer"] }));
const getUserRoleNames = vi.fn(async () => ["organizer"]);
vi.mock("@/lib/authz", () => ({
  isElevatedUser: (...args: unknown[]) => isElevatedUser(...args),
  getUserRoleNames: (...args: unknown[]) => getUserRoleNames(...args),
}));

// In-memory rows for fallback (no NEON_DATABASE_URL branch)

type TicketRow = {
  id: string;
  eventId: string;
  qrCodeToken: string;
  status: "issued" | "checked_in";
  checkedInAt: Date | null;
};

type GuestRow = {
  id: string;
  eventId: string;
  qrCodeToken: string;
  status: "active" | "archived";
  lastUsed: Date | null;
};

let ticketRows: TicketRow[] = [];
let guestRows: GuestRow[] = [];

vi.mock("@/lib/db", async () => {
  // dynamic import to avoid circulars (schema objects are not used here)
  const mod: any = {};
  return {
    db: {
      insert: () => ({ values: () => ({}) }), // swallow audit inserts
      update: () => ({
        set: (patch: Partial<TicketRow & GuestRow>) => ({
          where: () => {
            // For simplicity, update the only existing row in the relevant table in each test
            if (ticketRows.length) {
              ticketRows[0] = { ...ticketRows[0], ...(patch as Partial<TicketRow>) };
            }
            if (guestRows.length) {
              guestRows[0] = { ...guestRows[0], ...(patch as Partial<GuestRow>) };
            }
          },
        }),
      }),
      query: {
        tickets: {
          findMany: async () => ticketRows,
          findFirst: async () => ticketRows[0] || undefined,
        },
        proactiveGuestList: {
          findMany: async () => guestRows,
          findFirst: async () => guestRows[0] || undefined,
        },
      },
    },
  };
});

async function postJSON(body: unknown) {
  const { POST } = await import("@/app/api/check-in/route");
  const req = new Request("http://localhost/api/check-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req as unknown as Request);
}

describe("/api/check-in (unified)", () => {
  beforeEach(() => {
    ticketRows = [];
    guestRows = [];
    isElevatedUser.mockResolvedValue({ ok: true, roles: ["organizer"] });
    getUserRoleNames.mockResolvedValue(["organizer"]);
    vi.resetModules();
  });

  it("returns 400 on missing token", async () => {
    const res = await postJSON({});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual(expect.objectContaining({ ok: false, error: expect.stringContaining("Missing token") }));
  });

  it("returns friendly 404 when token not found", async () => {
    const res = await postJSON({ token: "TKT_does_not_exist" });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual(
      expect.objectContaining({ ok: false, error: expect.stringContaining("Token not found"), token: "TKT_does_not_exist" })
    );
  });

  it("checks in a ticket (one-way) and returns conflict on second try", async () => {
    ticketRows = [
      { id: "t1", eventId: "e1", qrCodeToken: "abc", status: "issued", checkedInAt: null },
    ];

    const res1 = await postJSON({ token: "TKT_abc" });
    expect(res1.status).toBe(200);
    const b1 = await res1.json();
    expect(b1).toEqual(
      expect.objectContaining({ ok: true, entityType: "ticket", ticketId: "t1", checkedInAt: expect.any(String) })
    );
    expect(ticketRows[0].status).toBe("checked_in");
    expect(ticketRows[0].checkedInAt).not.toBeNull();

    const res2 = await postJSON({ token: "TKT_abc" });
    expect(res2.status).toBe(409);
    const b2 = await res2.json();
    expect(b2).toEqual(expect.objectContaining({ ok: false, error: expect.stringContaining("Already checked in") }));
  });

  it("checks in a guest (one-way) and returns conflict on second try", async () => {
    guestRows = [
      { id: "g1", eventId: "e1", qrCodeToken: "xyz", status: "active", lastUsed: null },
    ];

    const res1 = await postJSON({ token: "GST_xyz" });
    expect(res1.status).toBe(200);
    const b1 = await res1.json();
    expect(b1).toEqual(
      expect.objectContaining({ ok: true, entityType: "guest", guestId: "g1", usedAt: expect.any(String) })
    );
    expect(guestRows[0].lastUsed).not.toBeNull();

    const res2 = await postJSON({ token: "GST_xyz" });
    expect(res2.status).toBe(409);
    const b2 = await res2.json();
    expect(b2).toEqual(expect.objectContaining({ ok: false, error: expect.stringContaining("Already used") }));
  });

  it("requires elevated role for ticket undo", async () => {
    // Not elevated
    isElevatedUser.mockResolvedValue({ ok: false, roles: ["staff"] });
    getUserRoleNames.mockResolvedValue(["staff"]);

    ticketRows = [
      { id: "t1", eventId: "e1", qrCodeToken: "abc", status: "checked_in", checkedInAt: new Date() },
    ];

    const res = await postJSON({ token: "TKT_abc", action: "undo", reason: "valid reason" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual(expect.objectContaining({ ok: false }));
  });
});
