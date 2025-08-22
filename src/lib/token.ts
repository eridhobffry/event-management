export type TokenKind = "ticket" | "guest" | "unknown";

// Accepts raw QR content which may be a full URL, a prefixed token (TKT_/GST_), or a bare UUID
export function extractUnifiedToken(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const url = new URL(s);
      const t = url.searchParams.get("token");
      if (t) return t;
    }
  } catch {}
  return s;
}

export function classifyToken(token: string): { kind: TokenKind; value: string } {
  if (token.startsWith("TKT_")) return { kind: "ticket", value: token.slice(4) };
  if (token.startsWith("GST_")) return { kind: "guest", value: token.slice(4) };
  return { kind: "unknown", value: token };
}
