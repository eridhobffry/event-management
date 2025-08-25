import { z } from 'zod';
import type { UITicketType } from '@/types/payments';

export type CheckoutFormValues = {
  email: string;
  quantities: Record<string, number>;
};

// Build a Zod schema that enforces a valid email and per-ticket quantity limits,
// and requires at least one ticket to be selected.
export function buildCheckoutSchema(ticketTypes: UITicketType[]) {
  const availability = Object.fromEntries(ticketTypes.map((tt) => [tt.id, tt.available]));

  const schema = z.object({
    email: z.string().email(),
    quantities: z.record(z.string(), z.coerce.number().int().min(0)).default({}),
  });

  return schema.superRefine((data, ctx) => {
    const values = data.quantities || {};
    const hasAny = Object.values(values).some((v) => typeof v === 'number' && v > 0);
    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one ticket.',
        path: ['quantities'],
      });
    }
    for (const [id, qty] of Object.entries(values)) {
      const max = availability[id] ?? 0;
      if (qty > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Maximum ${max} available`,
          path: ['quantities', id],
        });
      }
    }
  });
}
