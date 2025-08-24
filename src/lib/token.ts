export type TokenKind = "ticket" | "guest" | "unknown";

// Accepts raw QR content which may be a full URL, a prefixed token (TKT_/GST_), or a bare UUID
export function extractUnifiedToken(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Helper validators
  const isUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v
    );
  const isPrefixedToken = (v: string) =>
    /^(?:TKT|GST)_[A-Za-z0-9_-]+$/.test(v);

  const tryExtractFromUrl = (url: URL): string | null => {
    // Check common param names first
    const paramNames = ["token", "qr", "code", "t"];
    for (const name of paramNames) {
      const t = url.searchParams.get(name);
      if (t && (isUuid(t) || isPrefixedToken(t))) return t;
    }
    // Fallback: last path segment may be the token
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && (isUuid(last) || isPrefixedToken(last))) return last;
    return null;
  };

  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const url = new URL(s);
      const t = tryExtractFromUrl(url);
      if (t) return t;
      return null;
    }
  } catch {
    // fall through to non-URL checks
  }

  if (isPrefixedToken(s) || isUuid(s)) return s;
  return null;
}

export function classifyToken(token: string): {
  kind: TokenKind;
  value: string;
} {
  if (token.startsWith("TKT_"))
    return { kind: "ticket", value: token.slice(4) };
  if (token.startsWith("GST_")) return { kind: "guest", value: token.slice(4) };
  return { kind: "unknown", value: token };
}
