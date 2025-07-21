import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Event Management Hub
          </h1>
          <p className="text-lg text-muted-foreground">
            Modern event management platform with seamless registration,
            check-in, and analytics
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>🎟️ Events</CardTitle>
              <CardDescription>Create and manage your events</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/events">View Events</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>👥 Attendees</CardTitle>
              <CardDescription>
                Manage registrations and check-ins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/attendees">View Attendees</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📊 Analytics</CardTitle>
              <CardDescription>View event performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/analytics">View Analytics</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold mb-6">Authentication Test</h2>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild>
              <Link href="/handler/sign-in">Sign In</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/handler/sign-up">Sign Up</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/handler/account-settings">Account Settings</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
