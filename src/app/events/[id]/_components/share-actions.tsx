"use client";

import { Button } from "@/components/ui/button";
import { useCallback } from "react";
import { Share2 } from "lucide-react";

export default function ShareActions({
  url,
  text,
}: {
  url: string;
  text?: string;
}) {
  const shareNative = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: text ?? "Event", text, url });
      } catch {}
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        // no toast here to keep component decoupled; page can wrap with toasts if needed
      } catch {}
    }
  }, [text, url]);

  const wa = `https://wa.me/?text=${encodeURIComponent(
    text ? `${text} — ${url}` : url
  )}`;
  const x = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
    url
  )}&text=${encodeURIComponent(text ?? "")}`;
  const ig = `https://www.instagram.com/?url=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={shareNative} className="bg-white/10 hover:bg-white/20">
        <Share2 className="w-4 h-4 mr-2" /> Share
      </Button>
      <a href={wa} target="_blank" rel="noreferrer">
        <Button variant="outline" className="border-white/10 text-zinc-200">
          WhatsApp
        </Button>
      </a>
      <a href={x} target="_blank" rel="noreferrer">
        <Button variant="outline" className="border-white/10 text-zinc-200">
          X
        </Button>
      </a>
      <a href={ig} target="_blank" rel="noreferrer">
        <Button variant="outline" className="border-white/10 text-zinc-200">
          Instagram
        </Button>
      </a>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
          } catch {}
        }}
        className="text-sm text-zinc-300 underline underline-offset-4"
      >
        Copy link
      </button>
    </div>
  );
}
