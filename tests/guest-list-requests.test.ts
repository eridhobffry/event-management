import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  guestListRequests,
  proactiveGuestList,
  events,
  attendees,
  users,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  createGuestListRequest,
  respondToGuestListRequest,
  getGuestListRequests,
  checkProactiveGuestStatus,
  createProactiveGuest,
  updateProactiveGuest,
  deleteProactiveGuest,
} from "@/actions/guest-list";

// Mock Stack Auth
vi.mock("@/stack", () => ({
  stackServerApp: {
    getUser: vi.fn(),
  },
}));

// Mock email sending
vi.mock("@/lib/guest-list-notifications", () => ({
  sendGuestListRequestNotification: vi.fn(),
  sendGuestListApprovalNotification: vi.fn(),
  sendGuestListRejectionNotification: vi.fn(),
  sendProactiveGuestListNotification: vi.fn(),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

type TestUser = { id: string; email: string; displayName?: string | null };
type StackMock = {
  stackServerApp: {
    getUser: vi.Mock<Promise<TestUser | null>, []>;
  };
};
const { stackServerApp } = (await import("@/stack")) as unknown as StackMock;

// Test data helpers
const makeMockUser = () => {
  const id = `user_${randomUUID()}`;
  return { id, email: `${id}@test.com`, displayName: "Test Organizer" };
};

const baseEvent = {
  name: "Test Event",
  description: "Test event description",
  date: new Date("2025-12-01"),
  location: "Test Location",
  isActive: true,
};

const mockAttendee = {
  name: "John Doe",
  email: "john@test.com",
  registeredAt: new Date(),
};

describe("Guest List Request System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await db.delete(guestListRequests);
      await db.delete(proactiveGuestList);
      await db.delete(attendees);
      await db.delete(events);
      await db.delete(users);
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe("createGuestListRequest", () => {
    it("should create a new guest list request successfully", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();
      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: event.id })
        .returning();

      const result = await createGuestListRequest({
        attendeeId: attendee.id,
        reason: "I'm a VIP customer",
      });

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.status).toBe("pending");

      // Verify database record
      const request = await db.query.guestListRequests.findFirst({
        where: eq(guestListRequests.attendeeId, attendee.id),
      });

      expect(request).toBeDefined();
      expect(request?.reason).toBe("I'm a VIP customer");
      expect(request?.status).toBe("pending");
    });

    it("should prevent duplicate requests", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();
      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: event.id })
        .returning();

      // Create first request
      await createGuestListRequest({
        attendeeId: attendee.id,
        reason: "First request",
      });

      // Try to create duplicate
      const result = await createGuestListRequest({
        attendeeId: attendee.id,
        reason: "Duplicate request",
      });

      expect(result.error).toBe("Guest list request already exists");
      expect(result.status).toBe("pending");
    });

    it("should handle missing attendee", async () => {
      const result = await createGuestListRequest({
        attendeeId: "00000000-0000-0000-0000-000000000001",
        reason: "Test reason",
      });

      expect(result.error).toBe("Attendee not found");
    });
  });

  describe("respondToGuestListRequest", () => {
    it("should approve a guest list request", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();
      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: event.id })
        .returning();

      const [request] = await db
        .insert(guestListRequests)
        .values({
          eventId: event.id,
          attendeeId: attendee.id,
          requesterEmail: attendee.email,
          requesterName: attendee.name,
          reason: "Test reason",
        })
        .returning();

      const result = await respondToGuestListRequest({
        requestId: request.id,
        action: "approve",
        reviewNotes: "Approved for being awesome",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("approved");

      // Verify database update
      const updatedRequest = await db.query.guestListRequests.findFirst({
        where: eq(guestListRequests.id, request.id),
      });

      expect(updatedRequest?.status).toBe("approved");
      expect(updatedRequest?.reviewNotes).toBe("Approved for being awesome");
      expect(updatedRequest?.reviewedBy).toBe(
        (await stackServerApp.getUser()).id
      );
    });

    it("should reject a guest list request", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();
      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: event.id })
        .returning();

      const [request] = await db
        .insert(guestListRequests)
        .values({
          eventId: event.id,
          attendeeId: attendee.id,
          requesterEmail: attendee.email,
          requesterName: attendee.name,
          reason: "Test reason",
        })
        .returning();

      const result = await respondToGuestListRequest({
        requestId: request.id,
        action: "reject",
        reviewNotes: "Sorry, guest list is full",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("rejected");

      // Verify database update
      const updatedRequest = await db.query.guestListRequests.findFirst({
        where: eq(guestListRequests.id, request.id),
      });

      expect(updatedRequest?.status).toBe("rejected");
      expect(updatedRequest?.reviewNotes).toBe("Sorry, guest list is full");
    });

    it("should require authentication", async () => {
      stackServerApp.getUser.mockResolvedValue(null);

      const result = await respondToGuestListRequest({
        requestId: "request123",
        action: "approve",
      });

      expect(result.error).toBe("Authentication required");
    });

    it("should verify organizer permissions", async () => {
      // Setup test data with different organizer
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const differentUser = makeMockUser();
      await db
        .insert(users)
        .values({ id: differentUser.id, email: differentUser.email });
      const [otherEvent] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: differentUser.id })
        .returning();
      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: otherEvent.id })
        .returning();

      const [request] = await db
        .insert(guestListRequests)
        .values({
          eventId: otherEvent.id,
          attendeeId: attendee.id,
          requesterEmail: attendee.email,
          requesterName: attendee.name,
        })
        .returning();

      const result = await respondToGuestListRequest({
        requestId: request.id,
        action: "approve",
      });

      expect(result.error).toBe("Not authorized to respond to this request");
    });
  });

  describe("getGuestListRequests", () => {
    it("should return requests for organizer's events", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();
      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: event.id })
        .returning();

      await db.insert(guestListRequests).values({
        eventId: event.id,
        attendeeId: attendee.id,
        requesterEmail: attendee.email,
        requesterName: attendee.name,
        reason: "Test reason",
      });

      const result = await getGuestListRequests();

      expect(result.success).toBe(true);
      expect(result.requests).toHaveLength(1);
      expect(result.requests?.[0].requesterName).toBe(mockAttendee.name);
    });

    it("should filter by event ID when provided", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();
      const [event2] = await db
        .insert(events)
        .values({ ...baseEvent, name: "Event 2", createdBy: user.id })
        .returning();

      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: event.id })
        .returning();

      const [attendee2] = await db
        .insert(attendees)
        .values({ ...mockAttendee, name: "Jane Doe", eventId: event2.id })
        .returning();

      // Create requests for both events
      await db.insert(guestListRequests).values({
        eventId: event.id,
        attendeeId: attendee.id,
        requesterEmail: attendee.email,
        requesterName: attendee.name,
      });

      await db.insert(guestListRequests).values({
        eventId: event2.id,
        attendeeId: attendee2.id,
        requesterEmail: attendee2.email,
        requesterName: attendee2.name,
      });

      const result = await getGuestListRequests(event.id);

      expect(result.success).toBe(true);
      expect(result.requests).toHaveLength(1);
      expect(result.requests?.[0].eventId).toBe(event.id);
    });
  });
});

