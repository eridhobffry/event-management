import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets, proactiveGuestList, checkInAudit } from "@/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { stackServerApp } from "@/stack";
import { extractUnifiedToken, classifyToken } from "@/lib/token";
import { allowRequest, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { isElevatedUser, getUserRoleNames } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function friendly404(token: string) {
  return NextResponse.json(
    {
      ok: false,
      error: "Token not found",
      guidance:
        "Ensure the QR belongs to this event. Try manual entry or check the token prefix (TKT_/GST_).",
      token,
    },
    { status: 404 }
  );
}

async function findTicketByToken(rawToken: string) {
  if (process.env.NEON_DATABASE_URL) {
    const [row] = await db
      .select({ id: tickets.id, checkedInAt: tickets.checkedInAt, eventId: tickets.eventId, status: tickets.status })
      .from(tickets)
      .where(eq(tickets.qrCodeToken, rawToken))
      .limit(1);
    return row ?? null;
  }
  // Fallback mock path
  type MockTicket = {
    id: string;
    eventId: string;
    qrCodeToken: string;
    status: "issued" | "checked_in";
    checkedInAt: Date | null;
  };
  const mockDb = db as unknown as {
    query: { tickets: { findMany: () => Promise<MockTicket[]> } };
  };
  const all = await mockDb.query.tickets.findMany();
  return all.find((t) => t.qrCodeToken === rawToken) ?? null;
}

async function findGuestByToken(rawToken: string) {
  if (process.env.NEON_DATABASE_URL) {
    const [row] = await db
      .select({ id: proactiveGuestList.id, lastUsed: proactiveGuestList.lastUsed, eventId: proactiveGuestList.eventId, status: proactiveGuestList.status })
      .from(proactiveGuestList)
      .where(eq(proactiveGuestList.qrCodeToken, rawToken))
      .limit(1);
    return row ?? null;
  }
  type MockGuest = {
    id: string;
    eventId: string;
    qrCodeToken: string;
    status?: "active" | "archived";
    lastUsed: Date | null;
  };
  const mockDb = db as unknown as {
    query: { proactiveGuestList: { findMany: () => Promise<MockGuest[]> } };
  };
  const all = await mockDb.query.proactiveGuestList.findMany();
  return all.find((g) => g.qrCodeToken === rawToken) ?? null;
}

async function audit(params: {
  eventId: string;
  entityType: "ticket" | "guest";
  entityId: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: "check_in" | "undo";
  reason?: string | null;
  source?: string | null;
}) {
  try {
    await db.insert(checkInAudit).values({
      eventId: params.eventId,
      entityType: params.entityType,
      entityId: params.entityId,
      actorUserId: params.actorUserId ?? null,
      actorRole: params.actorRole ?? null,
      action: params.action,
      reason: params.reason ?? null,
      source: params.source ?? null,
    });
  } catch {
    // swallow audit failures
  }
}

export async function POST(req: Request) {
  // Auth
  const user = await stackServerApp.getUser({ or: "redirect" });
  const userId = (user as unknown as { id?: string } | null)?.id ?? null;
  const userRoles = await getUserRoleNames(userId || "");

  // Rate limit
  const key = rateLimitKeyFromRequest(req);
  if (!allowRequest(key)) {
    return new NextResponse(
      JSON.stringify({ ok: false, error: "Rate limited. Please retry shortly." }),
      { status: 429, headers: { "Retry-After": "2", "Content-Type": "application/json" } }
    );
  }

  // Parse body
  type CheckInRequestBody = {
    token?: string;
    qr?: string;
    code?: string;
    action?: "undo" | "check_in";
    reason?: string;
    source?: string;
    manual?: boolean;
  };
  let body: CheckInRequestBody | null = null;
  try {
    body = (await req.json()) as CheckInRequestBody;
  } catch {}
  const rawInput: string | undefined = body?.token ?? body?.qr ?? body?.code;
  const tokenInput = rawInput ? extractUnifiedToken(String(rawInput)) : null;
  if (!tokenInput) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  }
  const action: "check_in" | "undo" = body?.action === "undo" ? "undo" : "check_in";
  const reason: string | undefined = body?.reason;
  const source: string | undefined = body?.source || (body?.manual ? "manual" : "scanner");

  const { kind, value } = classifyToken(tokenInput);

  // Resolve entity
  type TicketEntity = { id: string; eventId: string; checkedInAt: Date | null; status?: string };
  type GuestEntity = { id: string; eventId: string; lastUsed: Date | null; status?: string };
  let entity: TicketEntity | GuestEntity | null = null;
  let entityType: "ticket" | "guest" | null = null;

  if (kind === "ticket" || kind === "unknown") {
    const t = await findTicketByToken(value);
    if (t) {
      entity = t;
      entityType = "ticket";
    }
  }
  if (!entity && (kind === "guest" || kind === "unknown")) {
    const g = await findGuestByToken(value);
    if (g) {
      entity = g;
      entityType = "guest";
    }
  }

  if (!entity || !entityType) {
    return friendly404(tokenInput);
  }

  // Handle actions
  const now = new Date();
  if (entityType === "ticket") {
    const ticket = entity as TicketEntity;
    if (action === "undo") {
      const elev = await isElevatedUser(userId || "");
      if (!elev.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "Undo not permitted for your role. Contact an organizer.",
            roles: userRoles,
          },
          { status: 403 }
        );
      }
      if (!reason || String(reason).trim().length < 5) {
        return NextResponse.json(
          { ok: false, error: "Reason required (min 5 chars) for undo." },
          { status: 400 }
        );
      }
      // Only undo if currently checked in
      if (process.env.NEON_DATABASE_URL) {
        await db
          .update(tickets)
          .set({ checkedInAt: null, status: "issued" })
          .where(and(eq(tickets.id, ticket.id), isNotNull(tickets.checkedInAt)));
      } else {
        await db.update(tickets).set({ checkedInAt: null, status: "issued" }).where(eq(tickets.id, ticket.id));
      }
      await audit({
        eventId: ticket.eventId,
        entityType: "ticket",
        entityId: ticket.id,
        actorUserId: userId,
        actorRole: userRoles.join(","),
        action: "undo",
        reason: reason || null,
        source: source || null,
      });
      return NextResponse.json({ ok: true, entityType: "ticket", ticketId: ticket.id, undone: true });
    }
    // check_in path
    if (ticket.checkedInAt) {
      return NextResponse.json(
        { ok: false, error: "Already checked in", ticketId: ticket.id },
        { status: 409 }
      );
    }
    let applied = true;
    if (process.env.NEON_DATABASE_URL) {
      const res = await db
        .update(tickets)
        .set({ checkedInAt: now, status: "checked_in" })
        .where(and(eq(tickets.id, ticket.id), isNull(tickets.checkedInAt)))
        .returning({ id: tickets.id, checkedInAt: tickets.checkedInAt });
      applied = res.length > 0;
    } else {
      await db.update(tickets).set({ checkedInAt: now, status: "checked_in" }).where(eq(tickets.id, ticket.id));
    }
    if (!applied) {
      return NextResponse.json(
        { ok: false, error: "Already checked in", ticketId: ticket.id },
        { status: 409 }
      );
    }
    await audit({
      eventId: ticket.eventId,
      entityType: "ticket",
      entityId: ticket.id,
      actorUserId: userId,
      actorRole: userRoles.join(","),
      action: "check_in",
      source: source || null,
    });
    return NextResponse.json({ ok: true, entityType: "ticket", ticketId: ticket.id, checkedInAt: now.toISOString() });
  }

  // Guest entity
  if (entityType === "guest") {
    const guest = entity as GuestEntity;
    if (action === "undo") {
      const elev = await isElevatedUser(userId || "");
      if (!elev.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "Undo not permitted for your role. Contact an organizer.",
            roles: userRoles,
          },
          { status: 403 }
        );
      }
      if (!reason || String(reason).trim().length < 5) {
        return NextResponse.json(
          { ok: false, error: "Reason required (min 5 chars) for undo." },
          { status: 400 }
        );
      }
      if (process.env.NEON_DATABASE_URL) {
        await db
          .update(proactiveGuestList)
          .set({ lastUsed: null })
          .where(and(eq(proactiveGuestList.id, guest.id), isNotNull(proactiveGuestList.lastUsed)));
      } else {
        await db.update(proactiveGuestList).set({ lastUsed: null }).where(eq(proactiveGuestList.id, guest.id));
      }
      await audit({
        eventId: guest.eventId,
        entityType: "guest",
        entityId: guest.id,
        actorUserId: userId,
        actorRole: userRoles.join(","),
        action: "undo",
        reason: reason || null,
        source: source || null,
      });
      return NextResponse.json({ ok: true, entityType: "guest", guestId: guest.id, undone: true });
    }

    if (guest.status && guest.status !== "active") {
      return NextResponse.json(
        { ok: false, error: `Guest entry is ${guest.status} and cannot be used` },
        { status: 409 }
      );
    }
    if (guest.lastUsed) {
      return NextResponse.json(
        { ok: false, error: "Already used", guestId: guest.id },
        { status: 409 }
      );
    }
    let applied = true;
    if (process.env.NEON_DATABASE_URL) {
      const res = await db
        .update(proactiveGuestList)
        .set({ lastUsed: now })
        .where(and(eq(proactiveGuestList.id, guest.id), isNull(proactiveGuestList.lastUsed)))
        .returning({ id: proactiveGuestList.id, lastUsed: proactiveGuestList.lastUsed });
      applied = res.length > 0;
    } else {
      await db.update(proactiveGuestList).set({ lastUsed: now }).where(eq(proactiveGuestList.id, guest.id));
    }
    if (!applied) {
      return NextResponse.json(
        { ok: false, error: "Already used", guestId: guest.id },
        { status: 409 }
      );
    }
    await audit({
      eventId: guest.eventId,
      entityType: "guest",
      entityId: guest.id,
      actorUserId: userId,
      actorRole: userRoles.join(","),
      action: "check_in",
      source: source || null,
    });
    return NextResponse.json({ ok: true, entityType: "guest", guestId: guest.id, usedAt: now.toISOString() });
  }

  return NextResponse.json({ ok: false, error: "Unhandled" }, { status: 500 });
}
