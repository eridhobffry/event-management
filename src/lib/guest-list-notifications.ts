import { sendEmail } from "./email";
import { getBaseUrl } from "./config";
import { escapeHtml } from "./html";
import { z } from "zod";

export interface GuestListRequestNotification {
  organizerEmail: string;
  eventName: string;
  eventId: string;
  requesterName: string;
  requesterEmail: string;
  reason: string;
  requestId: string;
}

export interface GuestListApprovalNotification {
  requesterEmail: string;
  requesterName: string;
  eventName: string;
  eventId: string;
  eventDate: Date;
  qrCodeToken: string;
  reviewNotes?: string;
}

export interface GuestListRejectionNotification {
  requesterEmail: string;
  requesterName: string;
  eventName: string;
  eventId: string;
  reviewNotes?: string;
}

export interface ProactiveGuestListNotification {
  type: "added" | "updated" | "removed" | "archived";
  guestEmail: string;
  guestName: string;
  eventName: string;
  eventId: string;
  eventDate: Date;
  guestTitle?: string | null;
  personalMessage?: string | null;
  qrCodeToken?: string;
}

// Zod validation schemas
const RequestSchema = z.object({
  organizerEmail: z.string().email(),
  eventName: z.string().min(1),
  eventId: z.string().min(1),
  requesterName: z.string().min(1),
  requesterEmail: z.string().email(),
  reason: z.string().min(1),
  requestId: z.string().min(1),
});

const ApprovalSchema = z.object({
  requesterEmail: z.string().email(),
  requesterName: z.string().min(1),
  eventName: z.string().min(1),
  eventId: z.string().min(1),
  eventDate: z.date(),
  qrCodeToken: z.string().min(1),
  reviewNotes: z.string().optional(),
});

const RejectionSchema = z.object({
  requesterEmail: z.string().email(),
  requesterName: z.string().min(1),
  eventName: z.string().min(1),
  eventId: z.string().min(1),
  reviewNotes: z.string().optional(),
});

const ProactiveSchema = z.object({
  type: z.string(),
  guestEmail: z.string().email(),
  guestName: z.string().min(1),
  eventName: z.string().min(1),
  eventId: z.string().min(1),
  eventDate: z.date(),
  guestTitle: z.string().nullable().optional(),
  personalMessage: z.string().nullable().optional(),
  qrCodeToken: z.string().optional(),
});

/**
 * Send notification to organizer about new guest list request
 */
