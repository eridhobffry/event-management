type Bucket = {
  tokens: number;
  lastRefill: number; // ms timestamp
};

const buckets: Map<string, Bucket> = new Map();

export type RateLimitOptions = {
  capacity: number; // max tokens
  refillRatePerSec: number; // tokens per second
};

const DEFAULTS: RateLimitOptions = { capacity: 10, refillRatePerSec: 5 };

export function rateLimitKeyFromRequest(req: Request): string {
  const xf = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const headerIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
  const ipProp = (req as unknown as { ip?: string }).ip;
  const ip = xf || headerIp || ipProp || "unknown";
  const ua = req.headers.get("user-agent") || "";
  return `${ip}|${ua}`;
}

export function allowRequest(key: string, opts: RateLimitOptions = DEFAULTS): boolean {
  const now = Date.now();
  const b = buckets.get(key) || { tokens: opts.capacity, lastRefill: now };
  // Refill
  const elapsed = (now - b.lastRefill) / 1000;
  if (elapsed > 0) {
    const refill = elapsed * opts.refillRatePerSec;
    b.tokens = Math.min(opts.capacity, b.tokens + refill);
    b.lastRefill = now;
  }
  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets.set(key, b);
    return true;
  }
  buckets.set(key, b);
  return false;
}

