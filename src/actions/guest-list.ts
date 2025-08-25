"use server";

import { db } from "@/lib/db";
import {
  guestListRequests,
  proactiveGuestList,
  events,
  attendees,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { stackServerApp } from "@/stack";
import {
  sendGuestListRequestNotification,
  sendGuestListApprovalNotification,
  sendGuestListRejectionNotification,
  sendProactiveGuestListNotification,
} from "@/lib/guest-list-notifications";
import { revalidatePath } from "next/cache";

// Types for server actions
export interface CreateGuestListRequestParams {
  attendeeId: string;
  reason?: string;
}

export interface RespondToGuestListRequestParams {
  requestId: string;
  action: "approve" | "reject";
  reviewNotes?: string;
}

export interface CreateProactiveGuestParams {
  eventId: string;
  guestEmail: string;
  guestName: string;
  guestTitle?: string;
  personalMessage?: string;
}

export interface UpdateProactiveGuestParams {
  guestId: string;
  guestName?: string;
  guestTitle?: string;
  personalMessage?: string;
  status?: string;
}

export interface CheckProactiveGuestParams {
  eventId: string;
  email: string;
}

// Guest List Request Actions

/**
 * Create a new guest list request
 */
export async function createGuestListRequest(
  params: CreateGuestListRequestParams
) {
  try {
    const { attendeeId, reason } = params;

    // Get attendee details
    const attendee = await db.query.attendees.findFirst({
      where: eq(attendees.id, attendeeId),
    });

    if (!attendee) {
      return { error: "Attendee not found" };
    }

    // Get event details
    const event = await db.query.events.findFirst({
      where: eq(events.id, attendee.eventId),
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Check if request already exists (mock DB compatibility)
    const existingList = await db.query.guestListRequests.findMany();
    const existingRequest = existingList.find(
      (r) => r.attendeeId === attendeeId && r.eventId === attendee.eventId
    );

    if (existingRequest) {
      return {
        error: "Guest list request already exists",
        status: existingRequest.status,
      };
    }

    // Create guest list request
    const [newRequest] = await db
      .insert(guestListRequests)
      .values({
        eventId: attendee.eventId,
        attendeeId: attendeeId,
        requesterEmail: attendee.email,
        requesterName: attendee.name,
        reason: reason || null,
      })
      .returning();

    // Send notification to event organizer
    if (event.createdBy) {
      try {
        const organizer = await db.query.users.findFirst({
          where: eq(users.id, event.createdBy),
        });

        if (organizer?.email) {
          await sendGuestListRequestNotification({
            organizerEmail: organizer.email,
            eventName: event.name,
            eventId: event.id,
            requesterName: attendee.name,
            requesterEmail: attendee.email,
            reason: reason || "No reason provided",
            requestId: newRequest.id,
          });
        }
      } catch (emailError) {
        console.error("Failed to send organizer notification:", emailError);
      }
    }

    revalidatePath("/dashboard/guest-list");
    return {
      success: true,
      requestId: newRequest.id,
      status: newRequest.status,
    };
  } catch (error) {
    console.error("Failed to create guest list request:", error);
    return { error: "Failed to create guest list request" };
  }
}

/**
 * Respond to a guest list request (approve or reject)
 */
export async function respondToGuestListRequest(
  params: RespondToGuestListRequestParams
) {
  try {
    const { requestId, action, reviewNotes } = params;

    // Get current user (organizer)
    const user = await stackServerApp.getUser();
    if (!user) {
      return { error: "Authentication required" };
    }

    // Get the guest list request
    const guestRequest = await db.query.guestListRequests.findFirst({
      where: eq(guestListRequests.id, requestId),
    });

    if (!guestRequest) {
      return { error: "Guest list request not found" };
    }

    // Get event to verify organizer permissions
    const event = await db.query.events.findFirst({
      where: eq(events.id, guestRequest.eventId),
    });

    if (!event || event.createdBy !== user.id) {
      return { error: "Not authorized to respond to this request" };
    }

    // Update request status
    const status = action === "approve" ? "approved" : "rejected";
    const [updatedRequest] = await db
      .update(guestListRequests)
      .set({
        status,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      })
      .where(eq(guestListRequests.id, requestId))
      .returning();

    // Send response email to requester
    try {
      if (action === "approve") {
        await sendGuestListApprovalNotification({
          requesterEmail: guestRequest.requesterEmail,
          requesterName: guestRequest.requesterName,
          eventName: event.name,
          eventId: event.id,
          eventDate: event.date || new Date(),
          qrCodeToken: updatedRequest.qrCodeToken!,
          reviewNotes,
        });
      } else {
        await sendGuestListRejectionNotification({
          requesterEmail: guestRequest.requesterEmail,
          requesterName: guestRequest.requesterName,
          eventName: event.name,
          eventId: event.id,
          reviewNotes,
        });
      }
    } catch (emailError) {
      console.error("Failed to send response email:", emailError);
    }

    revalidatePath("/dashboard/guest-list");
    return {
      success: true,
      status: updatedRequest.status,
      reviewedAt: updatedRequest.reviewedAt,
    };
  } catch (error) {
    console.error("Failed to respond to guest list request:", error);
    return { error: "Failed to respond to guest list request" };
  }
}

/**
 * Get guest list requests for organizer
 */
export async function getGuestListRequests(eventId?: string) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { error: "Authentication required" };
    }

    // In-memory join/filter compatible with mock DB
    const allEvents = await db.query.events.findMany();
    const organizerEvents = allEvents.filter(
      (e) => e.createdBy === user.id && (!eventId || e.id === eventId)
    );
    const organizerEventIds = new Set(organizerEvents.map((e) => e.id));

    const allRequests = await db.query.guestListRequests.findMany();
    const filtered = allRequests
      .filter((r) => organizerEventIds.has(r.eventId))
      .sort((a, b) =>
        new Date(b.requestedAt || 0).getTime() -
        new Date(a.requestedAt || 0).getTime()
      )
      .map((r) => {
        const ev = organizerEvents.find((e) => e.id === r.eventId);
        return {
          id: r.id,
          eventId: r.eventId,
          eventName: ev?.name,
          eventDate: ev?.date,
          requesterName: r.requesterName,
          requesterEmail: r.requesterEmail,
          reason: r.reason,
          status: r.status,
          requestedAt: r.requestedAt,
          reviewedAt: r.reviewedAt,
          reviewNotes: r.reviewNotes,
        };
      });

    return { success: true, requests: filtered };
  } catch (error) {
    console.error("Failed to fetch guest list requests:", error);
    return { error: "Failed to fetch guest list requests" };
  }
}

