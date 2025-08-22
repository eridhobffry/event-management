export function getBaseUrl(): string {
  // Prefer server-side APP_URL, then public NEXT_PUBLIC_APP_URL, then localhost
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

export function getEmailSender(): { name: string; email: string } {
  // Centralized sender config, with sensible defaults
  return {
    name: process.env.EMAIL_SENDER_NAME || "Event Management Hub",
    // Keep existing hardcoded email as final fallback to preserve behavior until env is set
    email:
      process.env.EMAIL_SENDER_ADDRESS || "eridhobffry@googlemail.com",
  };
}