export async function sendGuestListRequestNotification(
  data: GuestListRequestNotification
) {
  const d = RequestSchema.parse(data);
  const baseUrl = getBaseUrl();
  const subject = `🙋‍♂️ Guest List Request: ${d.eventName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">👑 New Guest List Request</h2>
      </div>
      
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #374151;">Hi there,</p>
        
        <p style="font-size: 16px; color: #374151;">Someone has requested to be added to the guest list for your event:</p>
        
        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #667eea;">
          <h3 style="color: #667eea; margin-top: 0; font-size: 18px;">📅 ${escapeHtml(
            d.eventName
          )}</h3>
          <div style="margin: 15px 0;">
            <p style="margin: 8px 0; color: #374151;"><strong>👤 Requester:</strong> ${escapeHtml(
              d.requesterName
            )}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>✉️ Email:</strong> ${escapeHtml(
              d.requesterEmail
            )}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>📝 Reason:</strong> ${escapeHtml(
              d.reason
            )}</p>
          </div>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="${baseUrl}/dashboard/guest-list" 
             style="background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 0 10px 10px 0; font-weight: 600;">
            ✅ Review Requests
          </a>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            💡 <strong>Tip:</strong> You can review and manage all guest list requests from your organizer dashboard.
            Approved guests will receive a special QR code for VIP entry.
          </p>
        </div>
        
        <p style="color: #374151; font-size: 16px;">Best regards,<br>Event Management Team</p>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          This notification was sent because you are the organizer of ${escapeHtml(
            d.eventName
          )}
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: d.organizerEmail,
    subject,
    html,
  });
}

/**
 * Send approval notification with QR code to requester
 */
export async function sendGuestListApprovalNotification(
  data: GuestListApprovalNotification
) {
  const d = ApprovalSchema.parse(data);
  const baseUrl = getBaseUrl();
  const subject = `🎉 You're on the guest list: ${d.eventName}`;

  // Generate QR code data URL for email
  const qrCodeDataUrl = await generateQRCodeDataUrl(d.qrCodeToken);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">🎉 Welcome to the Guest List!</h2>
      </div>
      
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #374151;">Hi ${escapeHtml(
          d.requesterName
        )},</p>
        
        <p style="font-size: 16px; color: #374151;">
          Fantastic news! You've been <strong>approved</strong> for the guest list for <strong>${escapeHtml(
            d.eventName
          )}</strong>.
        </p>
        
        <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #059669; text-align: center;">
          <h3 style="color: #059669; margin-top: 0; font-size: 20px;">✅ VIP Guest List Confirmed</h3>
          <p style="margin: 10px 0; color: #374151;"><strong>Event:</strong> ${escapeHtml(
            d.eventName
          )}</p>
          <p style="margin: 10px 0; color: #374151;"><strong>Date:</strong> ${d.eventDate.toLocaleDateString(
            "en-US",
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          )}</p>
          <p style="margin: 10px 0; color: #374151;"><strong>Status:</strong> VIP Guest List Access</p>
          <p style="margin: 10px 0; color: #374151;"><strong>Entry:</strong> Free with QR code below</p>
          ${
            d.reviewNotes
              ? `<p style="margin: 15px 0; color: #059669; font-style: italic;"><strong>Note from organizer:</strong> ${escapeHtml(
                  d.reviewNotes
                )}</p>`
              : ""
          }
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <h3 style="color: #374151; margin-bottom: 20px;">🎫 Your VIP Entry QR Code</h3>
          <div style="background: white; padding: 25px; border-radius: 16px; border: 3px solid #059669; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <img src="${qrCodeDataUrl}" alt="Guest List QR Code" style="width: 200px; height: 200px; display: block;" />
            <p style="font-size: 12px; color: #6b7280; margin: 10px 0 0 0; font-weight: 600;">
              VIP Guest List Access
            </p>
          </div>
        </div>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
          <h4 style="color: #92400e; margin-top: 0;">📱 How to Use Your QR Code:</h4>
          <ul style="color: #92400e; margin: 0; padding-left: 20px;">
            <li>Save this email or take a screenshot of the QR code</li>
            <li>Show the QR code at the event entrance</li>
            <li>Skip the regular line - you're VIP! 👑</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="${baseUrl}/events/${d.eventId}" 
             style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            📅 View Event Details
          </a>
        </div>
        
        <p style="color: #374151; font-size: 16px;">
          You're all set! This QR code confirms your VIP guest list status. 
          Enjoy the event and thank you for being part of our community! 🎉
        </p>
        
        <p style="color: #374151; font-size: 16px;">See you there!</p>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          Keep this email safe - it's your VIP ticket to the event!
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: d.requesterEmail,
    subject,
    html,
  });
}

/**
 * Send rejection notification to requester
 */
