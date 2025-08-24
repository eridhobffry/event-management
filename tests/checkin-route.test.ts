/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth to always allow organizer access
vi.mock("@/stack", () => ({
  stackServerApp: { getUser: vi.fn().mockResolvedValue({ id: "org_1" }) },
}));

// Stateful DB mock for toggle behavior
type TicketRow = { id: string; checkedInAt: Date | null; status: "issued" | "checked_in" };
let notFound = false;
let row: TicketRow = { id: "t1", checkedInAt: null, status: "issued" };

vi.mock("@/lib/db", () => ({
  db: {
    select: (_shape?: unknown) => ({
      from: () => ({
        where: (_cond?: unknown) => ({
          limit: async (_n?: number) => (notFound ? [] : [{ id: row.id, checkedInAt: row.checkedInAt, status: row.status }]),
        }),
      }),
    }),
    update: (_table?: unknown) => ({
      set: (patch: Partial<TicketRow>) => ({
        where: async (_cond?: unknown) => {
          if (notFound) return;
          if (Object.prototype.hasOwnProperty.call(patch, "checkedInAt")) {
            row.checkedInAt = patch.checkedInAt ?? null;
          }
          if (Object.prototype.hasOwnProperty.call(patch, "status")) {
            row.status = (patch.status as TicketRow["status"]) ?? row.status;
          }
        },
      }),
    }),
  },
}));

async function postToken(token?: string) {
  const { POST } = await import("@/app/api/tickets/check-in/route");
  const url = new URL("http://localhost/api/tickets/check-in");
  if (token) url.searchParams.set("token", token);
  const req = new Request(url, { method: "POST" });
  return POST(req as unknown as Request);
}

describe("/api/tickets/check-in", () => {
  beforeEach(() => {
    notFound = false;
    row = { id: "t1", checkedInAt: null, status: "issued" };
  });

  it("returns 400 on missing token", async () => {
    const res = await postToken(undefined);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual(expect.objectContaining({ ok: false, error: expect.stringContaining("Missing token") }));
  });

  it("returns 404 when token not found", async () => {
    notFound = true;
    const res = await postToken("does-not-exist");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ ok: false });
  });

  it("toggles from issued -> checked_in and back", async () => {
    // First check-in
    const res1 = await postToken("tok_abc");
    expect(res1.status).toBe(200);
    const b1 = await res1.json();
    expect(b1).toEqual(
      expect.objectContaining({ ok: true, ticketId: row.id, checkedIn: true, checkedInAt: expect.any(String) })
    );
    // Ensure internal state reflected
    expect(row.status).toBe("checked_in");
    expect(row.checkedInAt).not.toBeNull();

    // Undo check-in
    const res2 = await postToken("tok_abc");
    expect(res2.status).toBe(200);
    const b2 = await res2.json();
    expect(b2).toEqual(
      expect.objectContaining({ ok: true, ticketId: row.id, checkedIn: false, checkedInAt: null })
    );
    expect(row.status).toBe("issued");
    expect(row.checkedInAt).toBeNull();
  });
});
