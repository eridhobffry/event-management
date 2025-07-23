import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ArrowLeft } from "lucide-react";

export default function EventNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex items-center justify-center">
      <div className="container mx-auto px-4">
        <Card className="max-w-md mx-auto text-center bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <CardHeader>
            <div className="mx-auto w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-indigo-400" />
            </div>
            <CardTitle className="text-xl text-white">
              Event Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-zinc-400">
              This event is either unavailable, has ended, or registration has
              closed.
            </p>
            <div className="flex flex-col space-y-3">
              <Button
                asChild
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-indigo-500/25"
              >
                <Link href="/events">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Browse Other Events
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