export async function sendGuestListRejectionNotification(
  data: GuestListRejectionNotification
) {
  const d = RejectionSchema.parse(data);
  const baseUrl = getBaseUrl();
  const subject = `Guest List Request Update: ${d.eventName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Guest List Request Update</h2>
      </div>
      
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #374151;">Hi ${escapeHtml(
          d.requesterName
        )},</p>
        
        <p style="font-size: 16px; color: #374151;">
          Thank you for your interest in joining the guest list for <strong>${escapeHtml(
            d.eventName
          )}</strong>.
        </p>
        
        <div style="background: #fef2f2; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #dc2626;">
          <p style="color: #374151; margin: 0;">
            Unfortunately, we're unable to accommodate your guest list request at this time.
          </p>
          ${
            d.reviewNotes
              ? `<p style="margin: 15px 0 0 0; color: #dc2626; font-style: italic;"><strong>Note from organizer:</strong> ${escapeHtml(
                  d.reviewNotes
                )}</p>`
              : ""
          }
        </div>
        
        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0;">
          <h3 style="color: #374151; margin-top: 0; font-size: 18px;">💡 You still have options!</h3>
          <ul style="color: #374151; margin: 10px 0; padding-left: 20px;">
            <li>Purchase a regular ticket if available</li>
            <li>Keep your free RSVP (subject to venue capacity)</li>
            <li>Check back later - guest list spots may open up</li>
            <li>Follow us for future VIP opportunities</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="${baseUrl}/events/${d.eventId}" 
             style="background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 0 10px 10px 0; font-weight: 600;">
            📅 View Event Details
          </a>
          <a href="${baseUrl}/events" 
             style="background: #6b7280; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 0 10px 10px 0; font-weight: 600;">
            🔍 Browse Other Events
          </a>
        </div>
        
        <p style="color: #374151; font-size: 16px;">
          Thank you for your understanding, and we hope to see you at this or future events!
        </p>
        
        <p style="color: #374151; font-size: 16px;">Best regards,<br>Event Management Team</p>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          This is not a hard decline - circumstances may change and spots may open up later.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: d.requesterEmail,
    subject,
    html,
  });
}

/**
 * Send proactive guest list notifications
 */
export async function sendProactiveGuestListNotification(
  data: ProactiveGuestListNotification
) {
  const d = ProactiveSchema.parse(data);
  switch (d.type) {
    case "added":
      return sendProactiveGuestAddedEmail(d as ProactiveGuestListNotification);
    case "updated":
      return sendProactiveGuestUpdatedEmail(d as ProactiveGuestListNotification);
    case "removed":
      return sendProactiveGuestRemovedEmail(d as ProactiveGuestListNotification);
    case "archived":
      return sendProactiveGuestArchivedEmail(d as ProactiveGuestListNotification);
    default:
      throw new Error(`Unknown notification type: ${d.type}`);
  }
}

async function sendProactiveGuestAddedEmail(
  data: ProactiveGuestListNotification
) {
  const subject = `🎉 You're on the VIP Guest List: ${data.eventName}`;
  const qrCodeDataUrl = data.qrCodeToken
    ? await generateQRCodeDataUrl(data.qrCodeToken)
    : null;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%); padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">👑 Welcome to the VIP Guest List!</h2>
      </div>
      
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #374151;">Hi ${escapeHtml(data.guestName)},</p>
        
        <p style="font-size: 16px; color: #374151;">
          Great news! You've been personally added to the <strong>VIP Guest List</strong> for <strong>${escapeHtml(
            data.eventName
          )}</strong> by the event organizer.
        </p>
        
        ${
          data.guestTitle
            ? `<div style="background: #F3E8FF; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8B5CF6;">
            <h3 style="color: #7C3AED; margin-top: 0;">✨ Your VIP Status: ${escapeHtml(data.guestTitle || "")}</h3>
          </div>`
            : ""
        }
        
        <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #059669; text-align: center;">
          <h3 style="color: #059669; margin-top: 0; font-size: 20px;">🎫 VIP Guest List Access</h3>
          <p style="margin: 10px 0; color: #374151;"><strong>Event:</strong> ${escapeHtml(
            data.eventName
          )}</p>
          <p style="margin: 10px 0; color: #374151;"><strong>Date:</strong> ${data.eventDate.toLocaleDateString(
            "en-US",
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          )}</p>
          <p style="margin: 10px 0; color: #374151;"><strong>Status:</strong> VIP Guest - No Payment Required</p>
          ${
            data.personalMessage
              ? `<p style=\"margin: 15px 0; color: #059669; font-style: italic;\"><strong>Personal message:</strong> ${escapeHtml(
                  data.personalMessage || ""
                )}</p>`
              : ""
          }
        </div>
        
        ${
          qrCodeDataUrl
            ? `<div style="text-align: center; margin: 35px 0;">
            <h3 style="color: #374151; margin-bottom: 20px;">🎫 Your VIP Entry QR Code</h3>
            <div style="background: white; padding: 25px; border-radius: 16px; border: 3px solid #8B5CF6; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <img src="${qrCodeDataUrl}" alt="VIP Guest List QR Code" style="width: 200px; height: 200px; display: block;" />
              <p style="font-size: 12px; color: #6b7280; margin: 10px 0 0 0; font-weight: 600;">
                VIP Guest Access
              </p>
            </div>
          </div>`
            : ""
        }
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
          <h4 style="color: #92400e; margin-top: 0;">🌟 VIP Perks:</h4>
          <ul style="color: #92400e; margin: 0; padding-left: 20px;">
            <li>Skip the regular entry line</li>
            <li>Free admission - no payment required</li>
            <li>Priority access to all activities</li>
            <li>Special VIP treatment throughout the event</li>
          </ul>
        </div>
        
        <p style="color: #374151; font-size: 16px;">
          You're all set! No need to purchase tickets or make any payments. Simply show up with your QR code for VIP access.
        </p>
        
        <p style="color: #374151; font-size: 16px;">See you there! 🎉</p>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          You received this because you've been added to the VIP guest list for ${escapeHtml(
            data.eventName
          )}
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: data.guestEmail,
    subject,
    html,
  });
}

