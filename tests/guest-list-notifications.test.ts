import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  sendGuestListRequestNotification,
  sendGuestListApprovalNotification,
  sendGuestListRejectionNotification,
  sendProactiveGuestListNotification,
} from "@/lib/guest-list-notifications";

// Mock email sending
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

// Mock QR code generation
vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockqrcode"),
  },
}));

const { sendEmail } = await import("@/lib/email");

describe("Guest List Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendEmail).mockResolvedValue({ messageId: "test-message-id" });
  });

  describe("sendGuestListRequestNotification", () => {
    it("should send organizer notification with correct content", async () => {
      const data = {
        organizerEmail: "organizer@test.com",
        eventName: "Test Event",
        eventId: "event123",
        requesterName: "John Doe",
        requesterEmail: "john@test.com",
        reason: "I'm a VIP customer",
        requestId: "request123",
      };

      await sendGuestListRequestNotification(data);

      expect(sendEmail).toHaveBeenCalledOnce();
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0];

      expect(emailCall.to).toBe("organizer@test.com");
      expect(emailCall.subject).toBe("🙋‍♂️ Guest List Request: Test Event");
      expect(emailCall.html).toContain("John Doe");
      expect(emailCall.html).toContain("john@test.com");
      expect(emailCall.html).toContain("I'm a VIP customer");
      expect(emailCall.html).toContain("Test Event");
    });

    it("should include dashboard link in email", async () => {
      const data = {
        organizerEmail: "organizer@test.com",
        eventName: "Test Event",
        eventId: "event123",
        requesterName: "John Doe",
        requesterEmail: "john@test.com",
        reason: "Test reason",
        requestId: "request123",
      };

      await sendGuestListRequestNotification(data);

      const emailCall = vi.mocked(sendEmail).mock.calls[0][0];
      expect(emailCall.html).toContain("/dashboard/guest-list");
    });
  });

  describe("sendGuestListApprovalNotification", () => {
    it("should send approval notification with QR code", async () => {
      const data = {
        requesterEmail: "john@test.com",
        requesterName: "John Doe",
        eventName: "Test Event",
        eventId: "event123",
        eventDate: new Date("2025-12-01"),
        qrCodeToken: "qr-token-123",
        reviewNotes: "Welcome to VIP!",
      };

      await sendGuestListApprovalNotification(data);

      expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0];

      expect(emailCall.to).toBe("john@test.com");
      expect(emailCall.subject).toBe("🎉 You're on the guest list: Test Event");
      expect(emailCall.html).toContain("John Doe");
      expect(emailCall.html).toContain("VIP Guest List Confirmed");
      expect(emailCall.html).toContain("Welcome to VIP!");
      expect(emailCall.html).toContain("data:image/png;base64,mockqrcode");
    });

    it("should format event date correctly", async () => {
      const data = {
        requesterEmail: "john@test.com",
        requesterName: "John Doe",
        eventName: "Test Event",
        eventId: "event123",
        eventDate: new Date("2025-12-01"),
        qrCodeToken: "qr-token-123",
      };

      await sendGuestListApprovalNotification(data);

      const emailCall = vi.mocked(sendEmail).mock.calls[0][0];
      expect(emailCall.html).toContain("Monday, December 1, 2025");
    });

    it("should handle missing review notes gracefully", async () => {
      const data = {
        requesterEmail: "john@test.com",
        requesterName: "John Doe",
        eventName: "Test Event",
        eventId: "event123",
        eventDate: new Date("2025-12-01"),
        qrCodeToken: "qr-token-123",
      };

      await sendGuestListApprovalNotification(data);

      expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
      // Should not throw error and email should be sent
    });
  });

  describe("sendGuestListRejectionNotification", () => {
    it("should send rejection notification with alternatives", async () => {
      const data = {
        requesterEmail: "john@test.com",
        requesterName: "John Doe",
        eventName: "Test Event",
        eventId: "event123",
        reviewNotes: "Sorry, guest list is full",
      };

      await sendGuestListRejectionNotification(data);

      expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0];

      expect(emailCall.to).toBe("john@test.com");
      expect(emailCall.subject).toBe("Guest List Request Update: Test Event");
      expect(emailCall.html).toContain("John Doe");
      expect(emailCall.html).toContain("Sorry, guest list is full");
      expect(emailCall.html).toContain("Purchase a regular ticket");
      expect(emailCall.html).toContain("free RSVP");
    });

    it("should include event link", async () => {
      const data = {
        requesterEmail: "john@test.com",
        requesterName: "John Doe",
        eventName: "Test Event",
        eventId: "event123",
      };

      await sendGuestListRejectionNotification(data);

      const emailCall = vi.mocked(sendEmail).mock.calls[0][0];
      expect(emailCall.html).toContain("/events/event123");
    });
  });

  describe("sendProactiveGuestListNotification", () => {
    it("should send added notification for new proactive guest", async () => {
      const data = {
        type: "added" as const,
        guestEmail: "vip@test.com",
        guestName: "VIP Guest",
        eventName: "Test Event",
        eventId: "event123",
        eventDate: new Date("2025-12-01"),
        guestTitle: "Speaker",
        personalMessage: "Welcome, our keynote speaker!",
        qrCodeToken: "qr-token-vip",
      };

      await sendProactiveGuestListNotification(data);

      expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0];

      expect(emailCall.to).toBe("vip@test.com");
      expect(emailCall.subject).toBe(
        "🎉 You're on the VIP Guest List: Test Event"
      );
      expect(emailCall.html).toContain("VIP Guest");
      expect(emailCall.html).toContain("Speaker");
      expect(emailCall.html).toContain("Welcome, our keynote speaker!");
      expect(emailCall.html).toContain("data:image/png;base64,mockqrcode");
    });

    it("should send updated notification", async () => {
      const data = {
        type: "updated" as const,
        guestEmail: "vip@test.com",
        guestName: "VIP Guest Updated",
        eventName: "Test Event",
        eventId: "event123",
        eventDate: new Date("2025-12-01"),
        guestTitle: "Keynote Speaker",
        qrCodeToken: "qr-token-vip",
      };

      await sendProactiveGuestListNotification(data);

      expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0];

      expect(emailCall.to).toBe("vip@test.com");
      expect(emailCall.subject).toBe(
        "Updated: VIP Guest List Details - Test Event"
      );
      expect(emailCall.html).toContain("VIP Guest Updated");
      expect(emailCall.html).toContain("Keynote Speaker");
    });

    it("should send removed notification", async () => {
      const data = {
        type: "removed" as const,
        guestEmail: "vip@test.com",
        guestName: "VIP Guest",
        eventName: "Test Event",
        eventId: "event123",
        eventDate: new Date("2025-12-01"),
      };

      await sendProactiveGuestListNotification(data);

      expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0];

      expect(emailCall.to).toBe("vip@test.com");
      expect(emailCall.subject).toBe("Guest List Update - Test Event");
      expect(emailCall.html).toContain("VIP guest list access");
      expect(emailCall.html).toContain("has been removed");
    });

    it("should send archived notification", async () => {
      const data = {
        type: "archived" as const,
        guestEmail: "vip@test.com",
        guestName: "VIP Guest",
        eventName: "Test Event",
        eventId: "event123",
        eventDate: new Date("2025-12-01"),
      };

      await sendProactiveGuestListNotification(data);

      expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0];

      expect(emailCall.to).toBe("vip@test.com");
      expect(emailCall.subject).toBe("Guest List Status Update - Test Event");
      expect(emailCall.html).toContain("has been archived");
      expect(emailCall.html).toContain("temporarily suspended");
    });

    it("should handle unsupported notification type", async () => {
      const data = {
        type: "invalid" as any,
        guestEmail: "vip@test.com",
        guestName: "VIP Guest",
        eventName: "Test Event",
        eventId: "event123",
        eventDate: new Date("2025-12-01"),
      };

      await expect(sendProactiveGuestListNotification(data)).rejects.toThrow(
        "Unknown notification type: invalid"
      );
    });
  });

  describe("QR Code Generation", () => {
    it("should handle QR code generation errors gracefully", async () => {
      // Mock console.error to suppress error output in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock QR code generation failure
      const qrcode = await import("qrcode");
      vi.mocked(qrcode.default.toDataURL).mockRejectedValueOnce(
        new Error("QR generation failed")
      );

      const data = {
        requesterEmail: "john@test.com",
        requesterName: "John Doe",
        eventName: "Test Event",
        eventId: "event123",
        eventDate: new Date("2025-12-01"),
        qrCodeToken: "qr-token-123",
      };

      await sendGuestListApprovalNotification(data);

      expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0];

      // Should include fallback SVG placeholder
      expect(emailCall.html).toContain("data:image/svg+xml;base64");
      
      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith("Failed to generate QR code:", expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe("Email Error Handling", () => {
    it("should propagate email sending errors", async () => {
      vi.mocked(sendEmail).mockRejectedValueOnce(
        new Error("Email service unavailable")
      );

      const data = {
        organizerEmail: "organizer@test.com",
        eventName: "Test Event",
        eventId: "event123",
        requesterName: "John Doe",
        requesterEmail: "john@test.com",
        reason: "Test reason",
        requestId: "request123",
      };

      await expect(sendGuestListRequestNotification(data)).rejects.toThrow(
        "Email service unavailable"
      );
    });
  });
});
