"use client";

import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function extractToken(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    // If it's a full URL, read token param
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const url = new URL(s);
      const t = url.searchParams.get("token");
      return t || null;
    }
  } catch {}
  // UUID v4-ish check (lenient)
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/;
  const match = s.match(uuidRegex);
  if (match) return match[0];
  return null;
}

export default function CheckInClient() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; ticketId: string; checkedIn: boolean; checkedInAt: string | null }
    | { ok: false; error?: string }
    | null
  >(null);

  const token = useMemo(() => extractToken(input), [input]);

  const handleSubmit = useCallback(async () => {
    setResult(null);
    const t = token;
    if (!t) {
      setResult({ ok: false, error: "No token found. Paste token or QR link with ?token=..." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/check-in?token=${encodeURIComponent(t)}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setResult({ ok: false, error: data?.error || `Request failed (${res.status})` });
      } else {
        setResult(data);
      }
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">Check-in Scanner</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Paste a QR link or token. We will toggle check-in for the matching ticket.
      </p>

      <Card className="p-4 space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">QR link or token</label>
          <Input
            placeholder="Paste token or https://your.app/api/tickets/check-in?token=..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {token ? (
              <span>
                Detected token:
                <span className="ml-1 font-mono text-foreground/80">{token}</span>
              </span>
            ) : (
              <span>Awaiting token...</span>
            )}
          </div>
          <Button onClick={handleSubmit} disabled={!token || loading}>
            {loading ? "Checking..." : "Check in / Undo"}
          </Button>
        </div>
        <Separator />
        <div className="min-h-[56px]">
          {result && result.ok && (
            <div className="space-y-2">
              <div className="text-sm">
                Ticket <span className="font-mono">{result.ticketId}</span>
              </div>
              <Badge variant={result.checkedIn ? "default" : "secondary"}>
                {result.checkedIn ? "Checked in" : "Issued"}
              </Badge>
              <div className="text-xs text-muted-foreground">
                {result.checkedInAt ? `Time: ${new Date(result.checkedInAt).toLocaleString()}` : "Not checked in"}
              </div>
            </div>
          )}
          {result && !result.ok && (
            <div className="text-sm text-red-600">
              {result.error || "Not found"}
            </div>
          )}
        </div>
      </Card>

      <div className="text-sm text-muted-foreground mt-4">
        Tip: if camera scanning is needed, we can add it later. For now, copy/paste from a QR scanner app.
      </div>
    </div>
  );
}
