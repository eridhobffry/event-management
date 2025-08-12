import { z } from "zod";

export const eventFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().optional(),
  date: z.date({
    message: "A date is required.",
  }),
  location: z.string().optional(),
  expectations: z.string().optional(),
});

export type EventFormInput = z.infer<typeof eventFormSchema>;
