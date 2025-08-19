import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return NextResponse.json(
      { error: "Stripe publishable key not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({ publishableKey, mode: "test" });
}
