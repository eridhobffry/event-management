import type { Event, NewEvent } from "@/types/db";
export type { Event, NewEvent };

// For dynamic "What to Expect" content (Step 2-C)
export interface EventExpectation {
  id: string;
  text: string;
  icon?: string;
}

// Note: Attendee registration input is defined in `@/schemas/attendees`.
