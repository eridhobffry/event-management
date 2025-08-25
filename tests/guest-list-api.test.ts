import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  guestListRequests,
  proactiveGuestList,
  events,
  attendees,
  users,
} from "@/db/schema";

// Import API handlers
import { POST as createGuestListRequest } from "@/app/api/guest-list/request/route";
import { POST as respondToRequest } from "@/app/api/guest-list/respond/route";
import { GET as getRequestStatus } from "@/app/api/guest-list/status/route";
import { GET as checkProactive } from "@/app/api/guest-list/check-proactive/route";
import {
  GET as getProactiveGuests,
  POST as createProactiveGuest,
  PUT as updateProactiveGuest,
  DELETE as deleteProactiveGuest,
} from "@/app/api/guest-list/proactive/route";

// Mock Stack Auth
vi.mock("@/stack", () => ({
  stackServerApp: {
    getUser: vi.fn(),
  },
}));

// Mock email notifications
vi.mock("@/lib/guest-list-notifications", () => ({
  sendGuestListRequestNotification: vi.fn(),
  sendGuestListApprovalNotification: vi.fn(),
  sendGuestListRejectionNotification: vi.fn(),
  sendProactiveGuestListNotification: vi.fn(),
}));

const { stackServerApp } = await import("@/stack");

// Test data
const mockUser = {
  id: "user123",
  email: "organizer@test.com",
  displayName: "Test Organizer",
};

const mockEvent = {
  name: "Test Event",
  description: "Test event description",
  date: new Date("2025-12-01"),
  location: "Test Location",
  createdBy: "user123",
  isActive: true,
};

const mockAttendee = {
  name: "John Doe",
  email: "john@test.com",
  registeredAt: new Date(),
};

function createMockRequest(
  method: string,
  url: string,
  body?: any
): NextRequest {
  const request = new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return request;
}