// Proactive Guest List Actions

/**
 * Create a proactive guest list entry
 */
export async function createProactiveGuest(params: CreateProactiveGuestParams) {
  try {
    const { eventId, guestEmail, guestName, guestTitle, personalMessage } =
      params;

    const user = await stackServerApp.getUser();
    if (!user) {
      return { error: "Authentication required" };
    }

    // Check if user owns the event
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event || event.createdBy !== user.id) {
      return { error: "Event not found or access denied" };
    }

    // Check if guest already exists for this event (mock DB compatibility)
    const allGuests = await db.query.proactiveGuestList.findMany();
    const existingGuest = allGuests.find(
      (g) =>
        g.eventId === eventId && g.guestEmail === guestEmail.toLowerCase()
    );

    if (existingGuest) {
      return { error: "Guest already exists in this event's guest list" };
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
    }

    revalidatePath("/dashboard/guest-list");
    return { success: true, guest: newGuest };
  } catch (error) {
    console.error("Failed to create proactive guest:", error);
    return { error: "Failed to create proactive guest" };
  }
}

/**
 * Update a proactive guest list entry
 */
export async function updateProactiveGuest(params: UpdateProactiveGuestParams) {
  try {
    const { guestId, guestName, guestTitle, personalMessage, status } = params;

    const user = await stackServerApp.getUser();
    if (!user) {
      return { error: "Authentication required" };
    }

    // Get the guest and verify ownership
    const guest = await db.query.proactiveGuestList.findFirst({
      where: eq(proactiveGuestList.id, guestId),
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, guest.eventId),
    });

    if (!event || event.createdBy !== user.id) {
      return { error: "Access denied" };
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
    }

    revalidatePath("/dashboard/guest-list");
    return { success: true, guest: updatedGuest };
  } catch (error) {
    console.error("Failed to update proactive guest:", error);
    return { error: "Failed to update proactive guest" };
  }
}

