## Event Platforms Feature Benchmark (Eventbrite × Rausgegangen) — Clone Guide A–Z

This document distills a comprehensive feature set to clone/adapt for a Germany-focused event platform. Each section lists: Must-haves (MVP+), Differentiators, and AI+ ideas. Sources referenced at the end.

### A. Account, Org, Roles

- Must-have: Organizer profiles, org workspaces, team roles and permissions (admin, marketer, door, finance). Protect Super Admin.
- Differentiator: Delegated organizer access for venue partners; per-event granular permissions.
- AI+: Risk scoring for new organizers (fraud heuristics) and guidance to complete profiles.

### B. Event Creation & Management

- Must-have: Draft/live/past/canceled states; recurring events; private/unlisted events; event images/video; custom questions; order confirmation custom message; collections and series.
- Differentiator: One-click template library per category (concert, workshop, conference); collection pages (series and tours) similar to “Collections”.
- AI+: “AI event creation” assistant to generate title, description, schedule, images, tags, SEO and German translation. [Eventbrite AI tools]

### C. Ticketing & Registration

- Must-have: Ticket classes (free/paid/donation), capacities, sales windows, early-bird, group/bundle, access codes, secret tickets, waitlists.
- Differentiator: Seat maps with reserved seating; timed-entry slots for crowd control; add-ons/merch. [Eventbrite Features]
- AI+: Dynamic pricing guardrails; low-inventory urgency tuning per cohort.

### D. Checkout & Payments (DE-first)

- Must-have: Embedded checkout; saved attendee info; promo codes; refunds policy config; invoice where applicable.
- DE payments: SEPA Direct Debit, giropay, Sofort/Klarna Pay Now, PayPal, cards, Apple/Google Pay; optional invoice purchase; at‑door via SumUp/Zettle.
- Differentiator: One-tap checkout + wallet passes; Tap to Pay on mobile (NFC) for at-the-door. [Eventbrite Tap to Pay]
- AI+: Abandoned checkout nudges with incentives simulation.

### E. Discovery & Marketplace

- Must-have: City feeds, categories, tags, search, follow organizers and venues; map view; trending, today/tomorrow/this week.
- Differentiator: Editorial “Picks of the Day” and lotteries/free ticket campaigns (Rausgegangen style); community pages for venues/festivals/artists. [Rausgegangen “Zentrale”]
- AI+: Personalization ranking using embeddings + collaborative signals; multilingual support (German, English).

### F. Promotion & Growth

- Must-have: Email campaigns, promo codes; publish to Facebook/Instagram/TikTok; tracking links/pixels; UTM and affiliate links.
- Differentiator: On-platform Ads placements (homepage/search/related) and smart audiences; collections landing pages. [Eventbrite Ads, Smart Audiences]
- AI+: Copy generator for posts/ads, auto budget allocation; lookalike audiences from attendees.

### G. On-site & Entry

- Must-have: Organizer app for mobile check-in with QR; offline mode; real-time sales and attendance dashboards; at-the-door sales. [Organizer Check-in App]
- Differentiator: Seat map scanning, re-entry control, access zones; box office via SumUp/Zettle POS; badge printing integration.
- AI+: Predicted ingress spikes; staff scheduling suggestions.

### H. Virtual & Hybrid

- Must-have: Online Event Page (digital links) with Zoom/YouTube/Vimeo embeds; file modules; timed display; ticket-class gated content. [Online Event Page]
- Differentiator: Session management and calendars; livestream chat gating; replay ticketing.
- AI+: Auto video chaptering, highlights, and post-event summary mail.

### I. Reporting & Insights

- Must-have: Ticket sales by type/time/source; conversion funnel; attendee demographics; exports; tracking pixels/links.
- Differentiator: Cross-event analytics; cohort retention; CAC/LTV per channel; heatmaps for seat/timeslot utilization.
- AI+: Forecast attendance/no-show; price elasticity; email subject A/B suggestions.

### J. Payouts & Finance

- Must-have: Scheduled/instant payouts (where permitted); transparent fee calculator; taxes; invoices; pre-event payouts for trusted organizers. [Eventbrite Pricing]
- Differentiator: Split payouts to partners/artists; escrow rules; donation receipts for nonprofits.
- AI+: Fraud detection for chargebacks/resale; anomalies in refund rates.

### K. Integrations & API

- Must-have: REST API + webhooks: events, tickets, orders, attendees, orgs; OAuth2; rate limits; embed checkout. [Eventbrite API]
- Differentiator: App marketplace; plug-ins for Zoom, YouTube, Meta, TikTok, Mailchimp/Sendgrid, GA4; badge printers.
- AI+: RAG over organizer help center; conversational API explorer.

### L. Support & Trust

- Must-have: Help center; email support; T&S and moderation; accessibility (WCAG 2.2 AA).
- Differentiator: 24/7 chat for paid events; editorial listing checks (content quality, anti-hate) like Rausgegangen.
- AI+: Safety classifier for event listings, image moderation; scam prevention.

### M. Community & Engagement

- Must-have: Follow organizers/venues; favorites (hearts); wishlists; reviews (optional).
- Differentiator: Lotteries/giveaways (“WIN” blocks), city newsletters, secret concerts.
- AI+: Social graph suggestions; micro-influencer program matching.

### N. Mobile Apps & PWA

- Must-have: PWA with offline cache for scanning; install prompts; native share; wallet passes.
- Differentiator: Organizer and attendee dedicated apps; “Rausweis-like” subscription models.
- AI+: On-device recommendations; context-aware suggestions based on location/time.

### O. Localization for Germany

- German UI/communications; EU VAT and invoicing; SEPA mandates; local holidays; WhatsApp share; German address/phone formats.

---

## MVP Priorities (fastest wins)

- Event CRUD, ticket classes, embedded checkout, Germany payment methods (SEPA, giropay, Sofort/Klarna, PayPal, cards, Apple/Google Pay), email confirmations, QR check-in mobile web, basic insights, promo codes, tracking links.
- Marketplace feeds with personalization basics; organizer email tool (limit daily sends initially) and Meta/TikTok share buttons.

## Next-level Differentiators (Phase 2)

- Reserved seating + timeslots; on-platform Ads; waitlists; community pages; lotteries; collections; instant payouts (risk-gated); app marketplace.

## AI+ Roadmap (see AI_ENHANCEMENTS.md)

- AI event setup; smart audiences and budget routing; forecasting; dynamic pricing guardrails; conversational search; RAG help center.

---

## References

- Eventbrite Features: https://www.eventbrite.com/l/all-features/
- Eventbrite Organizer Overview: https://www.eventbrite.com/organizer/overview/
- Eventbrite Pricing: https://www.eventbrite.com/organizer/pricing/
- Organizer Check‑in App: https://www.eventbrite.com/organizer/features/organizer-check-in-app/
- Online Event Page (Digital Links): https://www.eventbrite.com/platform/docs/online-event-page
- Eventbrite API Docs: https://www.eventbrite.com/platform/api
- Rausgegangen Zentrale Features: https://zentrale.rausgegangen.de/features
- Rausgegangen “Zentrale” Landing: https://zentrale.events/
- Rausgegangen blog/app UX: https://rausgegangen.de/blog/neue-app-das-hat-sich-geaendert/
- Example event pages/lotteries: https://rausgegangen.de/en/events/ratzeputz-international-comedy-show-0/
- Ticketing fees update: https://rausgegangen.de/en/blog/new-ticketing-fees-2025/
