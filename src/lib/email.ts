import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  try {
    console.log("🔥 Attempting to send email to:", to);
    console.log(
      "🔥 Using Resend API Key:",
      process.env.RESEND_API_KEY ? "✅ Present" : "❌ Missing"
    );

    const result = await resend.emails.send({
      from: "Event Management <noreply@resend.dev>", // Use resend.dev domain for testing
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw error;
  }
};
