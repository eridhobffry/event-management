import { sendEmail } from "@/lib/email";

export async function GET() {
  try {
    console.log("🧪 Testing email functionality...");

    const result = await sendEmail({
      to: "eridhobffry@yahoo.com", // Your verified email
      subject: "Test Email from Event Management",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🧪 Test Email</h2>
          <p>This is a test email to verify that email sending is working correctly.</p>
          <p>If you receive this, the email integration is functioning properly!</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    return Response.json({
      success: true,
      message: "Test email sent successfully!",
      result,
    });
  } catch (error) {
    console.error("❌ Test email failed:", error);

    return Response.json(
      {
        success: false,
        message: "Test email failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
