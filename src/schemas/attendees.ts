import { z } from "zod";

export const attendeeRegisterSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  eventId: z.string().uuid(),
});

export type AttendeeRegisterInput = z.infer<typeof attendeeRegisterSchema>;