describe("Guest List API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (stackServerApp.getUser as any).mockResolvedValue(mockUser);
  });

  afterEach(async () => {
    try {
      await db.delete(guestListRequests);
      await db.delete(proactiveGuestList);
      await db.delete(attendees);
      await db.delete(events);
      await db.delete(users);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("/api/guest-list/request", () => {
    it("should create guest list request successfully", async () => {
      // Setup test data
      await db.insert(users).values({ id: mockUser.id, email: mockUser.email });
      const [event] = await db.insert(events).values(mockEvent).returning();
      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: event.id })
        .returning();

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/guest-list/request",
        {
          attendeeId: attendee.id,
          reason: "I'm a VIP customer",
        }
      );

      const response = await createGuestListRequest(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.requestId).toBeDefined();
      expect(data.status).toBe("pending");
    });

    it("should return 400 for missing attendeeId", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/guest-list/request",
        {
          reason: "Test reason",
        }
      );

      const response = await createGuestListRequest(request);
      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent attendee", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/guest-list/request",
        {
          attendeeId: "00000000-0000-0000-0000-000000000001",
          reason: "Test reason",
        }
      );

      const response = await createGuestListRequest(request);
      expect(response.status).toBe(404);
    });

    it("should return 409 for duplicate request", async () => {
      // Setup test data
      await db.insert(users).values({ id: mockUser.id, email: mockUser.email });
      const [event] = await db.insert(events).values(mockEvent).returning();
      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: event.id })
        .returning();

      // Create existing request
      await db.insert(guestListRequests).values({
        eventId: event.id,
        attendeeId: attendee.id,
        requesterEmail: attendee.email,
        requesterName: attendee.name,
      });

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/guest-list/request",
        {
          attendeeId: attendee.id,
          reason: "Duplicate request",
        }
      );

      const response = await createGuestListRequest(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Guest list request already exists");
    });
  });

  describe("/api/guest-list/respond", () => {
    it("should approve request successfully", async () => {
      // Setup test data
      await db.insert(users).values({ id: mockUser.id, email: mockUser.email });
      const [event] = await db.insert(events).values(mockEvent).returning();
      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: event.id })
        .returning();

      const [guestRequest] = await db
        .insert(guestListRequests)
        .values({
          eventId: event.id,
          attendeeId: attendee.id,
          requesterEmail: attendee.email,
          requesterName: attendee.name,
        })
        .returning();

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/guest-list/respond",
        {
          requestId: guestRequest.id,
          action: "approve",
          reviewNotes: "Welcome to VIP!",
        }
      );

      const response = await respondToRequest(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe("approved");
    });

    it("should reject request successfully", async () => {
      // Setup test data
      await db.insert(users).values({ id: mockUser.id, email: mockUser.email });
      const [event] = await db.insert(events).values(mockEvent).returning();
      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: event.id })
        .returning();

      const [guestRequest] = await db
        .insert(guestListRequests)
        .values({
          eventId: event.id,
          attendeeId: attendee.id,
          requesterEmail: attendee.email,
          requesterName: attendee.name,
        })
        .returning();

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/guest-list/respond",
        {
          requestId: guestRequest.id,
          action: "reject",
          reviewNotes: "Sorry, guest list is full",
        }
      );

      const response = await respondToRequest(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe("rejected");
    });

    it("should require authentication", async () => {
      (stackServerApp.getUser as any).mockResolvedValue(null);

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/guest-list/respond",
        {
          requestId: "00000000-0000-0000-0000-000000000002",
          action: "approve",
        }
      );

      const response = await respondToRequest(request);
      expect(response.status).toBe(401);
    });

    it("should verify request ownership", async () => {
      // Setup test data with different organizer
      const differentUser = { ...mockUser, id: "different123" };
      await db
        .insert(users)
        .values({ id: differentUser.id, email: "other@test.com" });
      const [otherEvent] = await db
        .insert(events)
        .values({ ...mockEvent, createdBy: differentUser.id })
        .returning();
      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: otherEvent.id })
        .returning();

      const [guestRequest] = await db
        .insert(guestListRequests)
        .values({
          eventId: otherEvent.id,
          attendeeId: attendee.id,
          requesterEmail: attendee.email,
          requesterName: attendee.name,
        })
        .returning();

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/api/guest-list/respond",
        {
          requestId: guestRequest.id,
          action: "approve",
        }
      );

      const response = await respondToRequest(request);
      expect(response.status).toBe(403);
    });
  });

  describe("/api/guest-list/status", () => {
    it("should return request status", async () => {
      // Setup test data
      await db.insert(users).values({ id: mockUser.id, email: mockUser.email });
      const [event] = await db.insert(events).values(mockEvent).returning();
      const [attendee] = await db
        .insert(attendees)
        .values({ ...mockAttendee, eventId: event.id })
        .returning();

      const [guestRequest] = await db
        .insert(guestListRequests)
        .values({
          eventId: event.id,
          attendeeId: attendee.id,
          requesterEmail: attendee.email,
          requesterName: attendee.name,
          status: "approved",
        })
        .returning();

      const request = createMockRequest(
        "GET",
        `http://localhost:3000/api/guest-list/status?attendeeId=${attendee.id}`
      );

      const response = await getRequestStatus(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasRequest).toBe(true);
      expect(data.status).toBe("approved");
    });

    it("should return no request when none exists", async () => {
      const request = createMockRequest(
        "GET",
        `http://localhost:3000/api/guest-list/status?attendeeId=nonexistent`
      );

      const response = await getRequestStatus(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasRequest).toBe(false);
      expect(data.status).toBe(null);
    });

    it("should require attendeeId parameter", async () => {
      const request = createMockRequest(
        "GET",
        "http://localhost:3000/api/guest-list/status"
      );

      const response = await getRequestStatus(request);
      expect(response.status).toBe(400);
    });
  });

  describe("/api/guest-list/check-proactive", () => {
    it("should return true for proactive guest", async () => {
      // Setup test data
      await db.insert(users).values({ id: mockUser.id, email: mockUser.email });
      const [event] = await db.insert(events).values(mockEvent).returning();

      await db.insert(proactiveGuestList).values({
        eventId: event.id,
        guestEmail: "vip@test.com",
        guestName: "VIP Guest",
        guestTitle: "Speaker",
        personalMessage: "Welcome!",
        addedBy: mockUser.id,
      });

      const request = createMockRequest(
        "GET",
        `http://localhost:3000/api/guest-list/check-proactive?eventId=${event.id}&email=vip@test.com`
      );

      const response = await checkProactive(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isProactiveGuest).toBe(true);
      expect(data.guestTitle).toBe("Speaker");
      expect(data.personalMessage).toBe("Welcome!");
    });

    it("should return false for non-proactive guest", async () => {
      const [event] = await db.insert(events).values(mockEvent).returning();
      const request = createMockRequest(
        "GET",
        `http://localhost:3000/api/guest-list/check-proactive?eventId=${event.id}&email=regular@test.com`
      );

      const response = await checkProactive(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isProactiveGuest).toBe(false);
    });

    it("should require both eventId and email parameters", async () => {
      const request = createMockRequest(
        "GET",
        `http://localhost:3000/api/guest-list/check-proactive?eventId=00000000-0000-0000-0000-000000000003`
      );

      const response = await checkProactive(request);
      expect(response.status).toBe(400);
    });
  });

  describe("/api/guest-list/proactive", () => {
    describe("GET", () => {
      it("should return proactive guests for event", async () => {
        // Setup test data
        await db
          .insert(users)
          .values({ id: mockUser.id, email: mockUser.email });
        const [event] = await db.insert(events).values(mockEvent).returning();

        await db.insert(proactiveGuestList).values({
          eventId: event.id,
          guestEmail: "vip@test.com",
          guestName: "VIP Guest",
          addedBy: mockUser.id,
        });

        const request = createMockRequest(
          "GET",
          `http://localhost:3000/api/guest-list/proactive?eventId=${event.id}`
        );

        const response = await getProactiveGuests(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.guestList).toHaveLength(1);
        expect(data.guestList[0].guestName).toBe("VIP Guest");
      });
    });

    describe("POST", () => {
      it("should create proactive guest successfully", async () => {
        // Setup test data
        await db
          .insert(users)
          .values({ id: mockUser.id, email: mockUser.email });
        const [event] = await db.insert(events).values(mockEvent).returning();

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/guest-list/proactive",
          {
            eventId: event.id,
            guestEmail: "vip@test.com",
            guestName: "VIP Guest",
            guestTitle: "Speaker",
            personalMessage: "Welcome!",
          }
        );

        const response = await createProactiveGuest(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.guest.guestName).toBe("VIP Guest");
        expect(data.guest.guestTitle).toBe("Speaker");
      });

      it("should prevent duplicate guests", async () => {
        // Setup test data
        await db
          .insert(users)
          .values({ id: mockUser.id, email: mockUser.email });
        const [event] = await db.insert(events).values(mockEvent).returning();

        // Create existing guest
        await db.insert(proactiveGuestList).values({
          eventId: event.id,
          guestEmail: "vip@test.com",
          guestName: "Existing Guest",
          addedBy: mockUser.id,
        });

        const request = createMockRequest(
          "POST",
          "http://localhost:3000/api/guest-list/proactive",
          {
            eventId: event.id,
            guestEmail: "vip@test.com",
            guestName: "New Guest",
          }
        );

        const response = await createProactiveGuest(request);
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.error).toBe(
          "Guest already exists in this event's guest list"
        );
      });
    });

    describe("PUT", () => {
      it("should update proactive guest successfully", async () => {
        // Setup test data
        await db
          .insert(users)
          .values({ id: mockUser.id, email: mockUser.email });
        const [event] = await db.insert(events).values(mockEvent).returning();

        const [guest] = await db
          .insert(proactiveGuestList)
          .values({
            eventId: event.id,
            guestEmail: "vip@test.com",
            guestName: "VIP Guest",
            addedBy: mockUser.id,
          })
          .returning();

        const request = createMockRequest(
          "PUT",
          "http://localhost:3000/api/guest-list/proactive",
          {
            guestId: guest.id,
            guestName: "Updated VIP Guest",
            guestTitle: "Keynote Speaker",
          }
        );

        const response = await updateProactiveGuest(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.guest.guestName).toBe("Updated VIP Guest");
        expect(data.guest.guestTitle).toBe("Keynote Speaker");
      });
    });

    describe("DELETE", () => {
      it("should archive guest when archive=true", async () => {
        // Setup test data
        await db
          .insert(users)
          .values({ id: mockUser.id, email: mockUser.email });
        const [event] = await db.insert(events).values(mockEvent).returning();

        const [guest] = await db
          .insert(proactiveGuestList)
          .values({
            eventId: event.id,
            guestEmail: "vip@test.com",
            guestName: "VIP Guest",
            addedBy: mockUser.id,
          })
          .returning();

        const request = createMockRequest(
          "DELETE",
          `http://localhost:3000/api/guest-list/proactive?guestId=${guest.id}&archive=true`
        );

        const response = await deleteProactiveGuest(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe("Guest archived successfully");
      });

      it("should delete guest when archive=false", async () => {
        // Setup test data
        await db
          .insert(users)
          .values({ id: mockUser.id, email: mockUser.email });
        const [event] = await db.insert(events).values(mockEvent).returning();

        const [guest] = await db
          .insert(proactiveGuestList)
          .values({
            eventId: event.id,
            guestEmail: "vip@test.com",
            guestName: "VIP Guest",
            addedBy: mockUser.id,
          })
          .returning();

        const request = createMockRequest(
          "DELETE",
          `http://localhost:3000/api/guest-list/proactive?guestId=${guest.id}&archive=false`
        );

        const response = await deleteProactiveGuest(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe("Guest removed successfully");
      });
    });
  });
});
