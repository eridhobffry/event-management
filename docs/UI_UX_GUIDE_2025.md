## UI/UX Guide 2025+ (Event Platform)

Principles: mobile-first, speed (TTI < 2s), readability, accessibility (WCAG 2.2 AA), trust cues, delightful micro-interactions, Germany patterns (WA share, SEPA clarity, giropay/Sofort/Klarna visibility), evergreen design system.

### 1. Navigation & Information Architecture

- Two-sided navigation: Attendee app and Organizer console separated.
- Attendee: Home (personalized), Explore (city/category/date), Map, Saved (hearts), Profile.
- Organizer: Dashboard (KPIs), Events (list + states), Marketing (emails/ads), Orders & Attendees, Payouts, Settings, Team.

### 2. Event Page Layout (Attendee)

- Above the fold: Title, date/time, location, price range, primary CTA “Get Tickets”, trust badges (secure checkout, refund policy).
- Gallery: hero image/video; social proof (followers, saves).
- Details: tabs for About, Schedule, Venue map, FAQ, Refund, Organizer.
- Ticket selector: sticky drawer with ticket classes, quantity stepper, promo code input; shows fees breakdown before pay.
- Share: WhatsApp, Instagram Stories, X, Copy link; Add to Calendar; Wallet pass.

### 3. Checkout Flow

- 3 steps max: Tickets -> Details -> Pay.
- Autofill name/email; option to save; WhatsApp phone validation.
- Payment: SEPA Direct Debit, giropay, Sofort/Klarna, PayPal, Cards, Apple/Google Pay; optional invoice purchase.
- Confirmation page: QR code, wallet pass, map, “Invite friends” WA template, refund policy link; calendar add.
- Edge states: sellouts, waitlist, timeouts (visible countdown), stock indicators per class.

### 4. Organizer Dashboard

- Top cards: Gross sales, Net payouts (scheduled), Tickets sold, CTR of listings, Abandon rate, Forecast (AI).
- Sales chart with channels and ticket class breakdown; source table (tracking links, pixels).
- Tasks: Publish to IG/TikTok; Send reminders; Enable waitlist; Add add-ons.
- Event editor: form with live preview; templates per category; SEO preview; localization (Bahasa/EN).
- Attendees: search, filters, export CSV, resend tickets; check-in stats.

### 5. Check‑in App UX (Web/PWA + Native)

- Dark theme; big scan viewport; haptic feedback; offline queue with conflict resolution.
- Controls: manual search, re-scan delay, access zones, partial refunds/no-entry notes.
- Batch actions: bulk admit; at-the-door sale flow with Tap to Pay and auto ticket/email.

### 6. Discovery & Personalization

- Home feed by city/time; today/tomorrow/week rail (Rausgegangen pattern).
- Picks of the Day editorial, lotteries bar, and “Just announced” rail.
- Similar events and organizer follow prompts post-purchase.

### 7. Email & Notification UX

- Transactional: order, reminder (24h/2h), venue logistics, post-event survey.
- Marketing: digest (weekly), category alerts, organizer announce; unsubscribe and frequency controls.
- WhatsApp templates for share and reminders.

### 8. Accessibility & Internationalization

- Min 16px text; color contrast; focus rings; keyboard navigation; captions on video.
- Bahasa default; EN optional; proper date localization; Hijri and national holidays in calendars where relevant.

### 9. Design System

- Tokens: spacing 4/8 grid, typography scale, color primitives with semantics, elevation, radii.
- Components: AppShell, Card, Tabs, Drawer, Sheet, Dialog, Stepper, TicketRow, PriceBadge, QRCode, Loader, Toast/Sonner, EmptyStates, Charts.
- Motion: 150–250ms standard; reduced motion respect.

### 10. Performance & Quality

- LCP target ≤ 1.8s; CLS ≤ 0.1; TBT ≤ 150ms. Use Next.js App Router, RSC, edge caching, image optimization, partial hydration.
- Analytics events: view_item, begin_checkout, purchase, share, follow, save; consent mode and server-side tagging.

### 11. Security & Trust

- Clear fees, refund policy, support entry points; verified organizer badge; content moderation pipeline for images and text.
- Fraud checks on high-risk events; phone/email verification for organizers.

### 12. Everlasting patterns

- Simplicity: fewer steps, obvious CTAs, progressive disclosure.
- Community: follow, save, wishlist; repeat attendance flows.
- Ownership: export data, transparent fees, predictable payouts.
