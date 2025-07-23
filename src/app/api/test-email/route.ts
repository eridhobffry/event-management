import { sendEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await sendEmail({
      to: "test@example.com", // Replace with a real email for testing
      subject: "Test Email from Event Management Hub",
      html: "<h1>Hello!</h1><p>This is a test email to confirm our setup is working.</p>",
    });
    return NextResponse.json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to send email." },
      { status: 500 }
    );
  }
}
