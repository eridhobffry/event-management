import Link from "next/link";
import { redirect } from "next/navigation";
import { stackServerApp } from "@/stack";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function OrganizerOverviewPage() {
  const user = await stackServerApp.getUser().catch(() => null);
  if (user) {
    redirect("/dashboard/events/new");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">Grow with us</h1>
          <p className="text-zinc-300 mb-8">
            Create events for free, reach more attendees, and get paid with
            transparent fees, real-time analytics, and fast QR check-in.
          </p>

          <div className="grid gap-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">
                  Why create an organizer account?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-300 text-sm space-y-2">
                <p>• Customizable event pages and seamless checkout</p>
                <p>• Reporting and analytics to see what works</p>
                <p>• Check-in app with QR scanning and offline mode</p>
                <p>• Scheduled payouts and transparent fees</p>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button
                asChild
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
              >
                <Link href="/handler/sign-up">Get started for free</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Link href="/handler/sign-in">I already have an account</Link>
              </Button>
            </div>
          </div>

          <p className="mt-10 text-xs text-zinc-500">
            Inspired by best practices for organizer onboarding
          </p>
        </div>
      </div>
    </div>
  );
}
