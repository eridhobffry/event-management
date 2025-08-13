import { expect, test } from "vitest";
import { attendeeRegisterSchema } from "@/schemas/attendees";

test("attendeeRegisterSchema validates happy path", () => {
  const data = {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    // Must be a valid UUID per schema
    eventId: "00000000-0000-0000-0000-000000000000",
    phone: "",
  };
  const parsed = attendeeRegisterSchema.safeParse(data);
  expect(parsed.success).toBe(true);
});

test("attendeeRegisterSchema fails on missing required fields", () => {
  const parsed = attendeeRegisterSchema.safeParse({});
  expect(parsed.success).toBe(false);
});
