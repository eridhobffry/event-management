import { describe, expect, test } from 'vitest';
import { buildCheckoutSchema } from '@/components/checkout/checkout-schema';
import type { UITicketType } from '@/types/payments';

const tickets: UITicketType[] = [
  { id: 'standard', name: 'Standard', priceCents: 2500, currency: 'usd', available: 5 },
  { id: 'vip', name: 'VIP', priceCents: 7500, currency: 'usd', available: 2 },
];

describe('checkout schema', () => {
  test('validates happy path', () => {
    const schema = buildCheckoutSchema(tickets);
    const result = schema.safeParse({
      email: 'user@example.com',
      quantities: {
        standard: 2,
        vip: 1,
      },
    });
    expect(result.success).toBe(true);
  });

  test('fails on invalid email', () => {
    const schema = buildCheckoutSchema(tickets);
    const result = schema.safeParse({
      email: 'not-an-email',
      quantities: { standard: 1 },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const hasEmailIssue = result.error.issues.some((i) => i.path.join('.') === 'email');
      expect(hasEmailIssue).toBe(true);
    }
  });

  test('fails when no tickets selected', () => {
    const schema = buildCheckoutSchema(tickets);
    const result = schema.safeParse({
      email: 'user@example.com',
      quantities: { standard: 0, vip: 0 },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const hasGroupIssue = result.error.issues.some((i) => i.path.join('.') === 'quantities');
      expect(hasGroupIssue).toBe(true);
    }
  });

  test('fails when quantity exceeds availability', () => {
    const schema = buildCheckoutSchema(tickets);
    const result = schema.safeParse({
      email: 'user@example.com',
      quantities: { vip: 3 }, // vip available is 2
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const hasVipIssue = result.error.issues.some((i) => i.path.join('.') === 'quantities.vip');
      expect(hasVipIssue).toBe(true);
    }
  });
});