async function sendProactiveGuestUpdatedEmail(
  data: ProactiveGuestListNotification
) {
  const subject = `Updated: VIP Guest List Details - ${data.eventName}`;
  const qrCodeDataUrl = data.qrCodeToken
    ? await generateQRCodeDataUrl(data.qrCodeToken)
    : null;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">📝 VIP Guest List Updated</h2>
      </div>
      
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #374151;">Hi ${escapeHtml(data.guestName)},</p>
        
        <p style="font-size: 16px; color: #374151;">
          Your VIP guest list details for <strong>${escapeHtml(
            data.eventName
          )}</strong> have been updated.
        </p>
        
        ${
          data.guestTitle
            ? `<div style="background: #DBEAFE; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #3B82F6;">
            <h3 style="color: #1E40AF; margin-top: 0;">✨ Your VIP Status: ${escapeHtml(data.guestTitle || "")}</h3>
          </div>`
            : ""
        }
        
        ${
          data.personalMessage
            ? `<div style="background: #F0FDF4; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #16A34A;">
            <h4 style="color: #15803D; margin-top: 0;">💌 Updated Message:</h4>
            <p style="color: #374151; margin: 0; font-style: italic;">${escapeHtml(
              data.personalMessage || ""
            )}</p>
          </div>`
            : ""
        }
        
        ${
          qrCodeDataUrl
            ? `<div style="text-align: center; margin: 35px 0;">
            <h3 style="color: #374151; margin-bottom: 20px;">🎫 Your QR Code</h3>
            <div style="background: white; padding: 25px; border-radius: 16px; border: 3px solid #3B82F6; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <img src="${qrCodeDataUrl}" alt="VIP Guest List QR Code" style="width: 200px; height: 200px; display: block;" />
            </div>
          </div>`
            : ""
        }
        
        <p style="color: #374151; font-size: 16px;">
          Your VIP access remains active. No further action needed from you.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: data.guestEmail,
    subject,
    html,
  });
}

async function sendProactiveGuestRemovedEmail(
  data: ProactiveGuestListNotification
) {
  const subject = `Guest List Update - ${data.eventName}`;
  const baseUrl = getBaseUrl();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Guest List Update</h2>
      </div>
      
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #374151;">Hi ${escapeHtml(data.guestName)},</p>
        
        <p style="font-size: 16px; color: #374151;">
          We're writing to inform you that your VIP guest list access for <strong>${escapeHtml(
            data.eventName
          )}</strong> has been removed by the event organizer.
        </p>
        
        <div style="background: #FEF2F2; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #DC2626;">
          <p style="color: #374151; margin: 0;">
            Your guest list access is no longer active for this event.
          </p>
        </div>
        
        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0;">
          <h3 style="color: #374151; margin-top: 0; font-size: 18px;">💡 You can still attend by:</h3>
          <ul style="color: #374151; margin: 10px 0; padding-left: 20px;">
            <li>Purchasing a regular ticket if available</li>
            <li>Registering for free RSVP (subject to capacity)</li>
            <li>Contacting the organizer directly</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="${baseUrl}/events/${data.eventId}" 
             style="background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
            📅 View Event Details
          </a>
        </div>
        
        <p style="color: #374151; font-size: 16px;">
          Thank you for your understanding.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: data.guestEmail,
    subject,
    html,
  });
}

async function sendProactiveGuestArchivedEmail(
  data: ProactiveGuestListNotification
) {
  const subject = `Guest List Status Update - ${data.eventName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">📋 Guest List Status Update</h2>
      </div>
      
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #374151;">Hi ${escapeHtml(data.guestName)},</p>
        
        <p style="font-size: 16px; color: #374151;">
          Your VIP guest list status for <strong>${escapeHtml(
            data.eventName
          )}</strong> has been archived by the event organizer.
        </p>
        
        <div style="background: #FFFBEB; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #F59E0B;">
          <p style="color: #374151; margin: 0;">
            Your guest list access has been temporarily suspended but not permanently removed. 
            The organizer may reactivate it later.
          </p>
        </div>
        
        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0;">
          <h3 style="color: #374151; margin-top: 0; font-size: 18px;">💡 In the meantime, you can:</h3>
          <ul style="color: #374151; margin: 10px 0; padding-left: 20px;">
            <li>Wait for potential reactivation</li>
            <li>Purchase a regular ticket</li>
            <li>Register for free RSVP</li>
            <li>Contact the organizer for clarification</li>
          </ul>
        </div>
        
        <p style="color: #374151; font-size: 16px;">
          Thank you for your patience.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: data.guestEmail,
    subject,
    html,
  });
}

/**
 * Generate QR code as data URL for email embedding
 */
async function generateQRCodeDataUrl(token: string): Promise<string> {
  try {
    const QRCode = await import("qrcode");
    const qrcode = QRCode.default || QRCode;

    // Create QR code data URL
    const dataUrl = await qrcode.toDataURL(token, {
      width: 200,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return dataUrl;
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    // Return a placeholder if QR generation fails
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZmlsbD0iIzZiNzI4MCI+UVIgQ29kZTwvdGV4dD48L3N2Zz4=";
  }
}