describe("Proactive Guest List System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await db.delete(proactiveGuestList);
      await db.delete(events);
      await db.delete(users);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("createProactiveGuest", () => {
    it("should create a proactive guest successfully", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();

      const result = await createProactiveGuest({
        eventId: event.id,
        guestEmail: "vip@test.com",
        guestName: "VIP Guest",
        guestTitle: "Speaker",
        personalMessage: "Welcome, our keynote speaker!",
      });

      expect(result.success).toBe(true);
      expect(result.guest).toBeDefined();

      // Verify database record
      const guest = await db.query.proactiveGuestList.findFirst({
        where: and(
          eq(proactiveGuestList.eventId, event.id),
          eq(proactiveGuestList.guestEmail, "vip@test.com")
        ),
      });

      expect(guest).toBeDefined();
      expect(guest?.guestName).toBe("VIP Guest");
      expect(guest?.guestTitle).toBe("Speaker");
      expect(guest?.personalMessage).toBe("Welcome, our keynote speaker!");
      expect(guest?.status).toBe("active");
    });

    it("should prevent duplicate guests for same event", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();

      // Create first guest
      await createProactiveGuest({
        eventId: event.id,
        guestEmail: "vip@test.com",
        guestName: "VIP Guest",
      });

      // Try to create duplicate
      const result = await createProactiveGuest({
        eventId: event.id,
        guestEmail: "vip@test.com",
        guestName: "Another Name",
      });

      expect(result.error).toBe(
        "Guest already exists in this event's guest list"
      );
    });

    it("should verify event ownership", async () => {
      // Setup test data with different organizer
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const differentUser = makeMockUser();
      await db
        .insert(users)
        .values({ id: differentUser.id, email: differentUser.email });
      const [otherEvent] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: differentUser.id })
        .returning();

      const result = await createProactiveGuest({
        eventId: otherEvent.id,
        guestEmail: "vip@test.com",
        guestName: "VIP Guest",
      });

      expect(result.error).toBe("Event not found or access denied");
    });
  });

  describe("updateProactiveGuest", () => {
    it("should update a proactive guest successfully", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();

      const [guest] = await db
        .insert(proactiveGuestList)
        .values({
          eventId: event.id,
          guestEmail: "vip@test.com",
          guestName: "VIP Guest",
          guestTitle: "VIP",
          addedBy: user.id,
        })
        .returning();

      const result = await updateProactiveGuest({
        guestId: guest.id,
        guestName: "Updated VIP Guest",
        guestTitle: "Keynote Speaker",
        personalMessage: "Updated message",
      });

      expect(result.success).toBe(true);
      expect(result.guest?.guestName).toBe("Updated VIP Guest");
      expect(result.guest?.guestTitle).toBe("Keynote Speaker");
      expect(result.guest?.personalMessage).toBe("Updated message");

      // Verify database update
      const updatedGuest = await db.query.proactiveGuestList.findFirst({
        where: eq(proactiveGuestList.id, guest.id),
      });

      expect(updatedGuest?.guestName).toBe("Updated VIP Guest");
      expect(updatedGuest?.guestTitle).toBe("Keynote Speaker");
    });
  });

  describe("deleteProactiveGuest", () => {
    it("should archive a guest when archive=true", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();

      const [guest] = await db
        .insert(proactiveGuestList)
        .values({
          eventId: event.id,
          guestEmail: "vip@test.com",
          guestName: "VIP Guest",
          addedBy: user.id,
        })
        .returning();

      const result = await deleteProactiveGuest(guest.id, true);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Guest archived successfully");

      // Verify guest is archived
      const archivedGuest = await db.query.proactiveGuestList.findFirst({
        where: eq(proactiveGuestList.id, guest.id),
      });

      expect(archivedGuest?.status).toBe("archived");
      expect(archivedGuest?.archivedAt).toBeDefined();
    });

    it("should delete a guest when archive=false", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();

      const [guest] = await db
        .insert(proactiveGuestList)
        .values({
          eventId: event.id,
          guestEmail: "vip@test.com",
          guestName: "VIP Guest",
          addedBy: user.id,
        })
        .returning();

      const result = await deleteProactiveGuest(guest.id, false);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Guest removed successfully");

      // Verify guest is deleted
      const deletedGuest = await db.query.proactiveGuestList.findFirst({
        where: eq(proactiveGuestList.id, guest.id),
      });

      expect(deletedGuest).toBeUndefined();
    });
  });

  describe("checkProactiveGuestStatus", () => {
    it("should return true for active proactive guest", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();

      const [guest] = await db
        .insert(proactiveGuestList)
        .values({
          eventId: event.id,
          guestEmail: "vip@test.com",
          guestName: "VIP Guest",
          guestTitle: "Speaker",
          personalMessage: "Welcome!",
          addedBy: user.id,
        })
        .returning();

      const result = await checkProactiveGuestStatus({
        eventId: event.id,
        email: "vip@test.com",
      });

      expect(result.success).toBe(true);
      expect(result.isProactiveGuest).toBe(true);
      expect(result.guestTitle).toBe("Speaker");
      expect(result.personalMessage).toBe("Welcome!");
      expect(result.qrCodeToken).toBeDefined();
    });

    it("should return false for non-proactive guest", async () => {
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();
      const result = await checkProactiveGuestStatus({
        eventId: event.id,
        email: "regular@test.com",
      });

      expect(result.success).toBe(true);
      expect(result.isProactiveGuest).toBe(false);
    });

    it("should return false for archived proactive guest", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();

      await db.insert(proactiveGuestList).values({
        eventId: event.id,
        guestEmail: "archived@test.com",
        guestName: "Archived Guest",
        addedBy: user.id,
        status: "archived",
      });

      const result = await checkProactiveGuestStatus({
        eventId: event.id,
        email: "archived@test.com",
      });

      expect(result.success).toBe(true);
      expect(result.isProactiveGuest).toBe(false);
    });

    it("should be case insensitive for email", async () => {
      // Setup test data
      const user = makeMockUser();
      stackServerApp.getUser.mockResolvedValue(user);
      await db.insert(users).values({ id: user.id, email: user.email });
      const [event] = await db
        .insert(events)
        .values({ ...baseEvent, createdBy: user.id })
        .returning();

      await db.insert(proactiveGuestList).values({
        eventId: event.id,
        guestEmail: "vip@test.com",
        guestName: "VIP Guest",
        addedBy: user.id,
      });

      const result = await checkProactiveGuestStatus({
        eventId: event.id,
        email: "VIP@TEST.COM",
      });

      expect(result.success).toBe(true);
      expect(result.isProactiveGuest).toBe(true);
    });
  });
});
