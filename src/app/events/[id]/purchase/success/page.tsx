import { notFound } from "next/navigation";
import { getPurchaseSuccessData } from "@/actions/orders";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight } from "lucide-react";

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PurchaseSuccessPage({ params, searchParams }: Props) {
  const { id: eventId } = await params;
  const sp = (searchParams ? await searchParams : undefined) || {};
  const orderId = Array.isArray(sp.order_id)
    ? sp.order_id[0]
    : (sp.order_id as string | undefined) ?? null;

  // Fetch from centralized action (single source of truth)
  const data = await getPurchaseSuccessData(eventId, orderId);
  if (!data) notFound();
  const { event, order, items } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex flex-col">
      <header className="backdrop-blur-xl bg-black/20 border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Payment complete</h1>
              <p className="text-zinc-400 mt-1">{event.name}</p>
            </div>
            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
              Secure checkout
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Thank you</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-300 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span>Your payment has been submitted.</span>
              </div>
              {order && (
                <div className="text-sm text-zinc-400">
                  <div>Order ID: <span className="text-zinc-200">{order.id}</span></div>
                  <div>Status: <span className="capitalize text-zinc-200">{order.status}</span></div>
                  <div>Total: <span className="text-zinc-200">{formatMoney(order.amountTotalCents, order.currency)}</span></div>
                </div>
              )}
              {!orderId && (
                <p className="text-sm text-zinc-400">
                  You will receive an email confirmation shortly. If you closed the tab, check your inbox.
                </p>
              )}
            </CardContent>
          </Card>

          {items && items.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Tickets</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-300 space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="text-sm">{it.name ?? 'Ticket'} × {it.quantity}</div>
                    <div className="text-sm text-zinc-400">{formatMoney(it.unitPriceCents * it.quantity, order!.currency)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">What happens next?</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-300 space-y-3">
              <p className="text-sm">
                We are issuing your tickets. This may take a moment. You will receive them via email when ready.
              </p>
              <div className="flex gap-3">
                <Link href={`/events/${eventId}`}>
                  <span className="inline-flex items-center px-4 py-2 rounded border border-white/10 text-zinc-200 hover:bg-white/10">
                    Back to event <ArrowRight className="w-4 h-4 ml-2" />
                  </span>
                </Link>
                <Link href={`/events/${eventId}/purchase`}>
                  <span className="inline-flex items-center px-4 py-2 rounded bg-black text-white border border-white/10">
                    Go to checkout
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
