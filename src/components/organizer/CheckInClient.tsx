"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [supportsBarcode, setSupportsBarcode] = useState<boolean>(false);
  const [result, setResult] = useState<
    | { ok: true; ticketId: string; checkedIn: boolean; checkedInAt: string | null }
    | { ok: false; error?: string }
    | null
  >(null);

  const token = useMemo(() => extractToken(input), [input]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Feature detection for BarcodeDetector
    setSupportsBarcode(typeof window !== "undefined" && "BarcodeDetector" in window);
    return () => {
      // Cleanup on unmount
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

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

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element missing");
      video.srcObject = stream;
      await video.play();
      setScanning(true);

      type DetectedCode = { rawValue: string };
      type BarcodeDetectorInstance = { detect: (source: CanvasImageSource) => Promise<DetectedCode[]> };
      type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorInstance;
      const BarcodeDetectorCtorRef = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
      if (!BarcodeDetectorCtorRef) throw new Error("BarcodeDetector not available");
      const detector = new BarcodeDetectorCtorRef({ formats: ["qr_code"] });
      const canvas = canvasRef.current ?? document.createElement("canvas");
      if (!canvasRef.current) canvasRef.current = canvas;
      const ctx = canvas.getContext("2d");

      const loop = async () => {
        if (!video || video.readyState < 2 || !ctx) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        canvas.width = vw;
        canvas.height = vh;
        ctx.drawImage(video, 0, 0, vw, vh);
        try {
          const barcodes = await detector.detect(canvas);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue as string;
            const t = extractToken(raw);
            if (t) {
              setInput(t);
              stopCamera();
              // Auto submit for speed
              setTimeout(() => {
                void handleSubmit();
              }, 50);
              return;
            }
          }
        } catch {
          // swallow decode errors; continue loop
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : "Camera error");
      stopCamera();
    }
  }, [handleSubmit, stopCamera]);

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
        <div className="flex items-center justify-between gap-2 flex-wrap">
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
          <Button
            variant="secondary"
            onClick={() => (scanning ? stopCamera() : startCamera())}
            disabled={!supportsBarcode}
          >
            {scanning ? "Stop Camera" : supportsBarcode ? "Scan with Camera" : "Camera not supported"}
          </Button>
        </div>
        {cameraError && (
          <div className="text-xs text-red-600">{cameraError}</div>
        )}
        {scanning && (
          <div className="relative w-full overflow-hidden rounded-md border">
            <video ref={videoRef} className="w-full h-auto" muted playsInline />
            {/* overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-emerald-500/80 rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
        )}
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
        Tip: Camera scanning uses the native BarcodeDetector. If unsupported, paste the QR link or token.
      </div>
    </div>
  );
}
