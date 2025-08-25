import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proactiveGuestList, events } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { stackServerApp } from "@/stack";
import { sendProactiveGuestListNotification } from "@/lib/guest-list-notifications";

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Check if user owns the event
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event || event.createdBy !== user.id) {
      return NextResponse.json(
        { error: "Event not found or access denied" },
        { status: 404 }
      );
    }

    // Get proactive guest list for this event
    const guestList = await db.query.proactiveGuestList.findMany({
      where: eq(proactiveGuestList.eventId, eventId),
      orderBy: [desc(proactiveGuestList.createdAt)],
    });

    return NextResponse.json({
      success: true,
      guestList: guestList.map((guest) => ({
        ...guest,
        createdAt: guest.createdAt?.toISOString(),
        updatedAt: guest.updatedAt?.toISOString(),
        archivedAt: guest.archivedAt?.toISOString(),
        notificationSent: guest.notificationSent?.toISOString(),
        lastUsed: guest.lastUsed?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch proactive guest list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { eventId, guestEmail, guestName, guestTitle, personalMessage } =
      body;

    if (!eventId || !guestEmail || !guestName) {
      return NextResponse.json(
        { error: "Event ID, guest email, and guest name are required" },
        { status: 400 }
      );
    }

    // Check if user owns the event
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event || event.createdBy !== user.id) {
      return NextResponse.json(
        { error: "Event not found or access denied" },
        { status: 404 }
      );
    }

    // Check if guest already exists for this event
    const existingGuest = await db.query.proactiveGuestList.findFirst({
      where: and(
        eq(proactiveGuestList.eventId, eventId),
        eq(proactiveGuestList.guestEmail, guestEmail)
      ),
    });

    if (existingGuest) {
      return NextResponse.json(
        { error: "Guest already exists in this event's guest list" },
        { status: 409 }
      );
    }

    // Create proactive guest list entry
    const [newGuest] = await db
      .insert(proactiveGuestList)
      .values({
        eventId,
        guestEmail: guestEmail.toLowerCase(),
        guestName,
        guestTitle: guestTitle || null,
        personalMessage: personalMessage || null,
        addedBy: user.id,
      })
      .returning();

    // Send notification email
    try {
      await sendProactiveGuestListNotification({
        type: "added",
        guestEmail: newGuest.guestEmail,
        guestName: newGuest.guestName,
        eventName: event.name,
        eventId: event.id,
        eventDate: event.date || new Date(),
        guestTitle: newGuest.guestTitle,
        personalMessage: newGuest.personalMessage,
        qrCodeToken: newGuest.qrCodeToken,
      });

      await db
        .update(proactiveGuestList)
        .set({ notificationSent: new Date() })
        .where(eq(proactiveGuestList.id, newGuest.id));
    } catch (emailError) {
      console.error("Failed to send guest notification:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      guest: {
        ...newGuest,
        createdAt: newGuest.createdAt?.toISOString(),
        updatedAt: newGuest.updatedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to create proactive guest:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { guestId, guestName, guestTitle, personalMessage, status } = body;

    if (!guestId) {
      return NextResponse.json(
        { error: "Guest ID is required" },
        { status: 400 }
      );
    }

    // Get the guest and verify ownership
    const guest = await db.query.proactiveGuestList.findFirst({
      where: eq(proactiveGuestList.id, guestId),
      with: {
        event: true,
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const event = guest.event;

    if (!event || event.createdBy !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update the guest
    const [updatedGuest] = await db
      .update(proactiveGuestList)
      .set({
        guestName: guestName || guest.guestName,
        guestTitle: guestTitle !== undefined ? guestTitle : guest.guestTitle,
        personalMessage:
          personalMessage !== undefined
            ? personalMessage
            : guest.personalMessage,
        status: status || guest.status,
        updatedAt: new Date(),
      })
      .where(eq(proactiveGuestList.id, guestId))
      .returning();

    // Send update notification email
    try {
      await sendProactiveGuestListNotification({
        type: "updated",
        guestEmail: updatedGuest.guestEmail,
        guestName: updatedGuest.guestName,
        eventName: event.name,
        eventId: event.id,
        eventDate: event.date || new Date(),
        guestTitle: updatedGuest.guestTitle,
        personalMessage: updatedGuest.personalMessage,
        qrCodeToken: updatedGuest.qrCodeToken,
      });
    } catch (emailError) {
      console.error("Failed to send guest update notification:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      guest: {
        ...updatedGuest,
        createdAt: updatedGuest.createdAt?.toISOString(),
        updatedAt: updatedGuest.updatedAt?.toISOString(),
        archivedAt: updatedGuest.archivedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to update proactive guest:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get("guestId");
    const archive = searchParams.get("archive") === "true";

    if (!guestId) {
      return NextResponse.json(
        { error: "Guest ID is required" },
        { status: 400 }
      );
    }

    // Get the guest and verify ownership
    const guest = await db.query.proactiveGuestList.findFirst({
      where: eq(proactiveGuestList.id, guestId),
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, guest.eventId),
    });

    if (!event || event.createdBy !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (archive) {
      // Soft delete - archive the guest
      const [archivedGuest] = await db
        .update(proactiveGuestList)
        .set({
          status: "archived",
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(proactiveGuestList.id, guestId))
        .returning();

      // Send archived notification
      try {
        await sendProactiveGuestListNotification({
          type: "archived",
          guestEmail: archivedGuest.guestEmail,
          guestName: archivedGuest.guestName,
          eventName: event.name,
          eventId: event.id,
          eventDate: event.date || new Date(),
          guestTitle: archivedGuest.guestTitle,
          personalMessage: archivedGuest.personalMessage,
        });
      } catch (emailError) {
        console.error("Failed to send archive notification:", emailError);
      }

      return NextResponse.json({
        success: true,
        message: "Guest archived successfully",
      });
    } else {
      // Hard delete
      await db
        .delete(proactiveGuestList)
        .where(eq(proactiveGuestList.id, guestId));

      // Send removed notification
      try {
        await sendProactiveGuestListNotification({
          type: "removed",
          guestEmail: guest.guestEmail,
          guestName: guest.guestName,
          eventName: event.name,
          eventId: event.id,
          eventDate: event.date || new Date(),
          guestTitle: guest.guestTitle,
          personalMessage: guest.personalMessage,
        });
      } catch (emailError) {
        console.error("Failed to send removal notification:", emailError);
      }

      return NextResponse.json({
        success: true,
        message: "Guest removed successfully",
      });
    }
  } catch (error) {
    console.error("Failed to delete/archive proactive guest:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
