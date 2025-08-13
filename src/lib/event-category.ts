import type { Event } from "@/types/db";

/**
 * Infer a human-friendly category from an event's name/description.
 * This is a lightweight heuristic for discovery filtering without
 * requiring a schema change.
 */
export function inferEventCategory(
  event: Pick<Event, "name" | "description">
): string {
  const source = `${event.name} ${event.description ?? ""}`.toLowerCase();

  const tests: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /(conference|summit|congress|expo)\b/, label: "Conference" },
    {
      pattern: /(workshop|bootcamp|training|masterclass)\b/,
      label: "Workshop",
    },
    { pattern: /(meetup|meet-up|user\s*group)\b/, label: "Meetup" },
    { pattern: /(festival|fest|fair|carnival)\b/, label: "Festival" },
    { pattern: /(concert|live\s*music|gig)\b/, label: "Concert" },
    { pattern: /(webinar|livestream|online\s*event)\b/, label: "Webinar" },
    { pattern: /(hackathon|coding\s*challenge)\b/, label: "Hackathon" },
    { pattern: /(pitch|demo\s*day|startup\s*night)\b/, label: "Startup" },
    {
      pattern: /(tasting|degustation|wine\s*tasting|beer\s*tasting)\b/,
      label: "Tasting",
    },
    { pattern: /(exhibition|expo|show)\b/, label: "Exhibition" },
    { pattern: /(networking|mixer|social)\b/, label: "Networking" },
  ];

  for (const { pattern, label } of tests) {
    if (pattern.test(source)) return label;
  }

  return "Other";
}

export function listCategories(
  events: Array<Pick<Event, "name" | "description">>
): string[] {
  const set = new Set<string>();
  for (const ev of events) set.add(inferEventCategory(ev));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
