import { notFound } from "next/navigation";
import Link from "next/link";
import { getPurchaseSuccessData } from "@/actions/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XCircle, RotateCcw, ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PurchaseFailurePage({ params, searchParams }: Props) {
  const { id: eventId } = await params;
  const sp = (searchParams ? await searchParams : undefined) || {};
  const orderId = Array.isArray(sp.order_id)
    ? sp.order_id[0]
    : (sp.order_id as string | undefined) ?? null;

  // Fetch from centralized action (single source of truth)
  const data = await getPurchaseSuccessData(eventId, orderId);
  if (!data) notFound();
  const { event, order } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex flex-col">
      <header className="backdrop-blur-xl bg-black/20 border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Payment issue</h1>
              <p className="text-zinc-400 mt-1">{event.name}</p>
            </div>
            <Badge variant="outline" className="text-red-400 border-red-400/30">Action needed</Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">We couldn’t complete your payment</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-300 space-y-3">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="w-5 h-5" />
                <span>Your payment was declined or canceled.</span>
              </div>
              {order && (
                <div className="text-sm text-zinc-400">
                  <div>Order ID: <span className="text-zinc-200">{order.id}</span></div>
                  <div>Status: <span className="capitalize text-zinc-200">{order.status}</span></div>
                </div>
              )}
              <p className="text-sm text-zinc-400">
                You can return to checkout to try a different payment method.
              </p>
              <div className="flex gap-3 pt-2">
                <Link href={`/events/${eventId}/purchase`}>
                  <span className="inline-flex items-center px-4 py-2 rounded bg-black text-white border border-white/10">
                    <RotateCcw className="w-4 h-4 mr-2" /> Try again
                  </span>
                </Link>
                <Link href={`/events/${eventId}`}>
                  <span className="inline-flex items-center px-4 py-2 rounded border border-white/10 text-zinc-200">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to event
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-300 text-sm space-y-2">
              <p>Try a different card or payment method like PayPal or Klarna if available.</p>
              <p>Ensure your billing details are correct and try again.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