/**
 * Delete or archive a proactive guest list entry
 */
export async function deleteProactiveGuest(guestId: string, archive = false) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { error: "Authentication required" };
    }

    // Get the guest and verify ownership
    const guest = await db.query.proactiveGuestList.findFirst({
      where: eq(proactiveGuestList.id, guestId),
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, guest.eventId),
    });

    if (!event || event.createdBy !== user.id) {
      return { error: "Access denied" };
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

      revalidatePath("/dashboard/guest-list");
      return { success: true, message: "Guest archived successfully" };
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

      revalidatePath("/dashboard/guest-list");
      return { success: true, message: "Guest removed successfully" };
    }
  } catch (error) {
    console.error("Failed to delete/archive proactive guest:", error);
    return { error: "Failed to delete/archive proactive guest" };
  }
}

/**
 * Get proactive guest list for an event
 */
export async function getProactiveGuestList(eventId: string) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return { error: "Authentication required" };
    }

    // Check if user owns the event
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event || event.createdBy !== user.id) {
      return { error: "Event not found or access denied" };
    }

    // Get proactive guest list for this event (mock DB compatibility)
    const all = await db.query.proactiveGuestList.findMany();
    const guestList = all
      .filter((g) => g.eventId === eventId)
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

    return { success: true, guestList };
  } catch (error) {
    console.error("Failed to fetch proactive guest list:", error);
    return { error: "Failed to fetch proactive guest list" };
  }
}

/**
 * Check if an email is on the proactive guest list for an event
 */
export async function checkProactiveGuestStatus(
  params: CheckProactiveGuestParams
) {
  try {
    const { eventId, email } = params;

    // Check if this email is on the proactive guest list for this event (mock DB compatibility)
    const all = await db.query.proactiveGuestList.findMany();
    const guestEntry = all.find(
      (g) =>
        g.eventId === eventId &&
        g.guestEmail === email.toLowerCase() &&
        g.status === "active"
    );

    if (guestEntry) {
      return {
        success: true,
        isProactiveGuest: true,
        guestTitle: guestEntry.guestTitle,
        personalMessage: guestEntry.personalMessage,
        qrCodeToken: guestEntry.qrCodeToken,
        guestName: guestEntry.guestName,
      };
    }

    return { success: true, isProactiveGuest: false };
  } catch (error) {
    console.error("Failed to check proactive guest list:", error);
    return { error: "Failed to check proactive guest list" };
  }
}

/**
 * Get guest list status for an attendee
 */
export async function getGuestListStatus(attendeeId: string) {
  try {
    // Get guest list request status (mock DB compatibility)
    const all = await db.query.guestListRequests.findMany();
    const sortedForAttendee = all
      .filter((r) => r.attendeeId === attendeeId)
      .sort(
        (a, b) =>
          new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime()
      );
    const guestRequest = sortedForAttendee[0];

    if (!guestRequest) {
      return { success: true, hasRequest: false, status: null };
    }

    return {
      success: true,
      hasRequest: true,
      status: guestRequest.status,
      requestedAt: guestRequest.requestedAt,
      reviewedAt: guestRequest.reviewedAt,
      reviewNotes: guestRequest.reviewNotes,
    };
  } catch (error) {
    console.error("Failed to get guest list status:", error);
    return { error: "Failed to get guest list status" };
  }
}
